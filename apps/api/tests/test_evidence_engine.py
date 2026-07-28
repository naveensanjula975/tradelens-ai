"""Tests for the evidence scoring engine."""

import pytest
from app.engines.evidence.scoring import compute_evidence_score, compute_risk_score, compute_scores


def test_no_findings_returns_healthy_scores():
    scores = compute_scores([])
    assert scores["evidence_score"] == 85
    assert scores["risk_score"] == 15


def test_high_severity_logistics_lowers_evidence():
    findings = [
        {
            "category": "logistics",
            "severity": "high",
            "score": 25,
            "message": "Delayed shipment",
        }
    ]
    scores = compute_scores(findings)
    # High logistics finding should pull evidence well below 85
    assert scores["evidence_score"] < 75
    # Risk score should be elevated
    assert scores["risk_score"] > 20


def test_multiple_critical_findings_high_risk():
    findings = [
        {"category": "logistics", "severity": "high", "score": 25, "message": "Delay"},
        {"category": "inventory", "severity": "high", "score": 30, "message": "Below min"},
        {"category": "credit", "severity": "high", "score": 25, "message": "Limit breached"},
    ]
    scores = compute_scores(findings)
    # Three high-severity findings should push risk near/at cap
    assert scores["risk_score"] >= 80
    assert scores["evidence_score"] <= 40


def test_medium_findings_moderate_score():
    findings = [
        {"category": "margin", "severity": "medium", "score": 12, "message": "Negative margin"},
        {"category": "concentration", "severity": "medium", "score": 15, "message": "Concentration"},
    ]
    scores = compute_scores(findings)
    assert 30 < scores["risk_score"] < 75
    assert scores["evidence_score"] > 30


def test_risk_score_capped_at_100():
    findings = [
        {"category": "logistics", "severity": "high", "score": 999, "message": "Max"},
    ]
    scores = compute_scores(findings)
    assert scores["risk_score"] == 100


def test_evidence_score_never_below_5():
    findings = [{"category": "inventory", "severity": "high", "score": 999, "message": "x"} for _ in range(20)]
    scores = compute_scores(findings)
    assert scores["evidence_score"] >= 5
