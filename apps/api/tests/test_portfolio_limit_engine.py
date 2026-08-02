"""
Unit & Integration tests for TradeLens AI risk evaluation rules and portfolio limit engines.
"""

import pytest
from app.engines.risk.rules import (
    shipment_delay_rule,
    inventory_below_minimum_rule,
    counterparty_limit_exceeded_rule,
    high_concentration_rule,
    missing_market_price_rule,
    negative_margin_rule,
    evaluate_all_rules,
    calculate_scores,
)

class MockObject:
    """Helper class to mock database models in rule engine tests."""
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)

class TestRiskRulesEngine:
    def test_shipment_delay_rule_high_severity(self):
        shipment = MockObject(origin="Chile", destination="Singapore", delay_days=7)
        res = shipment_delay_rule(shipment)
        assert res is not None
        assert res["rule"] == "shipment_delay"
        assert res["severity"] == "high"
        assert res["score"] == 25
        assert "7 days" in res["message"]

    def test_shipment_delay_rule_medium_severity(self):
        shipment = MockObject(origin="Chile", destination="Rotterdam", delay_days=3)
        res = shipment_delay_rule(shipment)
        assert res is not None
        assert res["severity"] == "medium"
        assert res["score"] == 12

    def test_shipment_delay_rule_no_delay(self):
        shipment = MockObject(origin="Chile", destination="Rotterdam", delay_days=1)
        res = shipment_delay_rule(shipment)
        assert res is None

    def test_inventory_below_minimum_rule_high_severity(self):
        inv = MockObject(location="Rotterdam", available_quantity=100, minimum_required=500, unit="MT")
        res = inventory_below_minimum_rule(inv)
        assert res is not None
        assert res["severity"] == "high"
        assert res["score"] == 30
        assert "80.0%" in res["message"]

    def test_inventory_below_minimum_rule_medium_severity(self):
        inv = MockObject(location="Rotterdam", available_quantity=400, minimum_required=500, unit="MT")
        res = inventory_below_minimum_rule(inv)
        assert res is not None
        assert res["severity"] == "medium"
        assert res["score"] == 15

    def test_inventory_above_minimum(self):
        inv = MockObject(location="Rotterdam", available_quantity=600, minimum_required=500, unit="MT")
        res = inventory_below_minimum_rule(inv)
        assert res is None

    def test_counterparty_limit_exceeded_critical(self):
        cp = MockObject(name="Glencore Ltd", credit_limit=100000, current_exposure=95000)
        res = counterparty_limit_exceeded_rule(cp)
        assert res is not None
        assert res["severity"] == "high"
        assert res["score"] == 25
        assert "95" in res["message"]

    def test_counterparty_limit_exceeded_warning(self):
        cp = MockObject(name="Trafigura AG", credit_limit=100000, current_exposure=82000)
        res = counterparty_limit_exceeded_rule(cp)
        assert res is not None
        assert res["severity"] == "medium"
        assert res["score"] == 12

    def test_high_concentration_rule_triggered(self):
        positions = [
            MockObject(counterparty="Single Trader Corp", quantity=700, direction="long"),
            MockObject(counterparty="Other Exchange", quantity=300, direction="long"),
        ]
        res = high_concentration_rule(positions)
        assert res is not None
        assert res["rule"] == "high_concentration"
        assert "70.0%" in res["message"]

    def test_high_concentration_rule_normal(self):
        positions = [
            MockObject(counterparty="Trader A", quantity=400, direction="long"),
            MockObject(counterparty="Trader B", quantity=300, direction="long"),
            MockObject(counterparty="Trader C", quantity=300, direction="long"),
        ]
        res = high_concentration_rule(positions)
        assert res is None

    def test_negative_margin_rule_long_loss(self):
        positions = [
            MockObject(direction="long", entry_price=9800, market_price=9200),
        ]
        res = negative_margin_rule(positions)
        assert res is not None
        assert res["rule"] == "negative_margin"
        assert "1 positions" in res["message"]

    def test_negative_margin_rule_short_loss(self):
        positions = [
            MockObject(direction="short", entry_price=9200, market_price=9800),
        ]
        res = negative_margin_rule(positions)
        assert res is not None
        assert res["rule"] == "negative_margin"

    def test_evaluate_all_rules_combined(self):
        shipments = [MockObject(origin="Peru", destination="China", delay_days=6)]
        inventory = [MockObject(location="Shanghai", available_quantity=100, minimum_required=500, unit="MT")]
        counterparties = [MockObject(name="Acme Minerals", credit_limit=50000, current_exposure=48000)]
        positions = [
            MockObject(commodity="Copper", direction="long", quantity=8000, entry_price=9500, market_price=9100, counterparty="Acme Minerals"),
        ]
        risk_limits = MockObject(max_position_quantity=5000)

        findings = evaluate_all_rules(positions, inventory, shipments, counterparties, risk_limits)
        assert len(findings) >= 4

        rules_found = {f["rule"] for f in findings}
        assert "shipment_delay" in rules_found
        assert "inventory_below_minimum" in rules_found
        assert "counterparty_limit_exceeded" in rules_found
        assert "position_limit_exceeded" in rules_found

        # Test score calculation
        scores = calculate_scores(findings)
        assert "evidence_score" in scores
        assert "risk_score" in scores
        assert 0 <= scores["risk_score"] <= 100
