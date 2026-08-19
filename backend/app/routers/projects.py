from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..models import Project
from ..scheduling import scheduling_engine
from .. import schemas

router = APIRouter(prefix="/projects", tags=["projects"])


async def _get_project_or_404(project_id: int, db: AsyncSession) -> Project:
    result = await db.execute(
        select(Project)
        .options(selectinload(Project.tasks), selectinload(Project.dependencies), selectinload(Project.answers))
        .where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=404, detail="Proje bulunamadı.")
    return project


@router.post("", response_model=schemas.ProjectRead, status_code=201)
async def create_project(payload: schemas.ProjectCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(Project).where(Project.code == payload.code))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=400, detail=f"'{payload.code}' kodlu proje zaten mevcut.")

    project = Project(**payload.model_dump())
    db.add(project)
    await db.flush()
    await db.refresh(project)
    return project


@router.get("", response_model=List[schemas.ProjectRead])
async def list_projects(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).order_by(Project.id))
    return result.scalars().all()


@router.get("/{project_id}", response_model=schemas.ProjectDetail)
async def get_project(project_id: int, db: AsyncSession = Depends(get_db)):
    return await _get_project_or_404(project_id, db)


@router.patch("/{project_id}", response_model=schemas.ProjectRead)
async def update_project(project_id: int, payload: schemas.ProjectUpdate, db: AsyncSession = Depends(get_db)):
    project = await _get_project_or_404(project_id, db)
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(project, field, value)
    await db.flush()
    await db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=204)
async def delete_project(project_id: int, db: AsyncSession = Depends(get_db)):
    project = await _get_project_or_404(project_id, db)
    await db.delete(project)
    return None


@router.post("/{project_id}/schedule", response_model=schemas.ProjectDetail)
async def schedule_project(project_id: int, db: AsyncSession = Depends(get_db)):
    """Recalculates start/end dates for all tasks using the dependency graph and company calendar."""
    project = await _get_project_or_404(project_id, db)
    if project.start_date is None:
        raise HTTPException(status_code=400, detail="Tarih hesaplaması için projenin başlangıç tarihi gerekli.")

    try:
        scheduling_engine.calculate_dates(
            project.start_date,
            project.tasks,
            project.dependencies,
            exclude_bridge_days=project.exclude_bridge_days,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    await db.flush()
    await db.refresh(project)
    return project


@router.post("/{project_id}/finalize", response_model=schemas.FinalizeResult)
async def finalize_project(project_id: int, db: AsyncSession = Depends(get_db)):
    """Publishes the plan as Final. Blocked while any task is missing a start/end date."""
    project = await _get_project_or_404(project_id, db)

    missing = [t.id for t in project.tasks if t.start_date is None or t.end_date is None]
    if missing:
        raise HTTPException(
            status_code=400,
            detail={
                "message": f"Planınızda henüz tarih atanmamış {len(missing)} task bulunuyor.",
                "missing_dates_task_ids": missing,
            },
        )

    project.status = "Final"
    await db.flush()
    return schemas.FinalizeResult(status=project.status, missing_dates_task_ids=[])
