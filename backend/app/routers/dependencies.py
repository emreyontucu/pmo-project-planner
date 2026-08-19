from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..models import Project, Task, TaskDependency
from ..scheduling import scheduling_engine
from .. import schemas

router = APIRouter(tags=["dependencies"])


@router.post("/projects/{project_id}/dependencies", response_model=schemas.TaskDependencyRead, status_code=201)
async def create_dependency(project_id: int, payload: schemas.TaskDependencyCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Project)
        .options(selectinload(Project.tasks), selectinload(Project.dependencies))
        .where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=404, detail="Proje bulunamadı.")

    task_ids = {t.id for t in project.tasks}
    if payload.task_id not in task_ids or payload.predecessor_id not in task_ids:
        raise HTTPException(status_code=400, detail="Task ve bağımlı olduğu task aynı projeye ait olmalıdır.")
    if payload.task_id == payload.predecessor_id:
        raise HTTPException(status_code=400, detail="Bir task kendisine bağımlı olamaz.")

    candidate = TaskDependency(
        project_id=project_id,
        task_id=payload.task_id,
        predecessor_id=payload.predecessor_id,
        dependency_type=payload.dependency_type,
    )

    if scheduling_engine.has_cycle(project.tasks, [*project.dependencies, candidate]):
        raise HTTPException(status_code=400, detail="Bu bağımlılık, görevler arasında döngüsel bir bağımlılık oluşturuyor.")

    db.add(candidate)
    await db.flush()
    await db.refresh(candidate)
    return candidate


@router.delete("/dependencies/{dependency_id}", status_code=204)
async def delete_dependency(dependency_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TaskDependency).where(TaskDependency.id == dependency_id))
    dependency = result.scalar_one_or_none()
    if dependency is None:
        raise HTTPException(status_code=404, detail="Bağımlılık bulunamadı.")
    await db.delete(dependency)
    return None
