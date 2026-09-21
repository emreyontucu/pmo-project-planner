from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..audit_service import log_audit
from ..calendar_service import calendar_service
from ..database import get_db
from ..models import Project, ProjectAnswer, Task
from ..questionnaire import WBS_QUESTIONS
from .. import schemas


router = APIRouter(prefix="/projects/{project_id}", tags=["wbs-wizard"])


async def _get_project_detail(project_id: int, db: AsyncSession) -> Project:
    result = await db.execute(
        select(Project)
        .options(
            selectinload(Project.tasks),
            selectinload(Project.dependencies),
            selectinload(Project.answers),
            selectinload(Project.audit_logs),
        )
        .where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=404, detail="Proje bulunamadı.")
    return project


@router.get("/wbs-wizard", response_model=List[schemas.WBSWizardQuestionDTO])
async def get_wbs_wizard_questions(project_id: int, db: AsyncSession = Depends(get_db)):
    """Returns the comprehensive WBS Scope questions along with suggested tasks and existing answers."""
    project = await _get_project_detail(project_id, db)
    answer_map = {a.question_key: a.answer for a in project.answers}

    dto_list: List[schemas.WBSWizardQuestionDTO] = []
    for q in WBS_QUESTIONS:
        tasks = [
            schemas.WBSWizardTaskInput(
                name=t.name,
                phase=t.phase,
                description=t.description,
                sorumlu=t.sorumlu,
                priority=t.priority,
                duration=t.duration,
                is_milestone=t.is_milestone,
                start_date=t.start_date or project.start_date,
                end_date=t.end_date,
            )
            for t in q.suggested_tasks
        ]
        dto_list.append(
            schemas.WBSWizardQuestionDTO(
                key=q.key,
                category=q.category,
                question=q.question,
                description=q.description,
                icon_type=q.icon_type,
                vendor_field_label=q.vendor_field_label,
                current_answer=answer_map.get(q.key),
                suggested_tasks=tasks,
            )
        )
    return dto_list


@router.post("/wbs-wizard/apply", response_model=schemas.WBSWizardApplyResult)
async def apply_wbs_wizard(
    project_id: int,
    payload: schemas.WBSWizardApplyRequest,
    db: AsyncSession = Depends(get_db),
):
    """Applies the project manager's answers to the WBS questionnaire and creates the confirmed tasks."""
    project = await _get_project_detail(project_id, db)

    # 1. Save / Update answers
    existing_answers = {a.question_key: a for a in project.answers}
    for q_key, answer_val in payload.answers.items():
        clean_val = str(answer_val).strip()
        if not clean_val:
            continue
        if q_key in existing_answers:
            existing_answers[q_key].answer = clean_val
        else:
            new_ans = ProjectAnswer(project_id=project.id, question_key=q_key, answer=clean_val)
            db.add(new_ans)

    # 2. Get current max order_index
    res = await db.execute(select(func.max(Task.order_index)).where(Task.project_id == project.id))
    current_max_order = res.scalar() or 0

    # Avoid duplicating task names if already exist
    existing_task_names = {t.name.strip().lower() for t in project.tasks}

    created_count = 0
    for idx, t_input in enumerate(payload.tasks_to_create):
        clean_name = t_input.name.strip()
        if clean_name.lower() in existing_task_names:
            continue  # Avoid duplicate insertion

        duration = t_input.duration
        if t_input.start_date and t_input.end_date:
            duration = calendar_service.get_working_days_count(
                t_input.start_date, t_input.end_date, project.exclude_bridge_days
            ) or 1

        new_task = Task(
            project_id=project.id,
            name=clean_name,
            phase=t_input.phase,
            description=t_input.description,
            sorumlu=t_input.sorumlu,
            priority=t_input.priority,
            duration=duration,
            is_milestone=t_input.is_milestone,
            start_date=t_input.start_date,
            end_date=t_input.end_date,
            status="Başlamadı",
            order_index=current_max_order + idx + 1,
        )
        db.add(new_task)
        existing_task_names.add(clean_name.lower())
        created_count += 1

    if created_count > 0:
        await log_audit(
            db,
            project.id,
            "WBS_SİHİRBAZI_UYGULANDI",
            f"Akıllı WBS Sihirbazı ile {created_count} yeni iş paketi ve görevi oluşturuldu.",
        )

    await db.flush()

    # Re-fetch project details
    refreshed_project = await _get_project_detail(project.id, db)
    return schemas.WBSWizardApplyResult(
        created_tasks_count=created_count,
        project=refreshed_project,
    )
