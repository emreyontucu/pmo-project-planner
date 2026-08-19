from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..models import Project, ProjectAnswer, Task
from ..questionnaire import ANSWER_CHOICES, EXTRA_QUESTIONS
from .. import schemas

router = APIRouter(prefix="/projects/{project_id}/questions", tags=["questions"])


async def _get_project_or_404(project_id: int, db: AsyncSession) -> Project:
    result = await db.execute(
        select(Project)
        .options(selectinload(Project.tasks), selectinload(Project.answers))
        .where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=404, detail="Proje bulunamadı.")
    return project


def _description_gap_key(task: Task) -> str:
    return f"task:{task.id}:description"


@router.get("", response_model=List[schemas.PendingQuestion])
async def get_pending_questions(project_id: int, db: AsyncSession = Depends(get_db)):
    """Rule-based (no LLM) chatbot question list: never re-asks data already present,
    only surfaces required fields left blank + project-type questions the Excel has no column for."""
    project = await _get_project_or_404(project_id, db)

    pending: List[schemas.PendingQuestion] = []
    for task in project.tasks:
        if not task.description:
            pending.append(schemas.PendingQuestion(
                type="field_gap",
                key=_description_gap_key(task),
                text=f"'{task.name}' için açıklama nedir?",
            ))

    answered_keys = {a.question_key for a in project.answers}
    for q in EXTRA_QUESTIONS:
        if q["key"] not in answered_keys:
            pending.append(schemas.PendingQuestion(
                type="extra_question",
                key=q["key"],
                text=q["text"],
                choices=sorted(ANSWER_CHOICES),
            ))

    return pending


@router.post("/answer", response_model=schemas.PendingQuestion)
async def submit_answer(project_id: int, payload: schemas.QuestionAnswerSubmit, db: AsyncSession = Depends(get_db)):
    project = await _get_project_or_404(project_id, db)
    value = payload.value.strip()
    if not value:
        raise HTTPException(status_code=400, detail="Cevap boş olamaz.")

    if payload.key.startswith("task:") and payload.key.endswith(":description"):
        try:
            task_id = int(payload.key.split(":")[1])
        except (IndexError, ValueError):
            raise HTTPException(status_code=400, detail="Geçersiz soru anahtarı.")

        task = next((t for t in project.tasks if t.id == task_id), None)
        if task is None:
            raise HTTPException(status_code=404, detail="Bu projeye ait böyle bir task bulunamadı.")

        task.description = value
        await db.flush()
        return schemas.PendingQuestion(type="field_gap", key=payload.key, text=f"'{task.name}' için açıklama nedir?")

    question = next((q for q in EXTRA_QUESTIONS if q["key"] == payload.key), None)
    if question is None:
        raise HTTPException(status_code=404, detail="Bilinmeyen soru anahtarı.")
    if value not in ANSWER_CHOICES:
        raise HTTPException(status_code=400, detail=f"Cevap şunlardan biri olmalıdır: {', '.join(sorted(ANSWER_CHOICES))}.")

    existing = next((a for a in project.answers if a.question_key == payload.key), None)
    if existing is not None:
        existing.answer = value
    else:
        db.add(ProjectAnswer(project_id=project.id, question_key=payload.key, answer=value))
    await db.flush()

    return schemas.PendingQuestion(type="extra_question", key=question["key"], text=question["text"], choices=sorted(ANSWER_CHOICES))
