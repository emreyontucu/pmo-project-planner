import asyncio
from app.database import engine
from sqlalchemy import text

STATEMENTS = [
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS business_status VARCHAR(30);",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS phase VARCHAR(255);",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority VARCHAR(20);",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_start_date DATE;",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_end_date DATE;",
]

async def main():
    async with engine.begin() as conn:
        for stmt in STATEMENTS:
            print(f"Running: {stmt}")
            await conn.execute(text(stmt))
    print("Database columns sync completed.")

if __name__ == "__main__":
    asyncio.run(main())
