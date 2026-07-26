import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import settings
from app.database import Base, get_db
from app.main import app
from app.models.entities import InventoryModel, PositionModel, ShipmentModel
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


def upload(client, endpoint: str, content: bytes, filename: str = "data.csv", content_type: str = "text/csv"):
    return client.post(
        f"/api/uploads/{endpoint}",
        files={"file": (filename, content, content_type)},
    )


@pytest.mark.parametrize(
    ("endpoint", "content", "model"),
    [
        (
            "positions",
            b"commodity,instrument,direction,quantity,unit,entry_price,market_price\n Copper , Future , long ,10, MT ,9300,9450\n",
            PositionModel,
        ),
        (
            "inventory",
            b"commodity,location,quantity,unit,minimum_required,available_quantity\nCopper,Rotterdam,100,MT,50,80\n",
            InventoryModel,
        ),
        (
            "shipments",
            b"commodity,origin,destination,quantity,expected_arrival,status,delay_days\nCopper,Chile,Singapore,100,2026-08-15,In Transit,0\n",
            ShipmentModel,
        ),
    ],
)
def test_valid_imports_return_consistent_response_and_persist(
    isolated_client, endpoint, content, model
):
    client, testing_session = isolated_client

    response = upload(client, endpoint, content)

    assert response.status_code == 200
    assert response.json() == {
        "message": "Import completed",
        "imported_count": 1,
        "file_type": endpoint,
    }
    with testing_session() as database:
        assert database.query(model).count() == 1
        if endpoint == "positions":
            position = database.query(PositionModel).one()
            assert position.commodity == "Copper"
            assert position.direction == "Long"


def test_multiple_errors_are_returned_without_partial_persistence(isolated_client):
    client, testing_session = isolated_client
    content = (
        b"commodity,instrument,direction,quantity,unit,entry_price,market_price\n"
        b"Copper,Future,Long,10,MT,9300,9450\n"
        b"Copper,Future,Sideways,-5,MT,invalid,0\n"
    )

    response = upload(client, "positions", content)

    assert response.status_code == 400
    errors = response.json()["detail"]["errors"]
    assert {error["column"] for error in errors} == {
        "direction",
        "quantity",
        "entry_price",
        "market_price",
    }
    assert all(error["row"] == 3 for error in errors)
    with testing_session() as database:
        assert database.query(PositionModel).count() == 0


@pytest.mark.parametrize(
    ("endpoint", "content", "expected_codes"),
    [
        (
            "positions",
            b"commodity,instrument,direction,quantity,unit,entry_price,market_price\nCopper,Future,Flat,-1,MT,nope,0\n",
            {"invalid_choice", "not_positive", "invalid_number"},
        ),
        (
            "inventory",
            b"commodity,location,quantity,unit,minimum_required,available_quantity\nCopper,Rotterdam,10,MT,-1,11\n",
            {"negative_value", "exceeds_quantity"},
        ),
        (
            "shipments",
            b"commodity,origin,destination,quantity,expected_arrival,status,delay_days\nCopper,Chile,Singapore,0,2026-02-30,Delayed,-2\n",
            {"not_positive", "invalid_date", "invalid_integer"},
        ),
    ],
)
def test_domain_validation_rules(isolated_client, endpoint, content, expected_codes):
    client, _ = isolated_client

    response = upload(client, endpoint, content)

    assert response.status_code == 400
    codes = {error["code"] for error in response.json()["detail"]["errors"]}
    assert expected_codes <= codes


@pytest.mark.parametrize(
    ("content", "expected_code"),
    [
        (
            b"commodity,instrument,direction,quantity,unit,entry_price\nCopper,Future,Long,10,MT,9300\n",
            "missing_columns",
        ),
        (
            b"commodity,instrument,direction,quantity,quantity,unit,entry_price,market_price\nCopper,Future,Long,10,10,MT,9300,9450\n",
            "duplicate_columns",
        ),
    ],
)
def test_missing_and_duplicate_columns(isolated_client, content, expected_code):
    client, _ = isolated_client

    response = upload(client, "positions", content)

    assert response.status_code == 400
    assert response.json()["detail"]["errors"][0]["code"] == expected_code


def test_empty_upload_is_rejected(isolated_client):
    client, _ = isolated_client

    response = upload(client, "positions", b"")

    assert response.status_code == 400
    assert response.json()["detail"]["errors"][0]["code"] == "empty_file"


def test_non_csv_upload_is_rejected(isolated_client):
    client, _ = isolated_client

    response = upload(client, "positions", b"not a csv", "data.txt", "text/plain")

    assert response.status_code == 400
    assert response.json()["detail"]["errors"][0]["code"] == "invalid_file_type"


def test_oversized_upload_is_rejected(isolated_client, monkeypatch):
    client, _ = isolated_client
    monkeypatch.setattr(settings, "MAX_CSV_UPLOAD_BYTES", 10)

    response = upload(client, "positions", b"commodity,instrument")

    assert response.status_code == 413
    assert response.json()["detail"]["errors"][0]["code"] == "file_too_large"


def test_database_error_rolls_back():
    class FailingSession:
        def __init__(self):
            self.rolled_back = False

        def add_all(self, records):
            self.records = records

        def commit(self):
            raise RuntimeError("database unavailable")

        def rollback(self):
            self.rolled_back = True

    database = FailingSession()
    content = b"commodity,instrument,direction,quantity,unit,entry_price,market_price\nCopper,Future,Long,10,MT,9300,9450\n"

    with pytest.raises(RuntimeError, match="database unavailable"):
        import_positions_csv(database, content)

    assert database.rolled_back is True
