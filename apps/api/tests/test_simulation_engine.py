"""Tests for the Scenario Simulation Engine."""

import pytest
from app.engines.simulation.simulator import run_scenario_simulation


def test_simulation_zero_shocks_matches_baseline(isolated_client):
    """When all shock sliders are 0, simulated metrics should equal baseline metrics."""
    client, testing_session = isolated_client

    with testing_session() as db:
        res = run_scenario_simulation(db, commodity="Copper")

    assert res["baseline"]["permission"] == res["simulated"]["permission"]
    assert res["baseline"]["risk_score"] == res["simulated"]["risk_score"]
    assert res["delta"]["risk_score_change"] == 0


def test_simulation_shipment_delay_shock_increases_risk(isolated_client):
    """Adding shipment delay shock should increase simulated risk score or findings."""
    client, testing_session = isolated_client

    with testing_session() as db:
        res = run_scenario_simulation(
            db,
            commodity="Copper",
            added_shipment_delay_days=7,
        )

    assert res["simulated"]["risk_score"] >= res["baseline"]["risk_score"]
    assert "parameters" in res
    assert res["parameters"]["added_shipment_delay_days"] == 7


def test_simulation_endpoint_returns_200(isolated_client):
    """POST /api/simulation/evaluate should return 200 and structured comparison payload."""
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
    assert "baseline" in data
    assert "simulated" in data
    assert "delta" in data
