"""Tests for the market events API endpoint."""

import pytest


def test_market_events_empty_list(isolated_client):
    """GET /api/market-events returns an empty list initially."""
    client, _ = isolated_client
    response = client.get("/api/market-events")
    assert response.status_code == 200
    assert response.json() == []


def test_create_market_event(isolated_client):
    """POST /api/market-events creates and returns the event."""
    client, _ = isolated_client
    payload = {
        "commodity": "Copper",
        "title": "Chilean Port Strike",
        "impact_level": "High",
        "description": "Port workers halted operations affecting copper exports.",
        "source": "Reuters",
        "date": "2026-07-28",
    }
    response = client.post("/api/market-events", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "Chilean Port Strike"
    assert body["impact_level"] == "High"
    assert "id" in body


def test_list_filtered_by_commodity(isolated_client):
    """GET /api/market-events?commodity= filters by commodity."""
    client, _ = isolated_client

    for commodity, title in [("Copper", "Copper Event"), ("Zinc", "Zinc Event")]:
        client.post("/api/market-events", json={
            "commodity": commodity, "title": title, "impact_level": "Low",
            "description": "Desc", "source": "Test", "date": "2026-07-28",
        })

    copper_events = client.get("/api/market-events?commodity=Copper").json()
    assert len(copper_events) == 1
    assert copper_events[0]["commodity"] == "Copper"

    all_events = client.get("/api/market-events").json()
    assert len(all_events) == 2


def test_delete_market_event(isolated_client):
    """DELETE /api/market-events/{id} removes the record."""
    client, _ = isolated_client
    create_resp = client.post("/api/market-events", json={
        "commodity": "Copper", "title": "Test Event", "impact_level": "Low",
        "description": "Desc", "source": "Test", "date": "2026-07-28",
    })
    event_id = create_resp.json()["id"]

    del_resp = client.delete(f"/api/market-events/{event_id}")
    assert del_resp.status_code == 200
    assert "deleted successfully" in del_resp.json()["message"].lower()

    assert client.get("/api/market-events").json() == []


def test_delete_nonexistent_market_event(isolated_client):
    """DELETE /api/market-events/{id} returns 404 for missing records."""
    client, _ = isolated_client
    response = client.delete("/api/market-events/no-such-id")
    assert response.status_code == 404
