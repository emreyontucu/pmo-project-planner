import asyncio
from app.database import engine
from sqlalchemy import text

STATEMENT = "ALTER TABLE projects ADD COLUMN IF NOT EXISTS business_status VARCHAR(30)"

async def main():
    async with engine.begin() as conn:
        print("Running:", STATEMENT)
        await conn.execute(text(STATEMENT))
    print("Migration complete.")

if __name__ == "__main__":
    asyncio.run(main())
