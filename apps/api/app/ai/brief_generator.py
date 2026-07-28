"""
AI Brief Generator for TradeLens AI.

Generates natural-language operational briefs from deterministic risk outputs.
Falls back to a rich template generator if OpenAI is unavailable.
"""

from __future__ import annotations

import json
import logging
from typing import Any

logger = logging.getLogger(__name__)


PROMPT_TEMPLATE = """
You are TradeLens AI, an expert commodity risk & operational analytics engine.
Explain the following calculated risk decision in clear, professional executive language.

Commodity: {commodity}
Market State: {market_state}
Permission Status: {permission}
Risk Score: {risk_score}/100
Evidence Score: {evidence_score}/100

Structured Alerts / Key Factors:
{alerts_text}

Instructions:
1. Provide a concise headline summarizing whether expanding exposure is allowed, blocked, or requires review.
2. Provide a 2-sentence summary explaining why.
3. Provide 3 bullet points under 'why' explaining the exact empirical facts.
4. Provide 3 actionable next steps under 'next_actions'.

Output ONLY valid JSON with keys: "headline", "summary", "why", "next_actions".
"""

# Richer fallback templates keyed by permission status
_FALLBACK_TEMPLATES: dict[str, dict[str, Any]] = {
    "Allowed": {
        "headline_fmt": "Increasing {commodity} exposure is currently permitted.",
        "summary_fmt": (
            "{commodity} operational metrics are within standard tolerances with a risk "
            "score of {risk_score}/100 and an evidence score of {evidence_score}/100. "
            "No critical blocking factors are outstanding."
        ),
    },
    "Blocked": {
        "headline_fmt": "Increasing {commodity} exposure is blocked.",
        "summary_fmt": (
            "{commodity} positions cannot be increased due to {alert_count} active risk finding(s) "
            "with a risk score of {risk_score}/100. Immediate remediation is required "
            "before any additional exposure is permissible."
        ),
    },
    "Review Required": {
        "headline_fmt": "Increasing {commodity} exposure requires desk review.",
        "summary_fmt": (
            "{commodity} shows elevated risk at {risk_score}/100. Conditions are outside "
            "normal operating tolerances and require senior approval before proceeding."
        ),
    },
    "Limited": {
        "headline_fmt": "Incremental {commodity} exposure is limited to reduced size.",
        "summary_fmt": (
            "{commodity} presents moderate risk at {risk_score}/100. Positions may only be "
            "adjusted within reduced limits until the underlying factors are resolved."
        ),
    },
}


def _build_fallback(
    commodity: str,
    market_state: str,
    permission: str,
    risk_score: int,
    evidence_score: int,
    alerts: list[dict],
) -> dict:
    """Build a rich template-driven fallback brief without an OpenAI call."""
    template = _FALLBACK_TEMPLATES.get(permission, _FALLBACK_TEMPLATES["Review Required"])
    alert_count = len(alerts)

    headline = template["headline_fmt"].format(commodity=commodity)
    summary = template["summary_fmt"].format(
        commodity=commodity,
        risk_score=risk_score,
        evidence_score=evidence_score,
        alert_count=alert_count,
        market_state=market_state,
    )

    # Extract specific why reasons from alerts
    high_alerts = [a for a in alerts if a.get("severity") == "high"]
    medium_alerts = [a for a in alerts if a.get("severity") == "medium"]
    ordered = high_alerts + medium_alerts

    why = [a.get("description", a.get("title", "Alert triggered")) for a in ordered[:3]]
    if not why:
        why = [
            f"{commodity} market state is classified as '{market_state}'.",
            f"Evidence score: {evidence_score}/100 — {_evidence_label(evidence_score)}.",
            f"Risk score: {risk_score}/100 — {_risk_label(risk_score)}.",
        ]

    next_actions = _default_next_actions(permission, market_state)

    return {"headline": headline, "summary": summary, "why": why, "next_actions": next_actions}


def _evidence_label(score: int) -> str:
    if score >= 80:
        return "high confidence in data quality"
    if score >= 55:
        return "moderate evidence confidence"
    return "low evidence confidence — data gaps present"


def _risk_label(score: int) -> str:
    if score >= 75:
        return "critical risk level"
    if score >= 50:
        return "elevated risk level"
    return "within acceptable risk tolerance"


def _default_next_actions(permission: str, market_state: str) -> list[str]:
    if permission == "Blocked":
        return [
            "Do not increase physical or derivative exposure until blocking factors are resolved.",
            "Escalate logistics delays or inventory shortfalls to ops management immediately.",
            "Re-evaluate risk posture after confirming vessel ETAs and inventory counts.",
        ]
    if permission == "Review Required":
        return [
            "Obtain senior desk approval before placing any incremental orders.",
            "Monitor counterparty credit utilization and shipment status in real-time.",
            "Confirm current inventory coverage is sufficient for next 14 days of operations.",
        ]
    if permission == "Limited":
        return [
            "Limit new orders to 50% of standard increment size.",
            "Review market state classification and verify underlying data.",
            "Set tighter stop-loss thresholds on open derivative positions.",
        ]
    return [
        "Confirm vessel ETAs and supply logistics.",
        "Monitor counterparty credit line utilization.",
        "Maintain current risk-limit thresholds prior to next trading window.",
    ]


def generate_ai_brief(
    commodity: str,
    market_state: str,
    permission: str,
    risk_score: int,
    evidence_score: int,
    alerts: list[dict],
) -> dict:
    """
    Generate an AI brief for the given risk context.

    Returns a dict with keys: headline, summary, why, next_actions.
    Calls OpenAI if OPENAI_API_KEY is configured; otherwise uses the rich fallback.
    """
    from app.config import settings

    fallback = _build_fallback(commodity, market_state, permission, risk_score, evidence_score, alerts)

    if not settings.OPENAI_API_KEY:
        return fallback

    try:
        from openai import OpenAI

        alerts_text = (
            "\n".join(
                f"- [{a['severity'].upper()}] {a['title']}: {a['description']}"
                for a in alerts
            )
            if alerts
            else "- No critical alerts triggered."
        )

        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        prompt = PROMPT_TEMPLATE.format(
            commodity=commodity,
            market_state=market_state,
            permission=permission,
            risk_score=risk_score,
            evidence_score=evidence_score,
            alerts_text=alerts_text,
        )

        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": "You output JSON only."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            response_format={"type": "json_object"},
        )
        content = response.choices[0].message.content
        data = json.loads(content)

        return {
            "headline": data.get("headline", fallback["headline"]),
            "summary": data.get("summary", fallback["summary"]),
            "why": data.get("why", fallback["why"]),
            "next_actions": data.get("next_actions", fallback["next_actions"]),
        }

    except Exception as exc:
        logger.warning("OpenAI brief generation failed: %s — using fallback.", exc)
        return fallback


def export_brief_to_markdown(
    commodity: str,
    market_state: str,
    permission: str,
    risk_score: int,
    evidence_score: int,
    brief: dict,
) -> str:
    """Render the brief as a Markdown string suitable for download."""
    why_bullets = "\n".join(f"- {item}" for item in brief.get("why", []))
    action_bullets = "\n".join(f"{i + 1}. {item}" for i, item in enumerate(brief.get("next_actions", [])))

    permission_emoji = {"Allowed": "✅", "Blocked": "🚫", "Review Required": "⚠️", "Limited": "🔶"}.get(permission, "ℹ️")

    return f"""# TRADELENS AI — DAILY TRADING BRIEF ({commodity.upper()})

**Market State:** {market_state}
**Permission:** {permission_emoji} {permission.upper()}
**Risk Score:** {risk_score} / 100
**Evidence Score:** {evidence_score} / 100

---

### Executive Summary

**{brief.get("headline")}**

{brief.get("summary")}

---

### Key Evidence & Factors

{why_bullets}

---

### Recommended Desk Actions

{action_bullets}

---

*Generated automatically by TradeLens AI Decision Engine. Decision support only — does not constitute financial advice.*
"""
