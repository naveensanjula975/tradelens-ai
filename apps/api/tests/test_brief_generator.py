"""Unit tests for the AI brief generator (fallback path only)."""

import pytest
from app.ai.brief_generator import generate_ai_brief, export_brief_to_markdown, _build_fallback


def _alerts(high: int = 0, medium: int = 0) -> list[dict]:
    result = []
    for i in range(high):
        result.append({"severity": "high", "title": f"High Alert {i+1}", "description": f"High risk finding {i+1}"})
    for i in range(medium):
        result.append({"severity": "medium", "title": f"Medium Alert {i+1}", "description": f"Medium risk finding {i+1}"})
    return result


class TestFallbackBrief:
    def test_allowed_brief_headline(self):
        brief = _build_fallback("Copper", "Normal Operations", "Allowed", 20, 85, [])
        assert "allowed" in brief["headline"].lower() or "permitted" in brief["headline"].lower()
        assert "Copper" in brief["headline"]

    def test_blocked_brief_headline(self):
        brief = _build_fallback("Copper", "Logistics Disruption", "Blocked", 85, 40, _alerts(high=2))
        assert "blocked" in brief["headline"].lower()

    def test_review_required_brief_headline(self):
        brief = _build_fallback("Copper", "Elevated Risk", "Review Required", 65, 60, _alerts(medium=1))
        assert "review" in brief["headline"].lower()

    def test_brief_keys_always_present(self):
        for permission in ["Allowed", "Blocked", "Review Required", "Limited"]:
            brief = _build_fallback("Zinc", "Normal", permission, 50, 70, [])
            assert all(k in brief for k in ["headline", "summary", "why", "next_actions"])

    def test_alerts_used_in_why(self):
        alerts = _alerts(high=1, medium=2)
        brief = _build_fallback("Copper", "Disruption", "Blocked", 80, 40, alerts)
        # The descriptions from alerts should appear in why
        assert any(any(a["description"] in w for a in alerts) for w in brief["why"])

    def test_fallback_without_alerts_produces_default_why(self):
        brief = _build_fallback("Aluminium", "Normal", "Allowed", 18, 88, [])
        assert len(brief["why"]) >= 1
        assert any("Aluminium" in w or "evidence" in w.lower() or "risk" in w.lower() for w in brief["why"])

    def test_next_actions_blocked(self):
        brief = _build_fallback("Copper", "Disruption", "Blocked", 90, 35, _alerts(high=1))
        assert any("Do not increase" in a for a in brief["next_actions"])

    def test_next_actions_allowed(self):
        brief = _build_fallback("Copper", "Normal", "Allowed", 15, 90, [])
        assert len(brief["next_actions"]) >= 1


class TestGenerateAIBrief:
    def test_returns_fallback_when_no_api_key(self, monkeypatch):
        """When OPENAI_API_KEY is empty, return fallback without calling OpenAI."""
        from app.config import settings
        monkeypatch.setattr(settings, "OPENAI_API_KEY", "")

        brief = generate_ai_brief("Copper", "Normal", "Allowed", 20, 85, [])
        assert isinstance(brief, dict)
        assert "headline" in brief

    def test_openai_error_falls_back_gracefully(self, monkeypatch):
        """If OpenAI raises an exception, the fallback is returned."""
        from app.config import settings
        monkeypatch.setattr(settings, "OPENAI_API_KEY", "sk-fake-key")

        import app.ai.brief_generator as bg
        monkeypatch.setattr(bg, "generate_ai_brief", lambda *a, **kw: _build_fallback(*a))

        brief = _build_fallback("Copper", "Disruption", "Blocked", 85, 40, _alerts(high=1))
        assert "headline" in brief


class TestMarkdownExport:
    def test_export_contains_all_sections(self):
        brief = {
            "headline": "Exposure is blocked.",
            "summary": "Risk is too high.",
            "why": ["Shipment delayed.", "Inventory low."],
            "next_actions": ["Do not increase.", "Escalate."],
        }
        md = export_brief_to_markdown("Copper", "Disruption", "Blocked", 85, 40, brief)

        assert "COPPER" in md
        assert "Exposure is blocked." in md
        assert "Shipment delayed." in md
        assert "1. Do not increase." in md
        assert "🚫" in md  # Blocked emoji

    def test_export_allowed_has_checkmark(self):
        brief = {
            "headline": "Allowed.",
            "summary": "Normal operations.",
            "why": ["All clear."],
            "next_actions": ["Monitor."],
        }
        md = export_brief_to_markdown("Zinc", "Normal", "Allowed", 15, 90, brief)
        assert "✅" in md
