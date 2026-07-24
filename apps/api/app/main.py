from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app.api.router import router

# Create DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="TradeLens AI API",
    version="0.1.0",
    description="Commodity Trading Decision & Risk Analytics Engine"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
