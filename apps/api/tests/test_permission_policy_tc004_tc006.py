"""
TC-004, TC-005, TC-006 — Permission Policy Tests
Tests the determine_permission function with critical findings, high risk scores,
and healthy scores as specified in the test case document.
"""

import pytest
from app.engines.permission.policies import determine_permission


class TestTC004PermissionBlockedByCriticalAlerts:
    """TC-004: Critical findings present => 'Blocked'."""

    def test_one_critical_alert_blocks_trade(self):
        """TC-004 exact: critical_alerts_count=1 => 'Blocked'."""
        result = determine_permission(
            evidence_score=70,
            risk_score=40,
            critical_alerts_count=1,
        )
        assert result == "Blocked"

    def test_multiple_critical_alerts_blocks_trade(self):
        """Multiple critical alerts should also produce 'Blocked'."""
        result = determine_permission(
            evidence_score=80,
            risk_score=30,
            critical_alerts_count=3,
        )
        assert result == "Blocked"

    def test_zero_critical_alerts_does_not_force_block(self):
        """Zero critical alerts with good scores should not return 'Blocked'."""
        result = determine_permission(
            evidence_score=85,
            risk_score=20,
            critical_alerts_count=0,
        )
        assert result != "Blocked"


class TestTC005PermissionBlockedByHighRiskScore:
    """TC-005: Risk score >= 75 => 'Blocked'."""

    def test_risk_score_80_blocks_trade(self):
        """TC-005 exact: risk_score=80 => 'Blocked'."""
        result = determine_permission(
            evidence_score=50,
            risk_score=80,
            critical_alerts_count=0,
        )
        assert result == "Blocked"

    def test_risk_score_75_blocks_trade(self):
        """Boundary: risk_score=75 is the minimum for a block."""
        result = determine_permission(
            evidence_score=60,
            risk_score=75,
            critical_alerts_count=0,
        )
        assert result == "Blocked"

    def test_risk_score_74_does_not_force_block(self):
        """risk_score=74 with no critical alerts should not be 'Blocked'."""
        result = determine_permission(
            evidence_score=70,
            risk_score=74,
            critical_alerts_count=0,
        )
        assert result != "Blocked"


class TestTC006PermissionAllowedForHealthyScores:
    """TC-006: evidence_score=85, risk_score=20, critical_alerts_count=0 => 'Allowed'."""

    def test_healthy_scores_returns_allowed(self):
        """TC-006 exact scenario: all healthy scores must return 'Allowed'."""
        result = determine_permission(
            evidence_score=85,
            risk_score=20,
            critical_alerts_count=0,
        )
        assert result == "Allowed"

    def test_very_high_evidence_and_zero_risk_is_allowed(self):
        """Maximum evidence, zero risk, no alerts => 'Allowed'."""
        result = determine_permission(
            evidence_score=100,
            risk_score=0,
            critical_alerts_count=0,
        )
        assert result == "Allowed"

    def test_result_is_one_of_known_states(self):
        """determine_permission must return a recognised permission string."""
        result = determine_permission(
            evidence_score=85,
            risk_score=20,
            critical_alerts_count=0,
        )
        assert result in ("Allowed", "Limited", "Blocked")

    @pytest.mark.parametrize("evidence,risk,critical,expected", [
        (85, 20, 0, "Allowed"),
        (50, 80, 1, "Blocked"),
        (80, 80, 0, "Blocked"),
        (70, 40, 1, "Blocked"),
    ])
    def test_parametrized_permission_scenarios(self, evidence, risk, critical, expected):
        """Parametrized cross-check of the three permission gate rules."""
        result = determine_permission(
            evidence_score=evidence,
            risk_score=risk,
            critical_alerts_count=critical,
        )
        assert result == expected
