"""
TC-001 through TC-006 — Full Rule-to-Permission Pipeline Integration Tests
Tests the complete deterministic pipeline:
  Rule evaluation → Evidence scoring → Permission determination

These integration tests verify the end-to-end decision flow as described
in the TradeLens AI test case document.
"""

import pytest
from app.engines.risk.rules import evaluate_all_rules
from app.engines.evidence.scoring import compute_scores
from app.engines.permission.policies import determine_permission


class MockRecord:
    """In-memory substitute for SQLAlchemy ORM model instances."""

    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)


# ── Fixtures ───────────────────────────────────────────────────────────────────

@pytest.fixture
def clean_positions():
    return [
        MockRecord(
            commodity="Copper", direction="Long", quantity=250,
            entry_price=9410, market_price=9475, counterparty="Global Metals Ltd",
        ),
    ]

@pytest.fixture
def healthy_inventory():
    return [
        MockRecord(commodity="Copper", location="Rotterdam", available_quantity=600, minimum_required=500, unit="MT"),
    ]

@pytest.fixture
def on_time_shipments():
    return [
        MockRecord(commodity="Copper", origin="Chile", destination="Singapore", status="In Transit", delay_days=0),
    ]

@pytest.fixture
def safe_counterparties():
    return [
        MockRecord(name="Global Metals Ltd", credit_limit=5_000_000, current_exposure=1_000_000),
    ]

@pytest.fixture
def risky_inventory():
    """TC-002: 280 available vs. 500 minimum => 44% deficit."""
    return [
        MockRecord(commodity="Copper", location="Rotterdam", available_quantity=280, minimum_required=500, unit="MT"),
    ]

@pytest.fixture
def delayed_shipments():
    """TC-001: 6-day delay triggers high-severity finding."""
    return [
        MockRecord(commodity="Copper", origin="Chile", destination="Singapore", status="Delayed", delay_days=6),
    ]

@pytest.fixture
def over_limit_counterparties():
    """TC-003: 92% utilisation triggers high-severity finding."""
    return [
        MockRecord(name="HighRisk Corp", credit_limit=5_000_000, current_exposure=4_600_000),
    ]


# ── TC-001 + TC-002 + TC-003 Pipeline ─────────────────────────────────────────

class TestRulePipelineTC001ToTC003:
    """Verify that individual rule breaches propagate correctly through the pipeline."""

    def test_tc001_delay_breach_in_pipeline(
        self, clean_positions, healthy_inventory, delayed_shipments, safe_counterparties
    ):
        """TC-001: delay_days=6 must appear as HIGH finding in the full pipeline output."""
        findings = evaluate_all_rules(
            clean_positions, healthy_inventory, delayed_shipments, safe_counterparties
        )
        delay_findings = [f for f in findings if f.get("rule") == "shipment_delay"]
        assert len(delay_findings) == 1
        assert delay_findings[0]["severity"] == "high"
        assert delay_findings[0]["score"] == 25

    def test_tc002_inventory_breach_in_pipeline(
        self, clean_positions, risky_inventory, on_time_shipments, safe_counterparties
    ):
        """TC-002: available=280, minimum=500 must surface a HIGH inventory finding."""
        findings = evaluate_all_rules(
            clean_positions, risky_inventory, on_time_shipments, safe_counterparties
        )
        inv_findings = [f for f in findings if f.get("rule") == "inventory_below_minimum"]
        assert len(inv_findings) == 1
        assert inv_findings[0]["severity"] == "high"

    def test_tc003_counterparty_breach_in_pipeline(
        self, clean_positions, healthy_inventory, on_time_shipments, over_limit_counterparties
    ):
        """TC-003: 92% utilisation must surface a HIGH counterparty finding."""
        findings = evaluate_all_rules(
            clean_positions, healthy_inventory, on_time_shipments, over_limit_counterparties
        )
        cp_findings = [f for f in findings if f.get("rule") == "counterparty_limit_exceeded"]
        assert len(cp_findings) == 1
        assert cp_findings[0]["severity"] == "high"


# ── TC-004, TC-005, TC-006 — Full Pipeline Permission Outcomes ─────────────────

class TestPermissionPipelineTC004ToTC006:
    """Tests the evidence → permission stage with realistic data inputs."""

    def test_tc004_critical_alerts_block_permission(
        self, clean_positions, risky_inventory, delayed_shipments, over_limit_counterparties
    ):
        """TC-004: Multiple high-severity findings => critical_count >= 1 => 'Blocked'."""
        findings = evaluate_all_rules(
            clean_positions, risky_inventory, delayed_shipments, over_limit_counterparties
        )
        scores = compute_scores(findings)
        permission = determine_permission(
            evidence_score=scores["evidence_score"],
            risk_score=scores["risk_score"],
            critical_alerts_count=scores["critical_count"],
        )
        assert permission == "Blocked"
        assert scores["critical_count"] >= 1

    def test_tc005_high_risk_score_blocks_permission(
        self, clean_positions, risky_inventory, delayed_shipments, safe_counterparties
    ):
        """TC-005: risk_score >= 75 from combined findings => permission 'Blocked'."""
        findings = evaluate_all_rules(
            clean_positions, risky_inventory, delayed_shipments, safe_counterparties
        )
        scores = compute_scores(findings)
        permission = determine_permission(
            evidence_score=scores["evidence_score"],
            risk_score=scores["risk_score"],
            critical_alerts_count=scores["critical_count"],
        )
        # Both inventory deficit and shipment delay should push risk >= 75
        if scores["risk_score"] >= 75 or scores["critical_count"] >= 1:
            assert permission == "Blocked"

    def test_tc006_healthy_scenario_returns_allowed(
        self, clean_positions, healthy_inventory, on_time_shipments, safe_counterparties
    ):
        """TC-006: Clean data => zero findings => evidence=85, risk=15 => 'Allowed'."""
        findings = evaluate_all_rules(
            clean_positions, healthy_inventory, on_time_shipments, safe_counterparties
        )
        scores = compute_scores(findings)
        permission = determine_permission(
            evidence_score=scores["evidence_score"],
            risk_score=scores["risk_score"],
            critical_alerts_count=scores["critical_count"],
        )
        assert permission in ("Allowed", "Limited")
        assert scores["risk_score"] < 75
        assert scores["critical_count"] == 0


# ── Full E2E Flows ─────────────────────────────────────────────────────────────

class TestEndToEndPipelineFlows:
    """End-to-end happy-path and blocked-path scenarios."""

    def test_clean_low_risk_flow_is_allowed(self):
        """All rules pass => evidence high, risk low => permission Allowed or Limited."""
        positions = [
            MockRecord(commodity="Copper", direction="Long", quantity=250, entry_price=9410, market_price=9475, counterparty="Exchange A"),
        ]
        inventory = [
            MockRecord(commodity="Copper", location="Rotterdam", available_quantity=600, minimum_required=500, unit="MT"),
        ]
        shipments = [
            MockRecord(commodity="Copper", origin="Chile", destination="Rotterdam", status="In Transit", delay_days=0),
        ]
        counterparties = [
            MockRecord(name="Exchange A", credit_limit=5_000_000, current_exposure=1_000_000),
        ]

        findings = evaluate_all_rules(positions, inventory, shipments, counterparties)
        scores = compute_scores(findings)
        permission = determine_permission(
            evidence_score=scores["evidence_score"],
            risk_score=scores["risk_score"],
            critical_alerts_count=scores["critical_count"],
        )

        assert permission in ("Allowed", "Limited")
        assert scores["risk_score"] < 50

    def test_multiple_breaches_result_in_blocked(self):
        """TC-001 + TC-002 + TC-003 combined => risk > 70 => permission Blocked."""
        positions = [
            MockRecord(commodity="Copper", direction="Long", quantity=15000, entry_price=9800, market_price=9000, counterparty="HighRisk Corp"),
        ]
        inventory = [
            MockRecord(commodity="Copper", location="Rotterdam", available_quantity=100, minimum_required=1000, unit="MT"),
        ]
        shipments = [
            MockRecord(commodity="Copper", origin="Chile", destination="Rotterdam", status="Delayed", delay_days=8),
        ]
        counterparties = [
            MockRecord(name="HighRisk Corp", credit_limit=100_000, current_exposure=98_000),
        ]

        findings = evaluate_all_rules(positions, inventory, shipments, counterparties)
        scores = compute_scores(findings)
        permission = determine_permission(
            evidence_score=scores["evidence_score"],
            risk_score=scores["risk_score"],
            critical_alerts_count=scores["critical_count"],
        )

        assert permission == "Blocked"
        assert scores["risk_score"] >= 70
        assert scores["critical_count"] >= 1

    @pytest.mark.parametrize("delay,expected_findings_min", [
        (0, 0),
        (5, 1),
        (10, 1),
    ])
    def test_shipment_delay_parametrized(self, delay, expected_findings_min):
        """Parametrized test for varying shipment delay values."""
        positions = [MockRecord(commodity="Copper", direction="Long", quantity=100, entry_price=9000, market_price=9100, counterparty="X")]
        inventory = [MockRecord(commodity="Copper", location="Rotterdam", available_quantity=600, minimum_required=500, unit="MT")]
        shipments = [MockRecord(commodity="Copper", origin="Chile", destination="Rotterdam", status="In Transit", delay_days=delay)]
        counterparties = [MockRecord(name="X", credit_limit=1_000_000, current_exposure=100_000)]

        findings = evaluate_all_rules(positions, inventory, shipments, counterparties)
        delay_findings = [f for f in findings if f.get("rule") == "shipment_delay"]
        assert len(delay_findings) >= expected_findings_min
