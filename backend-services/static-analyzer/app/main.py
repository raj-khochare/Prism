from fastapi import FastAPI
from app.api.analyze import router as analyze_router

app = FastAPI(
    title="Static Analyzer API",
    description="API for analyzing static code and providing insights.",
    version="1.0.0",
)

app.include_router(analyze_router)

@app.get("/health", tags=["Health Check"]) 
def health_check():
    return {"status": "healthy"}