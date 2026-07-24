import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

db_url = settings.DATABASE_URL
if db_url.startswith("sqlite") and not db_url.startswith("sqlite:////"):
    # Ensure relative path sqlite directory exists
    db_path = db_url.replace("sqlite:///", "")
    os.makedirs(os.path.dirname(os.path.abspath(db_path)), exist_ok=True)

connect_args = {"check_same_thread": False} if db_url.startswith("sqlite") else {}

engine = create_engine(db_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
