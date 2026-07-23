"""FastAPI entry point — replaces the Express server."""
import os
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load .env from project root if it exists (local dev).
# In cloud deployment (Render), env vars come from the dashboard.
_env_path = Path(__file__).parent.parent / ".env"
if _env_path.exists():
    load_dotenv(_env_path)

from database import get_db
from routes.auth import router as auth_router
from routes.ai import router as ai_router
from routes.calendar import router as calendar_router
from routes.reviews import router as reviews_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup — init DB
    await get_db()
    print(f"[daily-review-py] DB: {os.getenv('DB_PATH', 'data/app.db')}")
    yield
    # Shutdown
    db = await get_db()
    await db.close()


app = FastAPI(title="Daily Review", version="3.0.0", lifespan=lifespan)

# CORS — local mode: restricted origins; cloud mode: open to all
_cloud_mode = bool(os.getenv("RENDER"))
if _cloud_mode:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "null",
            "capacitor://localhost",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Routes
app.include_router(auth_router)
app.include_router(ai_router)
app.include_router(calendar_router)
app.include_router(reviews_router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "3.0.0", "backend": "Python/FastAPI"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "3000"))
    host = os.getenv("HOST", "localhost")
    uvicorn.run("main:app", host=host, port=port, reload=True)
