"""
Tests for Scenario Simulation Engine (`app.engines.simulation.simulator`).
"""

import pytest
from app.models.entities import PositionModel, InventoryModel, ShipmentModel, CounterpartyModel, RiskLimitModel
from app.engines.simulation.simulator import run_scenario_simulation


class TestSimulationEngineExtended:
    def test_run_scenario_simulation_no_shocks(self, isolated_client):
        client, session_factory = isolated_client
        db = session_factory()

        # Seed baseline records
        pos = PositionModel(
            id="pos-sim-1", commodity="Copper", instrument="LME Copper", direction="Long",
            quantity=1000, unit="MT", entry_price=9000, market_price=9500, counterparty="Glencore"
        )
        inv = InventoryModel(
            id="inv-sim-1", commodity="Copper", location="Rotterdam", quantity=1000,
            unit="MT", minimum_required=500, available_quantity=800
        )
        db.add_all([pos, inv])
        db.commit()

        result = run_scenario_simulation(db, commodity="Copper")

        assert result["commodity"] == "Copper"
        assert result["delta"]["permission_changed"] is False
        assert result["delta"]["risk_score_change"] == 0

    def test_run_scenario_simulation_with_stress_shocks(self, isolated_client):
        client, session_factory = isolated_client
        db = session_factory()

        # Seed baseline records
        pos = PositionModel(
            id="pos-sim-2", commodity="Copper", instrument="LME Copper", direction="Long",
            quantity=5000, unit="MT", entry_price=9000, market_price=9500, counterparty="Glencore"
        )
        inv = InventoryModel(
            id="inv-sim-2", commodity="Copper", location="Rotterdam", quantity=1000,
            unit="MT", minimum_required=500, available_quantity=800
        )
        shp = ShipmentModel(
            id="shp-sim-2", commodity="Copper", origin="Chile", destination="Rotterdam",
            quantity=500, unit="MT", status="In Transit", delay_days=1, expected_arrival="2026-08-15"
        )
        cp = CounterpartyModel(
            id="cp-sim-2", name="Glencore", credit_limit=1000000, current_exposure=750000
        )
        db.add_all([pos, inv, shp, cp])
        db.commit()

        # Run stress test simulation with added shipment delays and price drops
        result = run_scenario_simulation(
            db,
            commodity="Copper",
            price_shift_pct=-15.0,
            inventory_shift_pct=-50.0,
            added_shipment_delay_days=6,
            counterparty_exposure_shift_pct=25.0
        )

        assert result["simulated"]["findings_count"] > result["baseline"]["findings_count"]
        assert result["delta"]["risk_score_change"] >= 0
        assert result["parameters"]["price_shift_pct"] == -15.0
        assert result["parameters"]["added_shipment_delay_days"] == 6
