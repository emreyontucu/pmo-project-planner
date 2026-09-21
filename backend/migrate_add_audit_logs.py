import asyncio
from app.database import engine
from sqlalchemy import text

STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS project_audit_logs (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        action VARCHAR(100) NOT NULL,
        details TEXT NOT NULL,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    """,
    "CREATE INDEX IF NOT EXISTS ix_project_audit_logs_project_id ON project_audit_logs (project_id);",
]

async def main():
    async with engine.begin() as conn:
        for stmt in STATEMENTS:
            print("Running statement...")
            await conn.execute(text(stmt))
    print("Audit logs migration complete.")

if __name__ == "__main__":
    asyncio.run(main())
