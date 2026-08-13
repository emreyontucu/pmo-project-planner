from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from .config import settings

# Create async engine for PostgreSQL/Supabase asenkron postgre sql motorunu hazırlıyoruz
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=True,
    future=True,
)

# Async session factory veritabanı üzerinde sorgu yapmamızı ve veri ekleyip silmemizi sağlar
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# Base class for models
Base = declarative_base()

# Dependency to get db session veritabanı bağlantısını yönetir fastapi'nin kullanması için api istekleri geldiğinde
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
