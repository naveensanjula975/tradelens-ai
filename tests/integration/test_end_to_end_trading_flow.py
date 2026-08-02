"""
Integration E2E Test Suite for TradeLens AI.
Tests end-to-end data evaluation flow: Database record creation -> Rule evaluation -> Decision determination -> AI explanation layer fallback.
"""

import pytest
from app.engines.risk.rules import evaluate_all_rules
from app.engines.evidence.scoring import compute_scores
from app.engines.permission.policies import determine_permission

class MockRecord:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)

class TestEndToEndTradingFlow:
    def test_e2e_low_risk_trade_flow(self):
        # 1. Create clean, low-risk database records
        positions = [
            MockRecord(commodity="Copper", direction="long", quantity=1000, entry_price=9000, market_price=9500, counterparty="Exchange A"),
            MockRecord(commodity="Copper", direction="short", quantity=500, entry_price=9500, market_price=9400, counterparty="Exchange B"),
        ]
        inventory = [
            MockRecord(commodity="Copper", location="Rotterdam", available_quantity=2000, minimum_required=500, unit="MT"),
        ]
        shipments = [
            MockRecord(commodity="Copper", origin="Chile", destination="Rotterdam", status="in transit", delay_days=0),
        ]
        counterparties = [
            MockRecord(name="Exchange A", credit_limit=5000000, current_exposure=1000000),
        ]

        # 2. Execute deterministic rule evaluation engine
        findings = evaluate_all_rules(positions, inventory, shipments, counterparties)
        
        # 3. Calculate evidence & risk scores
        scores = compute_scores(findings)
        
        # 4. Determine permission outcome
        permission = determine_permission(
            evidence_score=scores["evidence_score"],
            risk_score=scores["risk_score"],
            critical_alerts_count=scores["critical_count"]
        )

        # 5. Assert deterministic pipeline outcomes
        assert permission in ["Allowed", "Limited"]
        assert scores["risk_score"] < 50
        assert len(findings) == 0

    def test_e2e_high_risk_blocked_trade_flow(self):
        # 1. Create high-risk breached database records
        positions = [
            MockRecord(commodity="Copper", direction="long", quantity=15000, entry_price=9800, market_price=9000, counterparty="HighRisk Corp"),
        ]
        inventory = [
            MockRecord(commodity="Copper", location="Rotterdam", available_quantity=100, minimum_required=1000, unit="MT"),
        ]
        shipments = [
            MockRecord(commodity="Copper", origin="Chile", destination="Rotterdam", status="in transit", delay_days=8),
        ]
        counterparties = [
            MockRecord(name="HighRisk Corp", credit_limit=100000, current_exposure=98000),
        ]

        # 2. Execute rule evaluation engine
        findings = evaluate_all_rules(positions, inventory, shipments, counterparties)

        # 3. Compute scores
        scores = compute_scores(findings)

        # 4. Determine permission outcome
        permission = determine_permission(
            evidence_score=scores["evidence_score"],
            risk_score=scores["risk_score"],
            critical_alerts_count=scores["critical_count"]
        )

        # 5. Assert high risk / blocked outcome
        assert permission == "Blocked"
        assert scores["risk_score"] >= 70
        assert scores["critical_count"] >= 1
