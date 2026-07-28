"""
Shared pytest fixtures for TradeLens AI API tests.
The isolated_client fixture is defined here once and auto-used via conftest.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app


@pytest.fixture
def isolated_client():
    """
    Provide a TestClient backed by a fresh in-memory SQLite database.
    All tables are created before the test and dropped after.
    FastAPI's get_db dependency is overridden so no real DB is touched.
    """
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    testing_session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        database = testing_session()
        try:
            yield database
        finally:
            database.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as client:
        yield client, testing_session
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture
def api_client():
    """
    Provide a TestClient using the real app (and real SQLite DB).
    Use only for smoke-test style tests that don't need isolation.
    """
    with TestClient(app) as client:
        yield client
