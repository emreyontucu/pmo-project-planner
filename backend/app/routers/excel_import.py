import datetime
import io
import os
import re
from typing import Dict, List, Optional

import pandas as pd
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..audit_service import log_audit
from ..database import get_db
from ..excel_import import _norm, find_task_sheet, parse_tasks_sheet
from ..models import Project, Task, TaskDependency
from ..scheduling import scheduling_engine
from .. import schemas

router = APIRouter(tags=["excel-import"])


@router.get("/template/download")
async def download_excel_template():
    """Serves the official clean Görev Takip Excel template."""
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    template_path = os.path.join(base_dir, "..", "frontend", "public", "Gorev_Takip_Sablonu.xlsx")
    template_path = os.path.normpath(template_path)
    
    if not os.path.exists(template_path):
        raise HTTPException(status_code=404, detail="Şablon dosyası bulunamadı.")
    
    return FileResponse(
        template_path,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename="Gorev_Takip_Sablonu.xlsx",
    )


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
    for idx, row in enumerate(task_rows):
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
            order_index=idx,
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
    result = await db.execute(
        select(Project)
        .options(
            selectinload(Project.tasks),
            selectinload(Project.dependencies),
            selectinload(Project.answers),
            selectinload(Project.audit_logs),
        )
        .where(Project.id == project_id)
        .execution_options(populate_existing=True)
    )
    return result.scalar_one()


@router.post("/projects/import-new", response_model=schemas.ExcelImportResult, status_code=201)
async def import_new_project_from_excel(
    file: UploadFile = File(...),
    code: Optional[str] = Form(None),
    name: Optional[str] = Form(None),
    manager: Optional[str] = Form(None),
    start_date: Optional[str] = Form(None),
    sector: Optional[str] = Form(None),
    companies: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
):
    """Creates a brand new project and directly imports all tasks from the uploaded Excel file."""
    # 1. Parse Excel
    sheets = await _read_workbook(file)
    task_sheet_name = find_task_sheet(sheets)
    if task_sheet_name is None:
        raise HTTPException(status_code=400, detail="Excel dosyasında görev listesini içeren bir sayfa bulunmalıdır (örn. 'Görev Takip').")

    task_rows, warnings = parse_tasks_sheet(sheets[task_sheet_name], exclude_bridge_days=False)
    if not task_rows:
        raise HTTPException(status_code=400, detail="Excel dosyasında geçerli görev satırı bulunamadı.")

    # 2. Derive project code / name if missing
    clean_filename = os.path.splitext(file.filename or "Yeni_Proje")[0]
    proj_name = name.strip() if name and name.strip() else clean_filename.replace("_", " ").replace("-", " ")
    
    if not code or not code.strip():
        # Auto generate code
        res = await db.execute(select(Project.id).order_by(Project.id.desc()).limit(1))
        last_id = res.scalar() or 0
        proj_code = f"PRJ-{last_id + 1:03d}"
    else:
        proj_code = code.strip()

    # Check unique code
    existing = await db.execute(select(Project).where(Project.code == proj_code))
    if existing.scalar_one_or_none() is not None:
        proj_code = f"{proj_code}-{int(datetime.datetime.now().timestamp()) % 1000}"

    parsed_start_date = None
    if start_date and start_date.strip():
        try:
            parsed_start_date = datetime.date.fromisoformat(start_date.strip())
        except ValueError:
            pass

    # If project start date not given, take min task start date if available
    if parsed_start_date is None:
        task_starts = [t["start_date"] for t in task_rows if t.get("start_date")]
        if task_starts:
            parsed_start_date = min(task_starts)

    new_project = Project(
        code=proj_code,
        name=proj_name,
        manager=manager.strip() if manager and manager.strip() else None,
        start_date=parsed_start_date,
        business_status="Aktif",
        sector=sector.strip() if sector and sector.strip() else None,
        companies=companies.strip() if companies and companies.strip() else None,
        status="Draft",
        description=description.strip() if description and description.strip() else f"Excel içe aktarımı ile oluşturuldu ({file.filename})",
        exclude_bridge_days=False,
    )
    db.add(new_project)
    await db.flush()
    await db.refresh(new_project)

    await _create_tasks_and_dependencies(db, new_project, task_rows, warnings)

    await log_audit(
        db,
        new_project.id,
        "PROJE_OLUŞTURULDU",
        f"'{new_project.name}' ({new_project.code}) projesi '{file.filename}' Excel dosyasından {len(task_rows)} görev ile oluşturuldu.",
    )
    await db.flush()

    project = await _load_project_detail(db, new_project.id)
    return schemas.ExcelImportResult(project=project, warnings=warnings)


@router.post("/projects/{project_id}/import/preview")
async def preview_excel_import(
    project_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Parses and validates the Excel file without modifying the database, for confirmation review."""
    project = await _load_project_detail(db, project_id)
    sheets = await _read_workbook(file)
    task_sheet_name = find_task_sheet(sheets)
    if task_sheet_name is None:
        raise HTTPException(status_code=400, detail="Excel dosyasında görev listesini içeren bir sayfa bulunmalıdır (örn. 'Görev Takip').")

    task_rows, warnings = parse_tasks_sheet(sheets[task_sheet_name], exclude_bridge_days=project.exclude_bridge_days)
    
    phase_counts: Dict[str, int] = {}
    for r in task_rows:
        phase = r.get("phase") or "Atanmamış"
        phase_counts[phase] = phase_counts.get(phase, 0) + 1

    return {
        "filename": file.filename,
        "tasks_count": len(task_rows),
        "phase_counts": phase_counts,
        "warnings": warnings,
        "has_existing_tasks": len(project.tasks) > 0,
        "existing_tasks_count": len(project.tasks),
    }


@router.post("/projects/{project_id}/import", response_model=schemas.ExcelImportResult)
async def reimport_project_tasks(
    project_id: int,
    file: UploadFile = File(...),
    overwrite: bool = Query(False),
    db: AsyncSession = Depends(get_db),
):
    """Re-imports the task list onto an existing project's plan."""
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

    await log_audit(
        db,
        project.id,
        "EXCEL_YÜKLENDİ",
        f"'{file.filename}' dosyasından {len(task_rows)} görev başarıyla içe aktarıldı.",
    )
    await db.flush()

    project = await _load_project_detail(db, project.id)
    return schemas.ExcelImportResult(project=project, warnings=warnings)
