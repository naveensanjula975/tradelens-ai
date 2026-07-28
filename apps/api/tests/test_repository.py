"""Tests for the Repository layer (entities.py)."""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.repositories import (
    PositionRepository,
    InventoryRepository,
    ShipmentRepository,
    CounterpartyRepository,
    AlertRepository,
)


@pytest.fixture
def db_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


# ── PositionRepository ──────────────────────────────────────────────────────

class TestPositionRepository:
    def test_create_and_list(self, db_session):
        repo = PositionRepository(db_session)
        repo.create(
            commodity="Copper", instrument="LME Future", direction="Long",
            quantity=100, unit="MT", entry_price=9300.0, market_price=9450.0,
            currency="USD"
        )
        positions = repo.list()
        assert len(positions) == 1
        assert positions[0].commodity == "Copper"

    def test_list_filtered_by_commodity(self, db_session):
        repo = PositionRepository(db_session)
        repo.create(commodity="Copper", instrument="F1", direction="Long",
                    quantity=50, unit="MT", entry_price=9300, market_price=9400, currency="USD")
        repo.create(commodity="Zinc", instrument="F2", direction="Short",
                    quantity=30, unit="MT", entry_price=3200, market_price=3100, currency="USD")

        copper = repo.list(commodity="Copper")
        assert len(copper) == 1
        assert copper[0].commodity == "Copper"

        zinc = repo.list(commodity="Zinc")
        assert len(zinc) == 1

    def test_get_returns_none_for_missing(self, db_session):
        repo = PositionRepository(db_session)
        assert repo.get("nonexistent-id") is None

    def test_update_modifies_field(self, db_session):
        repo = PositionRepository(db_session)
        created = repo.create(
            commodity="Copper", instrument="Physical", direction="Long",
            quantity=100, unit="MT", entry_price=9300, market_price=9450, currency="USD"
        )
        updated = repo.update(created.id, commodity="Copper", instrument="Physical",
                              direction="Long", quantity=200, unit="MT",
                              entry_price=9300, market_price=9450, currency="USD")
        assert updated is not None
        assert updated.quantity == 200

    def test_update_missing_returns_none(self, db_session):
        repo = PositionRepository(db_session)
        assert repo.update("no-such-id", commodity="Copper", instrument="F",
                           direction="Long", quantity=1, unit="MT",
                           entry_price=1, market_price=1, currency="USD") is None

    def test_delete_returns_true_and_removes_record(self, db_session):
        repo = PositionRepository(db_session)
        created = repo.create(
            commodity="Copper", instrument="F", direction="Long",
            quantity=10, unit="MT", entry_price=9300, market_price=9450, currency="USD"
        )
        assert repo.delete(created.id) is True
        assert repo.list() == []

    def test_delete_missing_returns_false(self, db_session):
        repo = PositionRepository(db_session)
        assert repo.delete("no-such-id") is False


# ── InventoryRepository ─────────────────────────────────────────────────────

class TestInventoryRepository:
    def test_create_and_list(self, db_session):
        repo = InventoryRepository(db_session)
        repo.create(commodity="Copper", location="Rotterdam",
                    quantity=500, unit="MT", minimum_required=400, available_quantity=480)
        items = repo.list()
        assert len(items) == 1
        assert items[0].location == "Rotterdam"

    def test_list_filtered_by_commodity(self, db_session):
        repo = InventoryRepository(db_session)
        repo.create(commodity="Copper", location="Rotterdam",
                    quantity=500, unit="MT", minimum_required=400, available_quantity=480)
        repo.create(commodity="Zinc", location="Hamburg",
                    quantity=200, unit="MT", minimum_required=150, available_quantity=190)

        assert len(repo.list(commodity="Copper")) == 1
        assert len(repo.list(commodity="Zinc")) == 1
        assert len(repo.list()) == 2

    def test_delete(self, db_session):
        repo = InventoryRepository(db_session)
        created = repo.create(commodity="Copper", location="Port",
                               quantity=100, unit="MT", minimum_required=50, available_quantity=90)
        assert repo.delete(created.id) is True
        assert repo.list() == []


# ── ShipmentRepository ──────────────────────────────────────────────────────

class TestShipmentRepository:
    def test_create_and_update_status(self, db_session):
        repo = ShipmentRepository(db_session)
        created = repo.create(
            commodity="Copper", origin="Chile", destination="Singapore",
            quantity=400, unit="MT", expected_arrival="2026-08-15",
            status="In Transit", delay_days=0
        )
        assert created.status == "In Transit"

        updated = repo.update(created.id,
            commodity="Copper", origin="Chile", destination="Singapore",
            quantity=400, unit="MT", expected_arrival="2026-08-18",
            status="Delayed", delay_days=3
        )
        assert updated.status == "Delayed"
        assert updated.delay_days == 3


# ── CounterpartyRepository ──────────────────────────────────────────────────

class TestCounterpartyRepository:
    def test_create_list_delete(self, db_session):
        repo = CounterpartyRepository(db_session)
        created = repo.create(name="Global Metals Ltd",
                               credit_limit=5_000_000, current_exposure=3_000_000,
                               risk_rating="A-")
        assert created.name == "Global Metals Ltd"

        items = repo.list()
        assert len(items) == 1

        assert repo.delete(created.id) is True
        assert repo.list() == []


# ── AlertRepository ─────────────────────────────────────────────────────────

class TestAlertRepository:
    def test_list_and_clear_by_commodity(self, db_session):
        from app.models.entities import AlertModel
        repo = AlertRepository(db_session)
        # Manually add test alerts
        db_session.add(AlertModel(
            commodity="Copper", category="logistics", severity="high",
            title="Delay", description="Shipment delayed", evidence=[], recommended_action=""
        ))
        db_session.add(AlertModel(
            commodity="Zinc", category="inventory", severity="medium",
            title="Low stock", description="Below minimum", evidence=[], recommended_action=""
        ))
        db_session.commit()

        copper_alerts = repo.list(commodity="Copper")
        assert len(copper_alerts) == 1
        assert copper_alerts[0].commodity == "Copper"

        repo.clear_for_commodity("Copper")
        db_session.commit()
        assert repo.list(commodity="Copper") == []
        assert len(repo.list(commodity="Zinc")) == 1
