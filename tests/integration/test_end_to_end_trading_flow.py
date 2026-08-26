"""
Integration E2E Test Suite for TradeLens AI.
Tests end-to-end data evaluation flow: Database record creation -> Rule evaluation -> Decision determination -> AI explanation layer fallback.
Includes Price Watchlist integration flow: Position prices -> Threshold evaluation -> Triggered alerts.
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


class TestPriceWatchlistIntegration:
    """
    E2E integration tests for the Price Watchlist feature.
    Verifies the complete flow: live position prices -> threshold evaluation -> triggered state.
    These tests use the service layer directly with an in-memory SQLite session.
    """

    def _make_db_session(self):
        """Create an isolated in-memory SQLite session for service-level tests."""
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker
        from sqlalchemy.pool import StaticPool
        from app.database import Base

        engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(bind=engine)
        Session = sessionmaker(bind=engine)
        return Session(), engine

    def _seed_position(self, db, commodity="Copper", instrument="LME Future", market_price=9500.0):
        from app.models.entities import PositionModel
        pos = PositionModel(
            commodity=commodity, instrument=instrument,
            direction="Long", quantity=250, unit="MT",
            entry_price=9200.0, market_price=market_price,
            currency="USD", counterparty="Exchange A",
        )
        db.add(pos)
        db.commit()
        return pos

    def test_watchlist_above_threshold_triggers_when_price_crosses(self):
        """E2E: position price 10500 > threshold 10000 => is_triggered=True."""
        from app.services.watchlist_service import create_watchlist_entry
        db, engine = self._make_db_session()
        try:
            self._seed_position(db, market_price=10500.0)
            entry = create_watchlist_entry(db, {
                "commodity": "Copper", "instrument": "LME Future",
                "label": "Breakout watch", "direction": "above",
                "threshold_price": 10000.0,
            })
            assert entry.is_triggered is True
            assert entry.current_price == 10500.0
        finally:
            db.close()
            engine.dispose()

    def test_watchlist_below_threshold_triggers_when_price_drops(self):
        """E2E: position price 8800 < threshold 9000 => is_triggered=True."""
        from app.services.watchlist_service import create_watchlist_entry
        db, engine = self._make_db_session()
        try:
            self._seed_position(db, market_price=8800.0)
            entry = create_watchlist_entry(db, {
                "commodity": "Copper", "instrument": "LME Future",
                "label": "Support level watch", "direction": "below",
                "threshold_price": 9000.0,
            })
            assert entry.is_triggered is True
        finally:
            db.close()
            engine.dispose()

    def test_watchlist_evaluate_all_returns_correct_triggered_count(self):
        """E2E: evaluate_all_watchlist counts triggered vs pending correctly."""
        from app.services.watchlist_service import create_watchlist_entry, evaluate_all_watchlist
        db, engine = self._make_db_session()
        try:
            self._seed_position(db, market_price=11000.0)
            # One will trigger (threshold 10000), one won't (threshold 12000)
            create_watchlist_entry(db, {
                "commodity": "Copper", "instrument": "LME Future",
                "label": "Will trigger", "direction": "above", "threshold_price": 10000.0,
            })
            create_watchlist_entry(db, {
                "commodity": "Copper", "instrument": "LME Future",
                "label": "Will not trigger", "direction": "above", "threshold_price": 12000.0,
            })
            summary = evaluate_all_watchlist(db, commodity="Copper")
            assert summary["evaluated_count"] == 2
            assert summary["triggered_count"] == 1
            assert summary["pending_count"] == 1
        finally:
            db.close()
            engine.dispose()

    def test_watchlist_no_live_price_not_triggered(self):
        """E2E: no matching position => is_triggered=False, current_price=None."""
        from app.services.watchlist_service import create_watchlist_entry
        db, engine = self._make_db_session()
        try:
            # No position seeded — no live price available
            entry = create_watchlist_entry(db, {
                "commodity": "Nickel", "instrument": "LME Future",
                "label": "Phantom alert", "direction": "above",
                "threshold_price": 20000.0,
            })
            assert entry.is_triggered is False
            assert entry.current_price is None
        finally:
            db.close()
            engine.dispose()

    def test_risk_pipeline_with_watchlist_evaluation_combined(self):
        """
        Combined E2E: Run the risk pipeline and watchlist evaluation together.
        Verifies that both the risk decision and watchlist thresholds reflect
        the same underlying market_price data from positions.
        """
        from app.services.watchlist_service import create_watchlist_entry

        db, engine = self._make_db_session()
        try:
            # Seed a distressed position: low market_price vs entry_price
            self._seed_position(db, market_price=8900.0)

            # Watchlist: alert when Copper drops below 9000
            entry = create_watchlist_entry(db, {
                "commodity": "Copper", "instrument": "LME Future",
                "label": "Distress signal", "direction": "below",
                "threshold_price": 9000.0,
            })

            # Both the watchlist AND the risk pipeline agree this is a distressed scenario
            positions = [MockRecord(
                commodity="Copper", direction="Long",
                quantity=250, entry_price=9200, market_price=8900,
                counterparty="Exchange A",
            )]
            inventory = [MockRecord(commodity="Copper", location="Rotterdam", available_quantity=600, minimum_required=500, unit="MT")]
            shipments = [MockRecord(commodity="Copper", origin="Chile", destination="Rotterdam", status="In Transit", delay_days=0)]
            counterparties = [MockRecord(name="Exchange A", credit_limit=5_000_000, current_exposure=1_000_000)]

            findings = evaluate_all_rules(positions, inventory, shipments, counterparties)
            scores = compute_scores(findings)

            # Watchlist sees the price drop
            assert entry.is_triggered is True, "Watchlist must trigger when market_price < threshold"

            # Risk pipeline sees negative margin (market_price 8900 < entry_price 9200 for Long)
            margin_findings = [f for f in findings if f.get("rule") == "negative_margin"]
            assert len(margin_findings) >= 1, "Negative margin rule must fire for underwater Long position"
        finally:
            db.close()
            engine.dispose()

