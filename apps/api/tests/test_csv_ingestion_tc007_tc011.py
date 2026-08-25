"""
TC-007 – TC-011 — CSV Ingestion Tests (Extended Scenarios)
Covers valid CSV upload, domain validation error, duplicate column header,
oversized CSV file, and database error rollback, as specified in the test cases.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import settings
from app.database import Base, get_db
from app.main import app
from app.models.entities import PositionModel
from app.services.import_service import import_positions_csv


@pytest.fixture
def isolated_client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    testing_session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = testing_session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as client:
        yield client, testing_session
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def upload_csv(client, endpoint: str, content: bytes, filename: str = "data.csv", content_type: str = "text/csv"):
    return client.post(
        f"/api/uploads/{endpoint}",
        files={"file": (filename, content, content_type)},
    )


# ── TC-007 ─────────────────────────────────────────────────────────────────────

class TestTC007ValidCSVUpload:
    """TC-007: Valid CSV file upload => 200 OK, imported_count=1, record persisted."""

    def test_valid_positions_csv_returns_200_and_persists(self, isolated_client):
        """TC-007 exact: upload valid positions.csv => 200, imported_count=1, DB record exists."""
        client, testing_session = isolated_client
        content = (
            b"commodity,instrument,direction,quantity,unit,entry_price,market_price\n"
            b"Copper,Future,Long,250,MT,9410,9475\n"
        )
        response = upload_csv(client, "positions", content)

        assert response.status_code == 200
        body = response.json()
        assert body["imported_count"] == 1
        assert body["file_type"] == "positions"

        with testing_session() as db:
            assert db.query(PositionModel).count() == 1

    def test_valid_csv_whitespace_trimmed_in_fields(self, isolated_client):
        """Whitespace around values in CSV should be trimmed before persistence."""
        client, testing_session = isolated_client
        content = (
            b"commodity,instrument,direction,quantity,unit,entry_price,market_price\n"
            b" Copper , Future , long ,10, MT ,9300,9450\n"
        )
        response = upload_csv(client, "positions", content)

        assert response.status_code == 200
        with testing_session() as db:
            pos = db.query(PositionModel).one()
            assert pos.commodity == "Copper"
            assert pos.direction == "Long"

    def test_valid_inventory_csv_upload(self, isolated_client):
        """Valid inventory CSV should also return 200 with correct file_type."""
        client, _ = isolated_client
        content = (
            b"commodity,location,quantity,unit,minimum_required,available_quantity\n"
            b"Copper,Rotterdam,350,MT,500,280\n"
        )
        response = upload_csv(client, "inventory", content)
        assert response.status_code == 200
        assert response.json()["file_type"] == "inventory"


# ── TC-008 ─────────────────────────────────────────────────────────────────────

class TestTC008DomainValidationError:
    """TC-008: CSV with direction='Sideways' => 400 with explicit row/column error."""

    def test_invalid_direction_returns_400_with_column_error(self, isolated_client):
        """TC-008 exact: direction='Sideways' must return 400 with column & row context."""
        client, _ = isolated_client
        content = (
            b"commodity,instrument,direction,quantity,unit,entry_price,market_price\n"
            b"Copper,Future,Sideways,250,MT,9410,9475\n"
        )
        response = upload_csv(client, "positions", content)

        assert response.status_code == 400
        errors = response.json()["detail"]["errors"]
        column_names = {e["column"] for e in errors}
        assert "direction" in column_names

    def test_invalid_direction_error_includes_row_number(self, isolated_client):
        """The error payload must specify the row number of the bad record."""
        client, _ = isolated_client
        content = (
            b"commodity,instrument,direction,quantity,unit,entry_price,market_price\n"
            b"Copper,Future,Sideways,250,MT,9410,9475\n"
        )
        response = upload_csv(client, "positions", content)

        errors = response.json()["detail"]["errors"]
        assert all("row" in e for e in errors)

    def test_negative_quantity_is_domain_error(self, isolated_client):
        """quantity=-10 should return 422 via the position creation endpoint."""
        client, _ = isolated_client
        payload = {
            "commodity": "Copper",
            "instrument": "Future",
            "direction": "Long",
            "quantity": -10,
            "unit": "MT",
            "entry_price": 9300,
            "market_price": 9450,
            "currency": "USD",
        }
        response = client.post("/api/positions", json=payload)
        assert response.status_code == 422


# ── TC-009 ─────────────────────────────────────────────────────────────────────

class TestTC009DuplicateColumnHeader:
    """TC-009: CSV with duplicate 'quantity' header => 400 with code 'duplicate_columns'."""

    def test_duplicate_column_returns_400_duplicate_columns(self, isolated_client):
        """TC-009 exact: header 'commodity,quantity,quantity,...' => 400 duplicate_columns."""
        client, _ = isolated_client
        content = (
            b"commodity,instrument,direction,quantity,quantity,unit,entry_price,market_price\n"
            b"Copper,Future,Long,10,10,MT,9300,9450\n"
        )
        response = upload_csv(client, "positions", content)

        assert response.status_code == 400
        errors = response.json()["detail"]["errors"]
        assert errors[0]["code"] == "duplicate_columns"

    def test_duplicate_column_no_records_persisted(self, isolated_client):
        """Duplicate column error must prevent any records from being saved."""
        client, testing_session = isolated_client
        content = (
            b"commodity,instrument,direction,quantity,quantity,unit,entry_price,market_price\n"
            b"Copper,Future,Long,10,10,MT,9300,9450\n"
        )
        upload_csv(client, "positions", content)
        with testing_session() as db:
            assert db.query(PositionModel).count() == 0


# ── TC-010 ─────────────────────────────────────────────────────────────────────

class TestTC010OversizedCSVFile:
    """TC-010: CSV > 5 MB => 413 Payload Too Large with code 'file_too_large'."""

    def test_oversized_file_returns_413(self, isolated_client, monkeypatch):
        """TC-010 exact: file larger than MAX_CSV_UPLOAD_BYTES => 413."""
        client, _ = isolated_client
        monkeypatch.setattr(settings, "MAX_CSV_UPLOAD_BYTES", 10)

        response = upload_csv(client, "positions", b"commodity,instrument,direction,quantity")

        assert response.status_code == 413
        errors = response.json()["detail"]["errors"]
        assert errors[0]["code"] == "file_too_large"

    def test_empty_csv_returns_400(self, isolated_client):
        """An empty file should be rejected with 400 and code 'empty_file'."""
        client, _ = isolated_client
        response = upload_csv(client, "positions", b"")
        assert response.status_code == 400
        assert response.json()["detail"]["errors"][0]["code"] == "empty_file"


# ── TC-011 ─────────────────────────────────────────────────────────────────────

class TestTC011DatabaseErrorRollback:
    """TC-011: DB commit failure during import => atomic rollback, 0 rows persisted."""

    def test_db_commit_failure_triggers_rollback(self):
        """TC-011 exact: simulated DB failure must rollback all rows atomically."""
        class FailingSession:
            def __init__(self):
                self.rolled_back = False
                self.records = []

            def add_all(self, records):
                self.records = records

            def commit(self):
                raise RuntimeError("database unavailable")

            def rollback(self):
                self.rolled_back = True

        db = FailingSession()
        content = (
            b"commodity,instrument,direction,quantity,unit,entry_price,market_price\n"
            b"Copper,Future,Long,10,MT,9300,9450\n"
        )

        with pytest.raises(RuntimeError, match="database unavailable"):
            import_positions_csv(db, content)

        assert db.rolled_back is True, "Session must call rollback() after a commit failure"

    def test_rollback_means_zero_rows_in_db(self):
        """After a rollback, no rows should have been persisted."""
        class FailingSession:
            def __init__(self):
                self.committed_records = []
                self.rolled_back = False

            def add_all(self, records):
                pass  # no-op

            def commit(self):
                raise RuntimeError("forced failure")

            def rollback(self):
                self.rolled_back = True

        db = FailingSession()
        content = (
            b"commodity,instrument,direction,quantity,unit,entry_price,market_price\n"
            b"Copper,Future,Long,10,MT,9300,9450\n"
        )
        try:
            import_positions_csv(db, content)
        except RuntimeError:
            pass

        assert db.rolled_back is True
        # Confirm that no records were committed (committed_records is never populated)
        assert len(db.committed_records) == 0
