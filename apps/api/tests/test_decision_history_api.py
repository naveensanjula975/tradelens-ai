"""Tests for the decision history and snapshot API endpoints."""

import pytest
from unittest.mock import patch, MagicMock


def _make_mock_data(commodity: str = "Copper"):
    decision = MagicMock()
    decision.market_state = "Normal Operations"
    decision.permission = "Allowed"
    decision.evidence_score = 80
    decision.risk_score = 20
    decision.confidence_score = 90
    decision.summary = "All metrics within tolerance."
    decision.supporting_evidence = []
    decision.blocking_factors = []

    brief = MagicMock()
    brief.headline = "Exposure allowed."
    brief.summary = "Operations normal."
    brief.why = ["Evidence A"]
    brief.next_actions = ["Monitor"]

    data = MagicMock()
    data.decision = decision
    data.ai_brief = brief
    return data


def test_decision_history_empty(isolated_client):
    """GET /api/decision-history returns empty list when no snapshots exist."""
    client, _ = isolated_client
    response = client.get("/api/decision-history?commodity=Copper")
    assert response.status_code == 200
    assert response.json() == []


def test_decision_history_after_snapshot_run(isolated_client):
    """After running snapshots, decision history endpoint returns records."""
    client, _ = isolated_client

    with patch("app.tasks.snapshots.get_dashboard_data_for_commodity") as mock_get:
        mock_get.side_effect = lambda db, commodity: _make_mock_data(commodity)
        run_response = client.post("/api/snapshots/run")

    assert run_response.status_code == 200
    results = run_response.json()["results"]
    assert "Copper" in results
    assert results["Copper"] == "Allowed"

    history_response = client.get("/api/decision-history?commodity=Copper")
    assert history_response.status_code == 200
    history = history_response.json()
    assert len(history) >= 1
    assert history[0]["commodity"] == "Copper"
    assert history[0]["permission"] == "Allowed"
    assert "created_at" in history[0]


def test_snapshot_run_returns_all_commodities(isolated_client):
    """POST /api/snapshots/run should process all 4 commodities."""
    client, _ = isolated_client

    with patch("app.tasks.snapshots.get_dashboard_data_for_commodity") as mock_get:
        mock_get.side_effect = lambda db, commodity: _make_mock_data(commodity)
        response = client.post("/api/snapshots/run")

    assert response.status_code == 200
    body = response.json()
    assert "results" in body
    assert set(body["results"].keys()) == {"Copper", "Aluminium", "Zinc", "Nickel"}


def test_snapshot_purge(isolated_client):
    """DELETE /api/snapshots/purge should return a count."""
    client, _ = isolated_client
    response = client.delete("/api/snapshots/purge?keep_last_n=50")
    assert response.status_code == 200
    assert "Purged" in response.json()["message"]


def test_decision_history_limit_param(isolated_client):
    """The limit parameter should restrict the number of returned records."""
    client, _ = isolated_client

    with patch("app.tasks.snapshots.get_dashboard_data_for_commodity") as mock_get:
        mock_get.side_effect = lambda db, commodity: _make_mock_data(commodity)
        # Create 3 snapshots
        for _ in range(3):
            client.post("/api/snapshots/run")

    response = client.get("/api/decision-history?commodity=Copper&limit=2")
    assert response.status_code == 200
    assert len(response.json()) <= 2
