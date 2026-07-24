from app.engines.risk.rules import shipment_delay_rule, inventory_below_minimum_rule, counterparty_limit_exceeded_rule, calculate_scores
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

def test_permission_policy():
    perm = determine_permission(evidence_score=50, risk_score=80, critical_alerts_count=1)
    assert perm == "Blocked"

    perm_ok = determine_permission(evidence_score=85, risk_score=20, critical_alerts_count=0)
    assert perm_ok == "Allowed"
