"""Tests for the Portfolio Analytics service and API endpoint."""

import pytest
from app.services.analytics_service import get_portfolio_analytics_summary


def test_get_portfolio_analytics_summary_keys(isolated_client):
    """get_portfolio_analytics_summary should return all key sections and 4 commodities."""
    client, testing_session = isolated_client

    with testing_session() as db:
        data = get_portfolio_analytics_summary(db)

    assert "total_portfolio_exposure_usd" in data
    assert "total_credit_limit_usd" in data
    assert "overall_credit_utilization_pct" in data
    assert "commodities" in data
    assert len(data["commodities"]) == 4
    commodity_names = {c["commodity"] for c in data["commodities"]}
    assert commodity_names == {"Copper", "Aluminium", "Zinc", "Nickel"}


def test_analytics_summary_endpoint(isolated_client):
    """GET /api/analytics/summary should return 200 and structured json."""
    client, _ = isolated_client

    response = client.get("/api/analytics/summary")
    assert response.status_code == 200
    data = response.json()

    assert "commodities" in data
    assert isinstance(data["commodities"], list)
    assert len(data["commodities"]) == 4
    assert "highest_risk_commodity" in data
