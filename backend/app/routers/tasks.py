from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..audit_service import log_audit
from ..calendar_service import calendar_service
from ..database import get_db
from ..models import Project, Task, TaskDependency
from .. import schemas

router = APIRouter(tags=["tasks"])


async def _get_project_or_404(project_id: int, db: AsyncSession) -> Project:
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=404, detail="Proje bulunamadı.")
    return project


def _sync_duration(task: Task, exclude_bridge_days: bool) -> None:
    """duration isn't user-settable — it's always derived from start_date/end_date
    (or 0 for milestones), matching how the Excel importer computes it."""
    if task.is_milestone:
        task.duration = 0
    elif task.start_date and task.end_date:
        task.duration = calendar_service.get_working_days_count(task.start_date, task.end_date, exclude_bridge_days) or 1
    else:
        task.duration = task.duration or 1


async def _get_task_or_404(task_id: int, db: AsyncSession) -> Task:
    result = await db.execute(
        select(Task).options(selectinload(Task.predecessor_links)).where(Task.id == task_id)
    )
    task = result.scalar_one_or_none()
    if task is None:
        raise HTTPException(status_code=404, detail="Task bulunamadı.")
    return task


async def _check_dependency_violation(task: Task, new_start_date, new_end_date, db: AsyncSession) -> Optional[str]:
    """Checks if the proposed schedule violates any finish-to-start constraints."""
    # 1. Check predecessor constraints
    if new_start_date is not None and task.predecessor_links:
        predecessor_ids = [link.predecessor_id for link in task.predecessor_links]
        result = await db.execute(select(Task).where(Task.id.in_(predecessor_ids)))
        predecessors = result.scalars().all()

        for pred in predecessors:
            if pred.end_date is not None and new_start_date < pred.end_date:
                return f"{task.name}, {pred.name} tamamlanmadan başlayamaz."

    # 2. Check successor constraints
    if new_end_date is not None:
        dep_result = await db.execute(select(TaskDependency).where(TaskDependency.predecessor_id == task.id))
        links = dep_result.scalars().all()
        if links:
            successor_ids = [link.task_id for link in links]
            result = await db.execute(select(Task).where(Task.id.in_(successor_ids)))
            successors = result.scalars().all()

            for succ in successors:
                if succ.start_date is not None and new_end_date > succ.start_date:
                    return f"{succ.name}, {task.name} tamamlanmadan başlayamaz."

    return None


@router.post("/projects/{project_id}/tasks", response_model=schemas.TaskRead, status_code=201)
async def create_task(project_id: int, payload: schemas.TaskCreate, db: AsyncSession = Depends(get_db)):
    project = await _get_project_or_404(project_id, db)
    task_data = payload.model_dump()
    if not task_data.get("order_index"):
        res = await db.execute(
            select(func.max(Task.order_index)).where(Task.project_id == project_id)
        )
        max_order = res.scalar() or 0
        task_data["order_index"] = max_order + 1

    task = Task(project_id=project_id, **task_data)
    _sync_duration(task, project.exclude_bridge_days)
    db.add(task)
    await db.flush()
    await db.refresh(task)
    await log_audit(db, project_id, "GÖREV_EKLENDİ", f"'{task.name}' görevi ({task.phase or 'Genel'}) eklendi.")
    return task


@router.get("/projects/{project_id}/tasks", response_model=List[schemas.TaskRead])
async def list_tasks(project_id: int, db: AsyncSession = Depends(get_db)):
    await _get_project_or_404(project_id, db)
    result = await db.execute(
        select(Task)
        .where(Task.project_id == project_id)
        .order_by(Task.order_index, Task.start_date, Task.id)
    )
    return result.scalars().all()


@router.post("/projects/{project_id}/tasks/reorder", response_model=List[schemas.TaskRead])
async def reorder_tasks(project_id: int, payload: schemas.TaskReorderRequest, db: AsyncSession = Depends(get_db)):
    await _get_project_or_404(project_id, db)
    result = await db.execute(select(Task).where(Task.project_id == project_id))
    tasks = {t.id: t for t in result.scalars().all()}
    for idx, tid in enumerate(payload.task_ids):
        if tid in tasks:
            tasks[tid].order_index = idx
    await log_audit(db, project_id, "SIRALAMA_GÜNCELLENDİ", "Görevlerin sıralama düzeni güncellendi.")
    await db.flush()
    result = await db.execute(
        select(Task)
        .where(Task.project_id == project_id)
        .order_by(Task.order_index, Task.id)
    )
    return result.scalars().all()


@router.patch("/tasks/{task_id}/cancel", response_model=schemas.TaskRead)
async def cancel_task(task_id: int, db: AsyncSession = Depends(get_db)):
    task = await _get_task_or_404(task_id, db)
    task.status = "İptal Edildi"
    await log_audit(db, task.project_id, "GÖREV_İPTAL_EDİLDİ", f"'{task.name}' görevinin durumu 'İptal Edildi' yapıldı.")
    await db.flush()
    await db.refresh(task)
    return task


@router.patch("/tasks/{task_id}", response_model=schemas.TaskRead)
async def update_task(task_id: int, payload: schemas.TaskUpdate, db: AsyncSession = Depends(get_db)):
    task = await _get_task_or_404(task_id, db)
    updates = payload.model_dump(exclude_unset=True)

    candidate_start = updates.get("start_date", task.start_date)
    candidate_end = updates.get("end_date", task.end_date)
    is_milestone = updates.get("is_milestone", task.is_milestone)
    if is_milestone:
        candidate_end = candidate_start

    if ("start_date" in updates or "end_date" in updates or "is_milestone" in updates):
        warning = await _check_dependency_violation(task, candidate_start, candidate_end, db)
        if warning:
            raise HTTPException(status_code=400, detail=warning)

    change_desc = []
    for field, value in updates.items():
        old_val = getattr(task, field, None)
        if old_val != value:
            change_desc.append(f"{field}: {old_val} -> {value}")
        setattr(task, field, value)

    if {"start_date", "end_date", "is_milestone"} & updates.keys():
        project = await _get_project_or_404(task.project_id, db)
        _sync_duration(task, project.exclude_bridge_days)

    if change_desc:
        await log_audit(db, task.project_id, "GÖREV_GÜNCELLENDİ", f"'{task.name}' güncellendi ({', '.join(change_desc)}).")

    await db.flush()
    await db.refresh(task)
    return task


@router.delete("/tasks/{task_id}", status_code=204)
async def delete_task(task_id: int, db: AsyncSession = Depends(get_db)):
    task = await _get_task_or_404(task_id, db)
    project_id = task.project_id
    task_name = task.name
    await db.delete(task)
    await log_audit(db, project_id, "GÖREV_SİLİNDİ", f"'{task_name}' görevi silindi.")
    return None
