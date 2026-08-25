"""
TC-001, TC-002, TC-003 — Risk Engine Rule Tests
Tests the deterministic rule evaluation for shipment delay, inventory deficit,
and counterparty credit-limit breach as specified in the test case document.
"""

import pytest
from app.engines.risk.rules import (
    shipment_delay_rule,
    inventory_below_minimum_rule,
    counterparty_limit_exceeded_rule,
)


class DummyObj:
    """Lightweight stand-in for ORM model objects."""

    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)


# ── TC-001 ─────────────────────────────────────────────────────────────────────

class TestTC001ShipmentDelayRule:
    """TC-001: Shipment delay >= 5 days => HIGH severity, score 25."""

    def test_delay_6_days_returns_high_finding(self):
        """Exact TC-001 scenario: delay_days=6 must trigger a HIGH finding."""
        shipment = DummyObj(origin="Chile", destination="Rotterdam", delay_days=6)
        result = shipment_delay_rule(shipment)
        assert result is not None, "Expected a finding for a 6-day delay"
        assert result["severity"] == "high"
        assert result["score"] == 25

    def test_delay_exactly_5_days_triggers_rule(self):
        """Boundary: delay_days=5 is the minimum threshold for a finding."""
        shipment = DummyObj(origin="Peru", destination="Singapore", delay_days=5)
        result = shipment_delay_rule(shipment)
        assert result is not None

    def test_delay_below_threshold_no_finding(self):
        """delay_days=4 should not produce a finding."""
        shipment = DummyObj(origin="Peru", destination="Rotterdam", delay_days=4)
        result = shipment_delay_rule(shipment)
        assert result is None

    def test_no_delay_no_finding(self):
        """delay_days=0 must return None (clean shipment)."""
        shipment = DummyObj(origin="Chile", destination="Singapore", delay_days=0)
        result = shipment_delay_rule(shipment)
        assert result is None

    def test_finding_contains_required_keys(self):
        """Rule output must contain rule, category, severity, score, and message."""
        shipment = DummyObj(origin="Chile", destination="Rotterdam", delay_days=8)
        result = shipment_delay_rule(shipment)
        for key in ("rule", "category", "severity", "score", "message"):
            assert key in result, f"Missing key: {key}"


# ── TC-002 ─────────────────────────────────────────────────────────────────────

class TestTC002InventoryDeficitRule:
    """TC-002: Inventory deficit > 30% => HIGH severity, score 30."""

    def test_44_pct_deficit_returns_high_finding(self):
        """
        TC-002 exact scenario:
        available_quantity=280, minimum_required=500 => ~44% deficit => HIGH, score 30.
        """
        inv = DummyObj(
            location="Rotterdam",
            available_quantity=280,
            minimum_required=500,
            unit="MT",
        )
        result = inventory_below_minimum_rule(inv)
        assert result is not None
        assert result["severity"] == "high"
        assert result["score"] == 30

    def test_zero_available_is_maximum_deficit(self):
        """available_quantity=0 should produce a HIGH finding."""
        inv = DummyObj(location="Singapore", available_quantity=0, minimum_required=200, unit="MT")
        result = inventory_below_minimum_rule(inv)
        assert result is not None
        assert result["severity"] == "high"

    def test_sufficient_inventory_no_finding(self):
        """available_quantity >= minimum_required => no finding."""
        inv = DummyObj(location="Rotterdam", available_quantity=600, minimum_required=500, unit="MT")
        result = inventory_below_minimum_rule(inv)
        assert result is None

    def test_finding_includes_location_in_message(self):
        """The finding message should reference the warehouse location."""
        inv = DummyObj(location="Antwerp", available_quantity=100, minimum_required=500, unit="MT")
        result = inventory_below_minimum_rule(inv)
        assert result is not None
        assert "Antwerp" in result["message"]


# ── TC-003 ─────────────────────────────────────────────────────────────────────

class TestTC003CounterpartyLimitRule:
    """TC-003: Counterparty limit >= 90% utilisation => HIGH severity, score 25."""

    def test_92_pct_utilisation_triggers_rule(self):
        """TC-003 exact: 92% utilisation => HIGH finding, score 25."""
        cp = DummyObj(name="HighRisk Corp", credit_limit=5_000_000, current_exposure=4_600_000)
        result = counterparty_limit_exceeded_rule(cp)
        assert result is not None
        assert result["severity"] == "high"
        assert result["score"] == 25

    def test_exactly_90_pct_triggers_rule(self):
        """Boundary: exactly 90% utilisation should trigger the rule."""
        cp = DummyObj(name="BoundaryFirm", credit_limit=1_000_000, current_exposure=900_000)
        result = counterparty_limit_exceeded_rule(cp)
        assert result is not None

    def test_below_threshold_no_finding(self):
        """89% utilisation should NOT trigger the rule."""
        cp = DummyObj(name="SafeFirm", credit_limit=1_000_000, current_exposure=890_000)
        result = counterparty_limit_exceeded_rule(cp)
        assert result is None

    def test_finding_references_counterparty_name(self):
        """The finding message should include the counterparty name."""
        cp = DummyObj(name="Global Metals Ltd", credit_limit=5_000_000, current_exposure=4_600_000)
        result = counterparty_limit_exceeded_rule(cp)
        assert result is not None
        assert "Global Metals Ltd" in result["message"]
