import asyncio
from app.database import engine, Base
from app.models import Project, Task, TaskDependency

async def main():
    async with engine.begin() as conn:
        print("Creating tables...")
        await conn.run_sync(Base.metadata.create_all)
        print("Tables created successfully.")

if __name__ == "__main__":
    asyncio.run(main())
