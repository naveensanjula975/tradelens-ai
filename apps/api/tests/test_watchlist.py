"""
Tests for the Price Watchlist feature.
Covers CRUD operations, price evaluation logic, threshold triggering,
and the /api/watchlist/evaluate endpoint.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.entities import PriceWatchlistModel, PositionModel
from app.services.watchlist_service import (
    create_watchlist_entry,
    evaluate_all_watchlist,
    list_watchlist,
    delete_watchlist_entry,
    _evaluate_single,
    _get_latest_price,
)


# ── Fixtures ───────────────────────────────────────────────────────────────────

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


@pytest.fixture
def db_session(isolated_client):
    _, testing_session = isolated_client
    with testing_session() as db:
        yield db


def _seed_position(db, commodity="Copper", instrument="LME Future", market_price=9500.0):
    """Insert a position so watchlist evaluation has a live price to read."""
    pos = PositionModel(
        commodity=commodity,
        instrument=instrument,
        direction="Long",
        quantity=250,
        unit="MT",
        entry_price=9200.0,
        market_price=market_price,
        currency="USD",
        counterparty="Exchange A",
    )
    db.add(pos)
    db.commit()
    return pos


# ── API Layer Tests ────────────────────────────────────────────────────────────

class TestWatchlistAPIListAndCreate:
    """GET and POST /api/watchlist endpoints."""

    def test_empty_list_returns_200(self, isolated_client):
        client, _ = isolated_client
        response = client.get("/api/watchlist")
        assert response.status_code == 200
        assert response.json() == []

    def test_create_valid_entry_returns_201(self, isolated_client):
        client, _ = isolated_client
        payload = {
            "commodity": "Copper",
            "instrument": "LME Future",
            "label": "Copper above 10000",
            "direction": "above",
            "threshold_price": 10000.0,
            "note": "Watch for breakout",
        }
        response = client.post("/api/watchlist", json=payload)
        assert response.status_code == 201
        body = response.json()
        assert body["commodity"] == "Copper"
        assert body["direction"] == "above"
        assert body["threshold_price"] == 10000.0
        assert "id" in body
        assert body["is_triggered"] is False  # no live price, not triggered

    def test_create_below_direction_entry(self, isolated_client):
        client, _ = isolated_client
        payload = {
            "commodity": "Aluminium",
            "instrument": "LME Spot",
            "label": "Aluminium below 2200",
            "direction": "below",
            "threshold_price": 2200.0,
        }
        response = client.post("/api/watchlist", json=payload)
        assert response.status_code == 201
        assert response.json()["direction"] == "below"

    def test_create_invalid_direction_returns_422(self, isolated_client):
        client, _ = isolated_client
        payload = {
            "commodity": "Copper",
            "instrument": "LME Future",
            "label": "Bad direction",
            "direction": "sideways",
            "threshold_price": 9000.0,
        }
        response = client.post("/api/watchlist", json=payload)
        assert response.status_code == 422

    def test_create_zero_threshold_returns_422(self, isolated_client):
        client, _ = isolated_client
        payload = {
            "commodity": "Copper",
            "instrument": "LME Future",
            "label": "Zero price",
            "direction": "above",
            "threshold_price": 0,
        }
        response = client.post("/api/watchlist", json=payload)
        assert response.status_code == 422

    def test_list_filtered_by_commodity(self, isolated_client):
        client, _ = isolated_client
        for commodity, direction in [("Copper", "above"), ("Zinc", "below")]:
            client.post("/api/watchlist", json={
                "commodity": commodity, "instrument": "LME Future",
                "label": f"{commodity} alert", "direction": direction,
                "threshold_price": 5000.0,
            })

        copper_entries = client.get("/api/watchlist?commodity=Copper").json()
        assert len(copper_entries) == 1
        assert copper_entries[0]["commodity"] == "Copper"

        all_entries = client.get("/api/watchlist").json()
        assert len(all_entries) == 2


class TestWatchlistAPIUpdateAndDelete:
    """PUT and DELETE /api/watchlist/{id} endpoints."""

    def test_update_threshold_price(self, isolated_client):
        client, _ = isolated_client
        create = client.post("/api/watchlist", json={
            "commodity": "Copper", "instrument": "LME Future",
            "label": "Test", "direction": "above", "threshold_price": 9500.0,
        })
        entry_id = create.json()["id"]

        update = client.put(f"/api/watchlist/{entry_id}", json={"threshold_price": 11000.0})
        assert update.status_code == 200
        assert update.json()["threshold_price"] == 11000.0

    def test_update_nonexistent_entry_returns_404(self, isolated_client):
        client, _ = isolated_client
        response = client.put("/api/watchlist/no-such-id", json={"threshold_price": 9000.0})
        assert response.status_code == 404

    def test_delete_entry_removes_record(self, isolated_client):
        client, _ = isolated_client
        create = client.post("/api/watchlist", json={
            "commodity": "Copper", "instrument": "LME Future",
            "label": "Delete me", "direction": "above", "threshold_price": 9000.0,
        })
        entry_id = create.json()["id"]

        del_response = client.delete(f"/api/watchlist/{entry_id}")
        assert del_response.status_code == 200
        assert "deleted successfully" in del_response.json()["message"].lower()

        assert client.get("/api/watchlist").json() == []

    def test_delete_nonexistent_entry_returns_404(self, isolated_client):
        client, _ = isolated_client
        response = client.delete("/api/watchlist/no-such-id")
        assert response.status_code == 404


# ── Evaluation Logic Tests ─────────────────────────────────────────────────────

class TestWatchlistEvaluationLogic:
    """Tests for _evaluate_single and evaluate_all_watchlist service functions."""

    def test_above_threshold_triggered_when_price_crosses(self, db_session):
        """If market_price >= threshold, 'above' entry must be is_triggered=True."""
        _seed_position(db_session, market_price=10200.0)  # above 10000
        entry = create_watchlist_entry(db_session, {
            "commodity": "Copper",
            "instrument": "LME Future",
            "label": "Breakout Watch",
            "direction": "above",
            "threshold_price": 10000.0,
        })
        assert entry.is_triggered is True
        assert entry.current_price == 10200.0

    def test_above_threshold_not_triggered_when_price_below(self, db_session):
        """If market_price < threshold, 'above' entry must be is_triggered=False."""
        _seed_position(db_session, market_price=9800.0)  # below 10000
        entry = create_watchlist_entry(db_session, {
            "commodity": "Copper",
            "instrument": "LME Future",
            "label": "Not yet",
            "direction": "above",
            "threshold_price": 10000.0,
        })
        assert entry.is_triggered is False

    def test_below_threshold_triggered_when_price_drops(self, db_session):
        """If market_price <= threshold, 'below' entry must be is_triggered=True."""
        _seed_position(db_session, market_price=8500.0)  # below 9000
        entry = create_watchlist_entry(db_session, {
            "commodity": "Copper",
            "instrument": "LME Future",
            "label": "Support Watch",
            "direction": "below",
            "threshold_price": 9000.0,
        })
        assert entry.is_triggered is True
        assert entry.current_price == 8500.0

    def test_below_threshold_not_triggered_when_price_above(self, db_session):
        """If market_price > threshold, 'below' entry must be is_triggered=False."""
        _seed_position(db_session, market_price=9600.0)  # above 9000
        entry = create_watchlist_entry(db_session, {
            "commodity": "Copper",
            "instrument": "LME Future",
            "label": "Not triggered",
            "direction": "below",
            "threshold_price": 9000.0,
        })
        assert entry.is_triggered is False

    def test_exactly_at_threshold_triggers(self, db_session):
        """Boundary: market_price == threshold_price must trigger both 'above' and 'below'."""
        _seed_position(db_session, market_price=9000.0)

        above = create_watchlist_entry(db_session, {
            "commodity": "Copper", "instrument": "LME Future",
            "label": "Exact above", "direction": "above", "threshold_price": 9000.0,
        })
        below = create_watchlist_entry(db_session, {
            "commodity": "Copper", "instrument": "LME Future",
            "label": "Exact below", "direction": "below", "threshold_price": 9000.0,
        })
        assert above.is_triggered is True
        assert below.is_triggered is True

    def test_no_live_price_not_triggered(self, db_session):
        """When no matching position exists, is_triggered must be False."""
        entry = create_watchlist_entry(db_session, {
            "commodity": "Nickel",
            "instrument": "LME Future",
            "label": "No price yet",
            "direction": "above",
            "threshold_price": 20000.0,
        })
        assert entry.is_triggered is False
        assert entry.current_price is None

    def test_get_latest_price_returns_highest_market_price(self, db_session):
        """_get_latest_price returns the max market_price across matching positions."""
        _seed_position(db_session, market_price=9400.0)
        _seed_position(db_session, market_price=9600.0)
        price = _get_latest_price(db_session, "Copper", "LME Future")
        assert price == 9600.0

    def test_evaluate_all_returns_correct_summary(self, db_session):
        """evaluate_all_watchlist counts triggered vs. pending entries correctly."""
        _seed_position(db_session, market_price=10500.0)  # above 10000

        # Two entries: one triggered, one not
        create_watchlist_entry(db_session, {
            "commodity": "Copper", "instrument": "LME Future",
            "label": "Will trigger", "direction": "above", "threshold_price": 10000.0,
        })
        create_watchlist_entry(db_session, {
            "commodity": "Copper", "instrument": "LME Future",
            "label": "Will not trigger", "direction": "above", "threshold_price": 12000.0,
        })

        summary = evaluate_all_watchlist(db_session, commodity="Copper")
        assert summary["evaluated_count"] == 2
        assert summary["triggered_count"] == 1
        assert summary["pending_count"] == 1
        assert len(summary["triggered"]) == 1
        assert len(summary["pending"]) == 1


class TestWatchlistEvaluateEndpoint:
    """POST /api/watchlist/evaluate endpoint."""

    def test_evaluate_endpoint_returns_200_with_summary(self, isolated_client):
        client, testing_session = isolated_client

        # Seed a live price
        with testing_session() as db:
            _seed_position(db, market_price=9800.0)

        client.post("/api/watchlist", json={
            "commodity": "Copper", "instrument": "LME Future",
            "label": "Test watch", "direction": "below", "threshold_price": 10000.0,
        })

        response = client.post("/api/watchlist/evaluate?commodity=Copper")
        assert response.status_code == 200
        data = response.json()
        assert "evaluated_count" in data
        assert "triggered_count" in data
        assert "pending_count" in data
        assert isinstance(data["triggered"], list)
        assert isinstance(data["pending"], list)

    def test_evaluate_triggered_entry_appears_in_triggered_list(self, isolated_client):
        client, testing_session = isolated_client
        with testing_session() as db:
            _seed_position(db, market_price=11000.0)  # above 10000

        client.post("/api/watchlist", json={
            "commodity": "Copper", "instrument": "LME Future",
            "label": "Will be triggered", "direction": "above", "threshold_price": 10000.0,
        })

        response = client.post("/api/watchlist/evaluate?commodity=Copper")
        data = response.json()
        assert data["triggered_count"] >= 1
        assert any(e["label"] == "Will be triggered" for e in data["triggered"])
