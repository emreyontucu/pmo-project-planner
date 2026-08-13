import os
from dotenv import load_dotenv

# Load env variables from .env file if it exists
load_dotenv()

class Settings:
    PROJECT_NAME: str = "PMO Project Planner"
    PROJECT_VERSION: str = "1.0.0"
    
    # DATABASE_URL can be a local PostgreSQL or Supabase PostgreSQL connection string
    # Supabase connection URI format: postgresql+asyncpg://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql+asyncpg://postgres:postgres@localhost:5432/pmo_planner"
    )

settings = Settings()
