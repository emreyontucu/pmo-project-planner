import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from .models import ProjectAuditLog


async def log_audit(db: AsyncSession, project_id: int, action: str, details: str) -> ProjectAuditLog:
    """Logs an operational change or event to the project audit history."""
    entry = ProjectAuditLog(
        project_id=project_id,
        action=action,
        details=details,
    )
    db.add(entry)
    return entry
