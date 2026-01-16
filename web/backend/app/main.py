"""
FastAPI Main Application Entry Point.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.api import research, sessions, agents, knowledge, skills
from app.api import auth as auth_api
from app.api import user_settings as settings_api
from app.websocket import router as ws_router
from app.db.database import init_db

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    settings = get_settings()
    logger.info(f"Starting {settings.app_name}")
    logger.info(f"Workspace: {settings.nexen_workspace}")
    
    # Initialize workspace
    settings.nexen_workspace.mkdir(parents=True, exist_ok=True)
    
    # Initialize database
    init_db()
    logger.info("Database initialized")
    
    yield
    
    logger.info("Shutting down...")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        description="NEXEN Multi-Agent Research Assistant Web API",
        version="0.2.0",
        lifespan=lifespan,
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Auth Routes (no prefix for /api/auth)
    app.include_router(auth_api.router, prefix=f"{settings.api_prefix}/auth", tags=["auth"])
    app.include_router(settings_api.router, prefix=f"{settings.api_prefix}/settings", tags=["settings"])

    # API Routes
    app.include_router(research.router, prefix=f"{settings.api_prefix}/research", tags=["research"])
    app.include_router(sessions.router, prefix=f"{settings.api_prefix}/sessions", tags=["sessions"])
    app.include_router(agents.router, prefix=f"{settings.api_prefix}/agents", tags=["agents"])
    app.include_router(knowledge.router, prefix=f"{settings.api_prefix}/knowledge", tags=["knowledge"])
    app.include_router(skills.router, prefix=f"{settings.api_prefix}/skills", tags=["skills"])

    # WebSocket
    app.include_router(ws_router)

    @app.get("/")
    async def root():
        return {
            "name": settings.app_name,
            "version": "0.2.0",
            "status": "running",
            "features": ["multi-user", "auth", "api-keys"],
        }

    @app.get("/health")
    async def health():
        return {"status": "healthy"}

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
