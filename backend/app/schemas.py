import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, ConfigDict, field_validator

from .constants import PROJECT_BUSINESS_STATUSES, TASK_PRIORITIES, TASK_STATUSES


def _validate_choice(value: Optional[str], choices: list[str], field_name: str) -> Optional[str]:
    if value is not None and value not in choices:
        raise ValueError(f"{field_name} şunlardan biri olmalıdır: {', '.join(choices)}.")
    return value


class ProjectBase(BaseModel):
    code: str
    name: str
    manager: Optional[str] = None
    start_date: Optional[datetime.date] = None
    target_end_date: Optional[datetime.date] = None
    business_status: Optional[str] = None
    sector: Optional[str] = None
    companies: Optional[str] = None
    description: Optional[str] = None
    exclude_bridge_days: bool = False

    @field_validator("business_status")
    @classmethod
    def _check_business_status(cls, v):
        return _validate_choice(v, PROJECT_BUSINESS_STATUSES, "Proje durumu")


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    manager: Optional[str] = None
    start_date: Optional[datetime.date] = None
    target_end_date: Optional[datetime.date] = None
    business_status: Optional[str] = None
    sector: Optional[str] = None
    companies: Optional[str] = None
    description: Optional[str] = None
    exclude_bridge_days: Optional[bool] = None

    @field_validator("business_status")
    @classmethod
    def _check_business_status(cls, v):
        return _validate_choice(v, PROJECT_BUSINESS_STATUSES, "Proje durumu")


class ProjectRead(ProjectBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: str
    created_at: datetime.datetime
    updated_at: datetime.datetime


class TaskBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_milestone: bool = False
    sorumlu: Optional[str] = None
    phase: Optional[str] = None
    priority: Optional[str] = None
    status: str = "Başlamadı"
    start_date: Optional[datetime.date] = None
    end_date: Optional[datetime.date] = None
    actual_start_date: Optional[datetime.date] = None
    actual_end_date: Optional[datetime.date] = None
    order_index: int = 0

    @field_validator("priority")
    @classmethod
    def _check_priority(cls, v):
        return _validate_choice(v, TASK_PRIORITIES, "Öncelik")

    @field_validator("status")
    @classmethod
    def _check_status(cls, v):
        return _validate_choice(v, TASK_STATUSES, "Durum")


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_milestone: Optional[bool] = None
    sorumlu: Optional[str] = None
    phase: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[datetime.date] = None
    end_date: Optional[datetime.date] = None
    actual_start_date: Optional[datetime.date] = None
    actual_end_date: Optional[datetime.date] = None
    order_index: Optional[int] = None

    @field_validator("priority")
    @classmethod
    def _check_priority(cls, v):
        return _validate_choice(v, TASK_PRIORITIES, "Öncelik")

    @field_validator("status")
    @classmethod
    def _check_status(cls, v):
        return _validate_choice(v, TASK_STATUSES, "Durum")


class TaskReorderRequest(BaseModel):
    task_ids: List[int]


class TaskDependencyBase(BaseModel):
    task_id: int
    predecessor_id: int
    dependency_type: str = "FS"


class TaskDependencyCreate(TaskDependencyBase):
    pass


class TaskDependencyRead(TaskDependencyBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    created_at: datetime.datetime


class TaskRead(TaskBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    duration: int
    created_at: datetime.datetime
    updated_at: datetime.datetime


class ProjectAnswerBase(BaseModel):
    question_key: str
    answer: str


class ProjectAnswerCreate(ProjectAnswerBase):
    pass


class ProjectAnswerRead(ProjectAnswerBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    created_at: datetime.datetime
    updated_at: datetime.datetime


class ProjectAuditLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    action: str
    details: str
    created_at: datetime.datetime


class ProjectDetail(ProjectRead):
    tasks: List[TaskRead] = []
    dependencies: List[TaskDependencyRead] = []
    answers: List[ProjectAnswerRead] = []
    audit_logs: List[ProjectAuditLogRead] = []


class PendingQuestion(BaseModel):
    type: str  # "field_gap" | "extra_question"
    key: str
    text: str
    choices: Optional[List[str]] = None


class QuestionAnswerSubmit(BaseModel):
    key: str
    value: str


class FinalizeResult(BaseModel):
    status: str
    missing_dates_task_ids: List[int] = []


class CalendarDay(BaseModel):
    date: str
    day_type: str
    name: str
    warning: Optional[str] = None


class ExcelImportResult(BaseModel):
    project: ProjectDetail
    warnings: List[str] = []


class WBSWizardTaskInput(BaseModel):
    name: str
    phase: str
    description: Optional[str] = None
    sorumlu: Optional[str] = None
    priority: str = "Orta"
    duration: int = 3
    is_milestone: bool = False
    start_date: Optional[datetime.date] = None
    end_date: Optional[datetime.date] = None


class WBSWizardQuestionDTO(BaseModel):
    key: str
    category: str
    question: str
    description: str
    icon_type: str
    vendor_field_label: Optional[str] = None
    current_answer: Optional[str] = None
    suggested_tasks: List[WBSWizardTaskInput]


class WBSWizardApplyRequest(BaseModel):
    answers: Dict[str, str]  # { "server_hardware_analysis": "Evet", ... }
    tasks_to_create: List[WBSWizardTaskInput]


class WBSWizardApplyResult(BaseModel):
    created_tasks_count: int
    project: ProjectDetail
