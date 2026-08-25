"""
TC-012 — Position CRUD — Create invalid position
TC-013 & TC-014 — Scenario Simulator tests (zero shock & delay shock)
TC-015 — Portfolio Analytics summary
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.engines.simulation.simulator import run_scenario_simulation


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


# ── TC-012 ─────────────────────────────────────────────────────────────────────

class TestTC012InvalidPositionCreate:
    """TC-012: POST /api/positions with quantity=-10 => 422 Unprocessable Entity."""

    def test_negative_quantity_returns_422(self, isolated_client):
        """TC-012 exact: quantity=-10 must return HTTP 422."""
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

    def test_zero_quantity_is_also_invalid(self, isolated_client):
        """quantity=0 should also be rejected (not a positive integer)."""
        client, _ = isolated_client
        payload = {
            "commodity": "Copper",
            "instrument": "Future",
            "direction": "Long",
            "quantity": 0,
            "unit": "MT",
            "entry_price": 9300,
            "market_price": 9450,
            "currency": "USD",
        }
        response = client.post("/api/positions", json=payload)
        assert response.status_code == 422

    def test_valid_position_returns_200(self, isolated_client):
        """A properly formed position should succeed (positive control)."""
        client, _ = isolated_client
        payload = {
            "commodity": "Copper",
            "instrument": "Future",
            "direction": "Long",
            "quantity": 250,
            "unit": "MT",
            "entry_price": 9410,
            "market_price": 9475,
            "currency": "USD",
            "counterparty": "Global Metals Ltd",
        }
        response = client.post("/api/positions", json=payload)
        assert response.status_code == 200
        assert response.json()["quantity"] == 250

    def test_invalid_direction_returns_422(self, isolated_client):
        """direction='Flat' (not a valid enum value) should return 422."""
        client, _ = isolated_client
        payload = {
            "commodity": "Copper",
            "instrument": "Future",
            "direction": "Flat",
            "quantity": 100,
            "unit": "MT",
            "entry_price": 9300,
            "market_price": 9450,
            "currency": "USD",
        }
        response = client.post("/api/positions", json=payload)
        assert response.status_code == 422


# ── TC-013 ─────────────────────────────────────────────────────────────────────

class TestTC013ZeroShockSimulation:
    """TC-013: Zero shock => baseline risk score equals simulated risk score."""

    def test_zero_shocks_returns_matching_scores(self, isolated_client):
        """TC-013 exact: all shocks at 0 => baseline == simulated, delta == 0."""
        _, testing_session = isolated_client
        with testing_session() as db:
            result = run_scenario_simulation(db, commodity="Copper")

        assert result["baseline"]["risk_score"] == result["simulated"]["risk_score"]
        assert result["delta"]["risk_score_change"] == 0

    def test_zero_shocks_permissions_match(self, isolated_client):
        """With no shocks, the permission decision should be identical."""
        _, testing_session = isolated_client
        with testing_session() as db:
            result = run_scenario_simulation(db, commodity="Copper")

        assert result["baseline"]["permission"] == result["simulated"]["permission"]

    def test_zero_shock_endpoint_returns_200(self, isolated_client):
        """POST /api/simulation/evaluate with all-zero shocks => 200 OK."""
        client, _ = isolated_client
        payload = {
            "commodity": "Copper",
            "price_shift_pct": 0.0,
            "inventory_shift_pct": 0.0,
            "added_shipment_delay_days": 0,
            "counterparty_exposure_shift_pct": 0.0,
        }
        response = client.post("/api/simulation/evaluate", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["delta"]["risk_score_change"] == 0


# ── TC-014 ─────────────────────────────────────────────────────────────────────

class TestTC014DelayShockSimulation:
    """TC-014: added_shipment_delay_days=7 => simulated risk >= baseline, new findings listed."""

    def test_delay_shock_increases_or_maintains_risk(self, isolated_client):
        """TC-014: adding 7 days of shipment delay must not reduce risk score."""
        _, testing_session = isolated_client
        with testing_session() as db:
            result = run_scenario_simulation(
                db,
                commodity="Copper",
                added_shipment_delay_days=7,
            )

        assert result["simulated"]["risk_score"] >= result["baseline"]["risk_score"]

    def test_delay_shock_result_contains_parameters(self, isolated_client):
        """The response must echo back the applied shock parameters."""
        _, testing_session = isolated_client
        with testing_session() as db:
            result = run_scenario_simulation(
                db,
                commodity="Copper",
                added_shipment_delay_days=7,
            )

        assert "parameters" in result
        assert result["parameters"]["added_shipment_delay_days"] == 7

    def test_delay_shock_endpoint_returns_200_with_delta(self, isolated_client):
        """POST /api/simulation/evaluate with delay shock => 200 and non-empty delta."""
        client, _ = isolated_client
        payload = {
            "commodity": "Copper",
            "price_shift_pct": 0.0,
            "inventory_shift_pct": 0.0,
            "added_shipment_delay_days": 7,
            "counterparty_exposure_shift_pct": 0.0,
        }
        response = client.post("/api/simulation/evaluate", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "baseline" in data
        assert "simulated" in data
        assert "delta" in data

    def test_combined_shocks_endpoint(self, isolated_client):
        """Full combined shock payload => 200 with all required keys."""
        client, _ = isolated_client
        payload = {
            "commodity": "Copper",
            "price_shift_pct": -10.0,
            "inventory_shift_pct": -30.0,
            "added_shipment_delay_days": 4,
            "counterparty_exposure_shift_pct": 20.0,
        }
        response = client.post("/api/simulation/evaluate", json=payload)
        assert response.status_code == 200
        data = response.json()
        for key in ("baseline", "simulated", "delta"):
            assert key in data


# ── TC-015 ─────────────────────────────────────────────────────────────────────

class TestTC015PortfolioAnalytics:
    """TC-015: GET /api/analytics/summary => 200 OK with data for all 4 commodities."""

    def test_analytics_summary_returns_200(self, isolated_client):
        """TC-015 exact: GET /api/analytics/summary must return HTTP 200."""
        client, _ = isolated_client
        response = client.get("/api/analytics/summary")
        assert response.status_code == 200

    def test_analytics_summary_covers_all_commodities(self, isolated_client):
        """The summary should contain analytics for Copper, Aluminium, Zinc, and Nickel."""
        client, _ = isolated_client
        response = client.get("/api/analytics/summary")
        assert response.status_code == 200
        data = response.json()
        # The response can be a list or a dict keyed by commodity
        if isinstance(data, list):
            commodities = {item.get("commodity") for item in data}
        else:
            commodities = set(data.keys())
        expected = {"Copper", "Aluminium", "Zinc", "Nickel"}
        assert expected.issubset(commodities), f"Missing commodities: {expected - commodities}"

    def test_analytics_summary_response_is_not_empty(self, isolated_client):
        """The analytics response should not be an empty structure."""
        client, _ = isolated_client
        response = client.get("/api/analytics/summary")
        data = response.json()
        assert data  # non-empty
