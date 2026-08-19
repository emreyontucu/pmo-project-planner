from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import projects, tasks, dependencies, calendar, excel_import, questions

app = FastAPI(title=settings.PROJECT_NAME, version=settings.PROJECT_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router)
app.include_router(tasks.router)
app.include_router(dependencies.router)
app.include_router(calendar.router)
app.include_router(excel_import.router)
app.include_router(questions.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
