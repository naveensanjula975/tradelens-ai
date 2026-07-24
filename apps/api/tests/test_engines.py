from app.engines.risk.rules import (
    shipment_delay_rule,
    inventory_below_minimum_rule,
    counterparty_limit_exceeded_rule,
    high_concentration_rule,
    missing_market_price_rule,
    negative_margin_rule,
    calculate_scores,
)
from app.engines.permission.policies import determine_permission
from app.engines.state.classifications import classify_market_state

class DummyObj:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)

def test_shipment_delay_rule():
    shipment = DummyObj(origin="Chile", destination="Singapore", delay_days=6)
    res = shipment_delay_rule(shipment)
    assert res is not None
    assert res["severity"] == "high"
    assert res["score"] == 25

def test_inventory_rule():
    inv = DummyObj(location="Rotterdam", available_quantity=280, minimum_required=500, unit="MT")
    res = inventory_below_minimum_rule(inv)
    assert res is not None
    assert res["severity"] == "high"

def test_high_concentration_rule():
    positions = [
        DummyObj(counterparty="Global Metals Ltd", quantity=300),
        DummyObj(counterparty="Global Metals Ltd", quantity=400),
        DummyObj(counterparty="Northstar Trading", quantity=100),
    ]
    res = high_concentration_rule(positions)
    assert res is not None
    assert res["rule"] == "high_concentration"

def test_missing_market_price_rule():
    positions = [
        DummyObj(market_price=0),
        DummyObj(market_price=9475),
    ]
    res = missing_market_price_rule(positions)
    assert res is not None
    assert res["rule"] == "missing_market_price"

def test_negative_margin_rule():
    positions = [
        DummyObj(direction="Long", entry_price=9500, market_price=9400),
    ]
    res = negative_margin_rule(positions)
    assert res is not None
    assert res["rule"] == "negative_margin"

def test_permission_policy():
    perm = determine_permission(evidence_score=50, risk_score=80, critical_alerts_count=1)
    assert perm == "Blocked"

    perm_ok = determine_permission(evidence_score=85, risk_score=20, critical_alerts_count=0)
    assert perm_ok == "Allowed"

