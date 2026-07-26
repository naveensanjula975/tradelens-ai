from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_upload_positions_rejects_invalid_csv_schema():
    response = client.post(
        "/api/uploads/positions",
        files={"file": ("bad.csv", b"commodity,instrument,direction,quantity,unit,entry_price\nCopper,Physical,Long,100,MT,9300\n", "text/csv")},
    )

    assert response.status_code == 400
    payload = response.json()
    assert "missing required columns" in payload["detail"]["errors"][0]["message"].lower()

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_dashboard_endpoint():
    response = client.get("/api/dashboard/Copper")
    assert response.status_code == 200
    data = response.json()
    assert data["commodity"] == "Copper"
    assert "decision" in data
    assert "ai_brief" in data
    assert "alerts" in data

def test_positions_crud():
    # Create position
    new_pos = {
        "commodity": "Copper",
        "instrument": "Physical",
        "direction": "Long",
        "quantity": 100.0,
        "unit": "MT",
        "entry_price": 9300.0,
        "market_price": 9450.0,
        "currency": "USD",
        "counterparty": "Test Trading Ltd"
    }
    create_res = client.post("/api/positions", json=new_pos)
    assert create_res.status_code == 200
    pos_data = create_res.json()
    assert pos_data["quantity"] == 100.0
    pos_id = pos_data["id"]

    # Read position list
    list_res = client.get("/api/positions?commodity=Copper")
    assert list_res.status_code == 200

    # Delete position
    del_res = client.delete(f"/api/positions/{pos_id}")
    assert del_res.status_code == 200
