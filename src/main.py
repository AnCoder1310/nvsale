from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.copilot import router as copilot_router
from src.api.routes import router
from src.config import get_settings
from src.knowledge.retrieval_service import get_retrieval_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    print(f"Starting {settings.app_name} in {settings.app_env} mode")
    try:
        # Pre-ingest knowledge base on startup
        retriever = get_retrieval_service()
        count = retriever.ingest_corpus()
        print(f"Loaded {count} chunks into Vector Store.")
    except Exception as e:
        print(f"Initial ingestion notice: {e}")
    yield
    print("Shutting down...")


app = FastAPI(
    title="AI20K Agent",
    description="AI Agent built with LangGraph",
    version="1.0.0",
    lifespan=lifespan,
)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")
app.include_router(copilot_router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok", "env": settings.app_env}
