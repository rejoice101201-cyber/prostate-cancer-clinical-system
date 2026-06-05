from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import inference, health

app = FastAPI(title="ProstateScan AI Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "*"],  # Tighten in production
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(inference.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
