"""Tests for the snapshot tasks module."""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from unittest.mock import patch, MagicMock

from app.database import Base
from app.tasks.snapshots import snapshot_all_commodities, purge_old_snapshots


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


def _make_mock_dashboard(commodity: str, permission: str = "Allowed"):
    """Build a minimal mock DashboardData-like object."""
    decision = MagicMock()
    decision.market_state = "Normal Operations"
    decision.permission = permission
    decision.evidence_score = 80
    decision.risk_score = 20
    decision.confidence_score = 90
    decision.summary = f"{commodity} is in normal operating range."
    decision.supporting_evidence = ["Evidence A"]
    decision.blocking_factors = []

    brief = MagicMock()
    brief.headline = f"{commodity} operational brief"
    brief.summary = "Summary text"
    brief.why = ["Reason 1"]
    brief.next_actions = ["Action 1"]

    data = MagicMock()
    data.decision = decision
    data.ai_brief = brief
    return data


def test_snapshot_all_commodities_returns_results(db_session):
    """snapshot_all_commodities should return a result for each commodity."""
    with patch("app.tasks.snapshots.get_dashboard_data_for_commodity") as mock_get:
        mock_get.side_effect = lambda db, commodity: _make_mock_dashboard(commodity, "Allowed")

        results = snapshot_all_commodities(db_session)

    assert isinstance(results, dict)
    assert "Copper" in results
    assert "Aluminium" in results
    assert results["Copper"] == "Allowed"


def test_snapshot_handles_partial_errors(db_session):
    """If one commodity fails, others should still be snapshotted."""
    call_count = 0

    def side_effect(db, commodity):
        nonlocal call_count
        call_count += 1
        if commodity == "Zinc":
            raise RuntimeError("Simulated failure for Zinc")
        return _make_mock_dashboard(commodity, "Allowed")

    with patch("app.tasks.snapshots.get_dashboard_data_for_commodity", side_effect=side_effect):
        results = snapshot_all_commodities(db_session)

    assert results["Zinc"] == "error"
    assert results["Copper"] == "Allowed"
    # All 4 commodities were attempted
    assert call_count == 4


def test_purge_old_snapshots_returns_zero_when_empty(db_session):
    """purge_old_snapshots should return 0 if there are no records to delete."""
    deleted = purge_old_snapshots(db_session, keep_last_n=10)
    assert deleted == 0


def test_purge_old_snapshots_respects_keep_last_n(db_session):
    """Should delete records beyond keep_last_n per commodity."""
    with patch("app.tasks.snapshots.get_dashboard_data_for_commodity") as mock_get:
        mock_get.side_effect = lambda db, commodity: _make_mock_dashboard(commodity)
        # Create 3 snapshots for each commodity
        for _ in range(3):
            snapshot_all_commodities(db_session)

    # keep_last_n=1 means 2 of 3 should be deleted for each commodity (4 commodities × 2 = 8)
    deleted = purge_old_snapshots(db_session, keep_last_n=1)
    assert deleted == 8  # 4 commodities * 2 deleted each
