import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.entities import CounterpartyModel, InventoryModel, ShipmentModel


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


@pytest.mark.parametrize(
    ("resource", "initial_payload", "updated_payload", "changed_field", "model"),
    [
        (
            "inventory",
            {
                "commodity": "Copper",
                "location": "Rotterdam",
                "quantity": 100,
                "unit": "MT",
                "minimum_required": 60,
                "available_quantity": 80,
            },
            {
                "commodity": "Copper",
                "location": "Antwerp",
                "quantity": 120,
                "unit": "MT",
                "minimum_required": 70,
                "available_quantity": 95,
            },
            "location",
            InventoryModel,
        ),
        (
            "shipments",
            {
                "commodity": "Copper",
                "origin": "Chile",
                "destination": "Singapore",
                "quantity": 200,
                "unit": "MT",
                "expected_arrival": "2026-08-15",
                "status": "In Transit",
                "delay_days": 0,
            },
            {
                "commodity": "Copper",
                "origin": "Chile",
                "destination": "Singapore",
                "quantity": 200,
                "unit": "MT",
                "expected_arrival": "2026-08-18",
                "status": "Delayed",
                "delay_days": 3,
            },
            "status",
            ShipmentModel,
        ),
        (
            "counterparties",
            {
                "name": "Global Metals Ltd",
                "credit_limit": 5_000_000,
                "current_exposure": 3_500_000,
                "risk_rating": "A-",
            },
            {
                "name": "Global Metals Ltd",
                "credit_limit": 5_500_000,
                "current_exposure": 4_000_000,
                "risk_rating": "BBB+",
            },
            "risk_rating",
            CounterpartyModel,
        ),
    ],
)
def test_resource_create_update_delete_lifecycle(
    isolated_client,
    resource,
    initial_payload,
    updated_payload,
    changed_field,
    model,
):
    client, testing_session = isolated_client

    create_response = client.post(f"/api/{resource}", json=initial_payload)
    assert create_response.status_code == 200
    item_id = create_response.json()["id"]

    update_response = client.put(f"/api/{resource}/{item_id}", json=updated_payload)
    assert update_response.status_code == 200
    assert update_response.json()[changed_field] == updated_payload[changed_field]

    delete_response = client.delete(f"/api/{resource}/{item_id}")
    assert delete_response.status_code == 200
    assert "deleted successfully" in delete_response.json()["message"].lower()

    missing_response = client.delete(f"/api/{resource}/{item_id}")
    assert missing_response.status_code == 404

    with testing_session() as database:
        assert database.query(model).count() == 0


@pytest.mark.parametrize(
    ("resource", "payload", "error_location"),
    [
        (
            "positions",
            {
                "commodity": "Copper",
                "instrument": "Future",
                "direction": "Flat",
                "quantity": 10,
                "unit": "MT",
                "entry_price": 9300,
                "market_price": 9450,
                "currency": "USD",
            },
            "direction",
        ),
        (
            "inventory",
            {
                "commodity": "Copper",
                "location": "Rotterdam",
                "quantity": 50,
                "unit": "MT",
                "minimum_required": 20,
                "available_quantity": 60,
            },
            "body",
        ),
        (
            "shipments",
            {
                "commodity": "Copper",
                "origin": "Chile",
                "destination": "Singapore",
                "quantity": 200,
                "unit": "MT",
                "expected_arrival": "2026-02-30",
                "status": "In Transit",
                "delay_days": -1,
            },
            "expected_arrival",
        ),
        (
            "counterparties",
            {
                "name": "Global Metals Ltd",
                "credit_limit": 0,
                "current_exposure": -1,
                "risk_rating": "A-",
            },
            "credit_limit",
        ),
    ],
)
def test_create_rejects_invalid_domain_values(
    isolated_client, resource, payload, error_location
):
    client, _ = isolated_client

    response = client.post(f"/api/{resource}", json=payload)

    assert response.status_code == 422
    locations = [str(part) for error in response.json()["detail"] for part in error["loc"]]
    assert error_location in locations
