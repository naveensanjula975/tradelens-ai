"""
Evidence scoring module.

Translates rule findings into weighted evidence scores used by the
permission policy engine.  Scores are additive — each finding contributes
a positive risk impact that reduces the overall evidence_score.
"""

from __future__ import annotations

CATEGORY_WEIGHTS: dict[str, float] = {
    "logistics": 1.2,
    "inventory": 1.3,
    "credit": 1.0,
    "concentration": 0.8,
    "margin": 0.7,
    "market_data": 1.0,
    "position": 1.1,
}

SEVERITY_BASE_SCORES: dict[str, int] = {
    "high": 25,
    "medium": 12,
    "low": 5,
}


def compute_evidence_score(findings: list[dict]) -> int:
    """Return an evidence score in [0, 100] (higher = more confident / less risk)."""
    if not findings:
        return 85

    weighted_risk = 0.0
    for f in findings:
        base = SEVERITY_BASE_SCORES.get(f.get("severity", "low"), 5)
        weight = CATEGORY_WEIGHTS.get(f.get("category", "market_data"), 1.0)
        weighted_risk += base * weight

    # Cap risk impact so score can't go below 5
    evidence_score = max(5, round(100 - weighted_risk * 0.55))
    return min(100, evidence_score)


def compute_risk_score(findings: list[dict]) -> int:
    """Return a risk score in [0, 100] (higher = more risky)."""
    if not findings:
        return 15

    total_risk = sum(f.get("score", 0) for f in findings)
    risk_score = min(100, 15 + total_risk)
    return risk_score


def compute_scores(findings: list[dict]) -> dict[str, int]:
    """Return evidence score, risk score, and critical alert count together."""
    critical_count = sum(1 for f in findings if f.get("severity") == "high")
    return {
        "evidence_score": compute_evidence_score(findings),
        "risk_score": compute_risk_score(findings),
        "critical_count": critical_count,
    }
