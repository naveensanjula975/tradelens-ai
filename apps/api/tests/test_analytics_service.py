"""
Tests for TradeLens AI Analytics Service (`app.services.analytics_service`).
"""

import pytest
from app.models.entities import PositionModel, InventoryModel, ShipmentModel, CounterpartyModel
from app.services.analytics_service import get_portfolio_analytics_summary


class TestAnalyticsService:
    def test_get_portfolio_analytics_summary_empty_db(self, isolated_client):
        client, session_factory = isolated_client
        db = session_factory()

        summary = get_portfolio_analytics_summary(db)
        assert summary is not None
        assert "total_portfolio_exposure_usd" in summary
        assert summary["total_portfolio_exposure_usd"] == 0.0
        assert summary["overall_credit_utilization_pct"] == 0.0
        assert "commodities" in summary
        assert len(summary["commodities"]) == 4

    def test_get_portfolio_analytics_summary_with_seeded_data(self, isolated_client):
        client, session_factory = isolated_client
        db = session_factory()

        # Seed sample position
        pos = PositionModel(
            id="pos-test-1",
            commodity="Copper",
            instrument="LME Copper Grade A",
            direction="Long",
            quantity=1500,
            unit="MT",
            entry_price=9200,
            market_price=9500,
            counterparty="Glencore Ltd",
        )
        db.add(pos)

        # Seed sample inventory
        inv = InventoryModel(
            id="inv-test-1",
            commodity="Copper",
            location="Rotterdam",
            available_quantity=800,
            minimum_required=1000,
            unit="MT",
        )
        db.add(inv)

        # Seed sample shipment
        shp = ShipmentModel(
            id="shp-test-1",
            commodity="Copper",
            origin="Chile",
            destination="Rotterdam",
            status="In Transit",
            quantity=500,
            unit="MT",
            delay_days=3,
        )
        db.add(shp)

        # Seed counterparty
        cp = CounterpartyModel(
            id="cp-test-1",
            name="Glencore Ltd",
            credit_limit=1000000,
            current_exposure=750000,
        )
        db.add(cp)
        db.commit()

        summary = get_portfolio_analytics_summary(db)
        assert summary["total_current_exposure_usd"] == 750000.0
        assert summary["total_credit_limit_usd"] == 1000000.0
        assert summary["overall_credit_utilization_pct"] == 75.0

        copper = next(c for c in summary["commodities"] if c["commodity"] == "Copper")
        assert copper["net_quantity_mt"] == 1500.0
        assert copper["mtm_value_usd"] == 14250000.0  # 1500 * 9500
        assert copper["inventory_coverage_pct"] == 80.0  # 800 / 1000 * 100
        assert copper["in_transit_shipments"] == 1
        assert copper["delayed_shipments"] == 1
