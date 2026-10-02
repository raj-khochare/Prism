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
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze_router)


@app.get("/health", tags=["Health Check"]) 
def health_check():
    return {"status": "healthy"}