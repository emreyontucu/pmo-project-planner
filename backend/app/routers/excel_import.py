import io
from typing import Dict, List

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..excel_import import _norm, find_task_sheet, parse_tasks_sheet
from ..models import Project, Task, TaskDependency
from ..scheduling import scheduling_engine
from .. import schemas

router = APIRouter(tags=["excel-import"])


async def _read_workbook(file: UploadFile) -> Dict[str, pd.DataFrame]:
    if not file.filename or not file.filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Sadece .xlsx/.xls dosyaları desteklenir.")
    content = await file.read()
    try:
        return pd.read_excel(io.BytesIO(content), sheet_name=None, engine="openpyxl")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Excel dosyası okunamadı: {exc}")


async def _create_tasks_and_dependencies(
    db: AsyncSession, project: Project, task_rows: List[dict], warnings: List[str]
) -> List[Task]:
    created_tasks: List[Task] = []
    for row in task_rows:
        task = Task(
            project_id=project.id,
            name=row["name"],
            description=row["description"],
            is_milestone=row["is_milestone"],
            sorumlu=row["sorumlu"],
            duration=row["duration"] if row["duration"] is not None else 1,
            start_date=row["start_date"],
            end_date=row["end_date"],
            actual_start_date=row.get("actual_start_date"),
            actual_end_date=row.get("actual_end_date"),
            phase=row.get("phase"),
            priority=row.get("priority"),
            status=row.get("status") or "Başlamadı",
        )
        db.add(task)
        created_tasks.append(task)
    await db.flush()

    name_to_task: Dict[str, Task] = {}
    for task, row in zip(created_tasks, task_rows):
        name_to_task.setdefault(_norm(row["name"]), task)

    dependencies: List[TaskDependency] = []
    for task, row in zip(created_tasks, task_rows):
        for pred_name in row["predecessor_names"]:
            pred_task = name_to_task.get(_norm(pred_name))
            if pred_task is None:
                warnings.append(f"'{task.name}' görevinin bağımlı olduğu '{pred_name}' bulunamadı; bağımlılık atlandı.")
                continue
            if pred_task.id == task.id:
                warnings.append(f"'{task.name}' kendisine bağımlı olamaz; bağımlılık atlandı.")
                continue
            candidate = TaskDependency(project_id=project.id, task_id=task.id, predecessor_id=pred_task.id)
            if scheduling_engine.has_cycle(created_tasks, [*dependencies, candidate]):
                warnings.append(f"'{task.name}' -> '{pred_name}' bağımlılığı döngü oluşturduğu için atlandı.")
                continue
            dependencies.append(candidate)
            db.add(candidate)

    await db.flush()
    return created_tasks


async def _load_project_detail(db: AsyncSession, project_id: int) -> Project:
    # populate_existing=True forces a refresh of relationships already loaded earlier in this
    # request (e.g. reimport loads project.tasks, then deletes/recreates tasks) — without it the
    # identity map can keep serving the stale collection captured by the first load.
    result = await db.execute(
        select(Project)
        .options(selectinload(Project.tasks), selectinload(Project.dependencies), selectinload(Project.answers))
        .where(Project.id == project_id)
        .execution_options(populate_existing=True)
    )
    return result.scalar_one()


@router.post("/projects/{project_id}/import", response_model=schemas.ExcelImportResult)
async def reimport_project_tasks(
    project_id: int,
    file: UploadFile = File(...),
    overwrite: bool = Query(False),
    db: AsyncSession = Depends(get_db),
):
    """Re-imports the task list onto an existing project's plan. If the project already
    has tasks, requires overwrite=true to avoid silently merging two Excel sources."""
    project = await _load_project_detail(db, project_id)

    if project.tasks and not overwrite:
        raise HTTPException(
            status_code=409,
            detail="Bu plan için daha önce görev verisi yüklenmiştir. Üzerine yazmak için overwrite=true parametresiyle tekrar deneyin.",
        )

    sheets = await _read_workbook(file)
    task_sheet_name = find_task_sheet(sheets)
    if task_sheet_name is None:
        raise HTTPException(status_code=400, detail="Excel dosyasında görev listesini içeren bir sayfa bulunmalıdır (örn. 'Görev Takip').")

    task_rows, warnings = parse_tasks_sheet(sheets[task_sheet_name], exclude_bridge_days=project.exclude_bridge_days)

    for task in list(project.tasks):
        await db.delete(task)
    await db.flush()

    await _create_tasks_and_dependencies(db, project, task_rows, warnings)

    project = await _load_project_detail(db, project.id)
    return schemas.ExcelImportResult(project=project, warnings=warnings)
