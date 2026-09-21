import asyncio
from app.database import engine
from sqlalchemy import text

STATEMENTS = [
    # projects
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS code VARCHAR(50);",
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS name VARCHAR(255);",
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS manager VARCHAR(255);",
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS start_date DATE;",
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS target_end_date DATE;",
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Draft';",
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS business_status VARCHAR(30);",
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS description TEXT;",
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS exclude_bridge_days BOOLEAN DEFAULT FALSE;",
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;",
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;",

    # tasks
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS name VARCHAR(255);",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description TEXT;",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_milestone BOOLEAN DEFAULT FALSE;",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sorumlu VARCHAR(255);",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 1;",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_date DATE;",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS end_date DATE;",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS phase VARCHAR(255);",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority VARCHAR(20);",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'Başlamadı';",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_start_date DATE;",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_end_date DATE;",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;",

    # task_dependencies
    "CREATE TABLE IF NOT EXISTS task_dependencies (id SERIAL PRIMARY KEY, project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE, task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE, predecessor_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE, dependency_type VARCHAR(10) DEFAULT 'FS', created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP);",

    # project_answers
    "CREATE TABLE IF NOT EXISTS project_answers (id SERIAL PRIMARY KEY, project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE, question_key VARCHAR(100) NOT NULL, answer VARCHAR(20) NOT NULL, created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP, CONSTRAINT uq_project_question UNIQUE (project_id, question_key));",

    # project_audit_logs
    "CREATE TABLE IF NOT EXISTS project_audit_logs (id SERIAL PRIMARY KEY, project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE, action VARCHAR(100) NOT NULL, details TEXT NOT NULL, created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP);",
]

async def main():
    async with engine.begin() as conn:
        for stmt in STATEMENTS:
            print(f"Running: {stmt[:60]}...")
            await conn.execute(text(stmt))
    print("Full DB schema sync complete.")

if __name__ == "__main__":
    asyncio.run(main())
