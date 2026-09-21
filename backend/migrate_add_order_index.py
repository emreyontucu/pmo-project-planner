import asyncio
from app.database import engine
from sqlalchemy import text

STATEMENTS = [
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS order_index INTEGER NOT NULL DEFAULT 0",
]

async def main():
    async with engine.begin() as conn:
        for stmt in STATEMENTS:
            print("Running:", stmt)
            await conn.execute(text(stmt))
    print("Migration complete.")

if __name__ == "__main__":
    asyncio.run(main())
