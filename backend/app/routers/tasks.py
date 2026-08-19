from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..calendar_service import calendar_service
from ..database import get_db
from ..models import Project, Task
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


async def _check_predecessor_violation(task: Task, new_start_date, db: AsyncSession) -> Optional[str]:
    """Returns a warning message if new_start_date violates a finish-to-start predecessor, else None."""
    if new_start_date is None or not task.predecessor_links:
        return None

    predecessor_ids = [link.predecessor_id for link in task.predecessor_links]
    result = await db.execute(select(Task).where(Task.id.in_(predecessor_ids)))
    predecessors = result.scalars().all()

    for pred in predecessors:
        if pred.end_date is not None and new_start_date < pred.end_date:
            return f"Task '{task.name}', Task '{pred.name}' tamamlanmadan başlayamaz."
    return None


@router.post("/projects/{project_id}/tasks", response_model=schemas.TaskRead, status_code=201)
async def create_task(project_id: int, payload: schemas.TaskCreate, db: AsyncSession = Depends(get_db)):
    project = await _get_project_or_404(project_id, db)
    task = Task(project_id=project_id, **payload.model_dump())
    _sync_duration(task, project.exclude_bridge_days)
    db.add(task)
    await db.flush()
    await db.refresh(task)
    return task


@router.get("/projects/{project_id}/tasks", response_model=List[schemas.TaskRead])
async def list_tasks(project_id: int, db: AsyncSession = Depends(get_db)):
    await _get_project_or_404(project_id, db)
    result = await db.execute(select(Task).where(Task.project_id == project_id).order_by(Task.id))
    return result.scalars().all()


@router.patch("/tasks/{task_id}", response_model=schemas.TaskRead)
async def update_task(task_id: int, payload: schemas.TaskUpdate, db: AsyncSession = Depends(get_db)):
    task = await _get_task_or_404(task_id, db)
    updates = payload.model_dump(exclude_unset=True)

    if "start_date" in updates and updates["start_date"] is not None:
        warning = await _check_predecessor_violation(task, updates["start_date"], db)
        if warning:
            raise HTTPException(status_code=400, detail=warning)

    for field, value in updates.items():
        setattr(task, field, value)

    if {"start_date", "end_date", "is_milestone"} & updates.keys():
        project = await _get_project_or_404(task.project_id, db)
        _sync_duration(task, project.exclude_bridge_days)

    await db.flush()
    await db.refresh(task)
    return task


@router.delete("/tasks/{task_id}", status_code=204)
async def delete_task(task_id: int, db: AsyncSession = Depends(get_db)):
    task = await _get_task_or_404(task_id, db)
    await db.delete(task)
    return None
