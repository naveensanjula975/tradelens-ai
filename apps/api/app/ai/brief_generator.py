import json
from openai import OpenAI
from app.config import settings

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

def generate_ai_brief(commodity: str, market_state: str, permission: str, risk_score: int, evidence_score: int, alerts: list) -> dict:
    alerts_text = "\n".join([f"- [{a['severity'].upper()}] {a['title']}: {a['description']}" for a in alerts]) if alerts else "- No critical alerts triggered."

    fallback_brief = {
        "headline": f"Increasing exposure is currently {permission.lower()}.",
        "summary": f"{commodity} operations are experiencing {market_state.lower()} conditions with a risk score of {risk_score}/100.",
        "why": [a["title"] for a in alerts[:3]] if alerts else ["All operational metrics are within standard tolerances."],
        "next_actions": [
            "Confirm vessel ETAs and supply logistics.",
            "Monitor counterparty credit line utilization.",
            "Maintain current risk-limit thresholds prior to next trading window."
        ]
    }

    if not settings.OPENAI_API_KEY:
        return fallback_brief

    try:
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        prompt = PROMPT_TEMPLATE.format(
            commodity=commodity,
            market_state=market_state,
            permission=permission,
            risk_score=risk_score,
            evidence_score=evidence_score,
            alerts_text=alerts_text
        )
        
        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": "You output JSON only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            response_format={"type": "json_object"}
        )
        content = response.choices[0].message.content
        data = json.loads(content)
        return {
            "headline": data.get("headline", fallback_brief["headline"]),
            "summary": data.get("summary", fallback_brief["summary"]),
            "why": data.get("why", fallback_brief["why"]),
            "next_actions": data.get("next_actions", fallback_brief["next_actions"])
        }
    except Exception as e:
        print(f"OpenAI Generation error: {e}")
        return fallback_brief
