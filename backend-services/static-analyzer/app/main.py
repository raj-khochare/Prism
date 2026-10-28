import os

from fastapi import FastAPI
from app.api.analyze import router as analyze_router
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(
    title="Static Analyzer API",
    description="API for analyzing static code and providing insights.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        o.strip()
        for o in os.getenv(
            "CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
        ).split(",")
        if o.strip()
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze_router)


@app.get("/health", tags=["Health Check"]) 
def health_check():
    return {"status": "healthy"}