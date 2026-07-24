PERMISSIONS = [
    "Allowed",
    "Limited",
    "Blocked",
    "Review Required",
]

def determine_permission(
    evidence_score: int,
    risk_score: int,
    critical_alerts_count: int,
) -> str:
    if critical_alerts_count > 0:
        return "Blocked"

    if risk_score >= 75:
        return "Blocked"

    if risk_score >= 55:
        return "Review Required"

    if evidence_score < 45:
        return "Limited"

    return "Allowed"
