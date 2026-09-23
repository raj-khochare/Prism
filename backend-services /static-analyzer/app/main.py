from fastapi import FastAPI

app = FastAPI(
    title="Static Analyzer API",
    description="API for analyzing static code and providing insights.",
    version="1.0.0",
)

@app.get("/health", tags=["Health Check"]) 
def health_check():
    return {"status": "healthy"}