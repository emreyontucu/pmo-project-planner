import asyncio
from app.database import engine
from sqlalchemy import text

STATEMENTS = [
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS phase VARCHAR(255)",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority VARCHAR(20)",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'Başlamadı'",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_start_date DATE",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_end_date DATE",
]

async def main():
    async with engine.begin() as conn:
        for stmt in STATEMENTS:
            print("Running:", stmt)
            await conn.execute(text(stmt))
    print("Migration complete.")

if __name__ == "__main__":
    asyncio.run(main())
