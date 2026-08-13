import datetime
from typing import List, Optional
from sqlalchemy import ForeignKey, String, Date, Boolean, Text, Integer, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base

class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    manager: Mapped[Optional[str]] = mapped_column(String(255))
    start_date: Mapped[Optional[datetime.date]] = mapped_column(Date)
    target_end_date: Mapped[Optional[datetime.date]] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(50), default="Draft") # Draft, Final
    description: Mapped[Optional[str]] = mapped_column(Text)
    exclude_bridge_days: Mapped[bool] = mapped_column(Boolean, default=False)
    
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    tasks: Mapped[List["Task"]] = relationship("Task", back_populates="project", cascade="all, delete-orphan")
    dependencies: Mapped[List["TaskDependency"]] = relationship("TaskDependency", back_populates="project", cascade="all, delete-orphan")


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(Text)
    is_milestone: Mapped[bool] = mapped_column(Boolean, default=False)
    sorumlu: Mapped[Optional[str]] = mapped_column(String(255))
    duration: Mapped[int] = mapped_column(Integer, default=1) # in work days
    start_date: Mapped[Optional[datetime.date]] = mapped_column(Date)
    end_date: Mapped[Optional[datetime.date]] = mapped_column(Date)
    
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="tasks")
    
    # As the child/dependent task in a dependency (tasks that this task depends on)
    predecessor_links: Mapped[List["TaskDependency"]] = relationship(
        "TaskDependency",
        foreign_keys="[TaskDependency.task_id]",
        back_populates="task",
        cascade="all, delete-orphan"
    )
    # As the parent/predecessor task in a dependency (tasks that depend on this task)
    successor_links: Mapped[List["TaskDependency"]] = relationship(
        "TaskDependency",
        foreign_keys="[TaskDependency.predecessor_id]",
        back_populates="predecessor",
        cascade="all, delete-orphan"
    )


class TaskDependency(Base):
    __tablename__ = "task_dependencies"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), index=True)
    predecessor_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), index=True)
    dependency_type: Mapped[str] = mapped_column(String(10), default="FS") # FS: Finish-to-Start

    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=func.now())

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="dependencies")
    task: Mapped["Task"] = relationship("Task", foreign_keys=[task_id], back_populates="predecessor_links")
    predecessor: Mapped["Task"] = relationship("Task", foreign_keys=[predecessor_id], back_populates="successor_links")
