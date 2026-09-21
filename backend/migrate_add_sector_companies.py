import asyncio
from app.database import engine
from sqlalchemy import text

STATEMENTS = [
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS sector VARCHAR(100);",
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS companies TEXT;",
]

async def main():
    async with engine.begin() as conn:
        for stmt in STATEMENTS:
            print(f"Running: {stmt}")
            await conn.execute(text(stmt))
    print("Migration for sector and companies completed.")

if __name__ == "__main__":
    asyncio.run(main())
