"""
Analytics Service for TradeLens AI.

Provides cross-commodity portfolio analytics, aggregated exposure metrics,
inventory coverage comparisons, and risk score distributions.
"""

from __future__ import annotations

from typing import Any
from sqlalchemy.orm import Session

from app.models.entities import PositionModel, InventoryModel, ShipmentModel, CounterpartyModel
from app.services.dashboard_service import get_dashboard_data_for_commodity

COMMODITIES = ["Copper", "Aluminium", "Zinc", "Nickel"]


def get_portfolio_analytics_summary(db: Session) -> dict[str, Any]:
    """
    Compute cross-commodity portfolio analytics summary across Copper, Aluminium, Zinc, and Nickel.
    """
    commodity_summaries = []
    total_portfolio_exposure_usd = 0.0
    status_counts = {"Allowed": 0, "Limited": 0, "Blocked": 0, "Review Required": 0}

    for commodity in COMMODITIES:
        dash = get_dashboard_data_for_commodity(db, commodity)

        # Net position quantity & market value
        long_qty = sum(p.quantity for p in dash.positions if p.direction.casefold() == "long")
        short_qty = sum(p.quantity for p in dash.positions if p.direction.casefold() == "short")
        net_qty = long_qty - short_qty

        mtm_val = sum(
            (p.quantity * p.market_price if p.direction.casefold() == "long" else -p.quantity * p.market_price)
            for p in dash.positions
        )
        total_portfolio_exposure_usd += abs(mtm_val)

        # Inventory metrics
        total_inv_avail = sum(i.available_quantity for i in dash.inventory)
        total_inv_req = sum(i.minimum_required for i in dash.inventory)
        inv_coverage_pct = round((total_inv_avail / total_inv_req * 100), 1) if total_inv_req > 0 else 100.0

        # Shipment metrics
        in_transit_count = sum(1 for s in dash.shipments if s.status.casefold() == "in transit")
        delayed_count = sum(1 for s in dash.shipments if s.delay_days > 0)

        # Alerts breakdown
        high_alerts = sum(1 for a in dash.alerts if a.severity == "high")
        medium_alerts = sum(1 for a in dash.alerts if a.severity == "medium")

        perm = dash.decision.permission
        if perm in status_counts:
            status_counts[perm] += 1

        commodity_summaries.append({
            "commodity": commodity,
            "permission": perm,
            "market_state": dash.decision.market_state,
            "risk_score": dash.decision.risk_score,
            "evidence_score": dash.decision.evidence_score,
            "net_quantity_mt": round(net_qty, 1),
            "mtm_value_usd": round(mtm_val, 2),
            "available_inventory_mt": round(total_inv_avail, 1),
            "inventory_coverage_pct": inv_coverage_pct,
            "in_transit_shipments": in_transit_count,
            "delayed_shipments": delayed_count,
            "high_alerts": high_alerts,
            "medium_alerts": medium_alerts,
        })

    # Counterparty portfolio totals
    cps = db.query(CounterpartyModel).all()
    total_credit_limit = sum(cp.credit_limit for cp in cps)
    total_current_exposure = sum(cp.current_exposure for cp in cps)
    overall_credit_utilization_pct = round((total_current_exposure / total_credit_limit * 100), 1) if total_credit_limit > 0 else 0.0

    # Identify highest risk commodity
    highest_risk = max(commodity_summaries, key=lambda c: c["risk_score"]) if commodity_summaries else None

    return {
        "total_portfolio_exposure_usd": round(total_portfolio_exposure_usd, 2),
        "total_credit_limit_usd": round(total_credit_limit, 2),
        "total_current_exposure_usd": round(total_current_exposure, 2),
        "overall_credit_utilization_pct": overall_credit_utilization_pct,
        "highest_risk_commodity": highest_risk["commodity"] if highest_risk else "None",
        "permission_status_counts": status_counts,
        "commodities": commodity_summaries,
    }
