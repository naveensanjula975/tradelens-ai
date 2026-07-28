"""
Scenario Simulation Engine for TradeLens AI.

Allows commodity risk managers to run "What-If" stress tests by applying
hypothetical shocks (price shifts, inventory drops, shipment delays, credit
exposure increases) and comparing simulated risk decisions against current baseline.
"""

from __future__ import annotations

import copy
from typing import Any
from sqlalchemy.orm import Session

from app.models.entities import PositionModel, InventoryModel, ShipmentModel, CounterpartyModel, RiskLimitModel
from app.engines.risk.rules import evaluate_all_rules
from app.engines.evidence.scoring import compute_scores
from app.engines.state.classifications import classify_market_state
from app.engines.permission.policies import determine_permission


def run_scenario_simulation(
    db: Session,
    commodity: str = "Copper",
    price_shift_pct: float = 0.0,
    inventory_shift_pct: float = 0.0,
    added_shipment_delay_days: int = 0,
    counterparty_exposure_shift_pct: float = 0.0,
) -> dict[str, Any]:
    """
    Run a what-if stress test simulation against baseline data.
    Returns comparison between baseline decision and simulated decision.
    """
    # Fetch baseline records
    positions = db.query(PositionModel).filter(PositionModel.commodity == commodity).all()
    inventory = db.query(InventoryModel).filter(InventoryModel.commodity == commodity).all()
    shipments = db.query(ShipmentModel).filter(ShipmentModel.commodity == commodity).all()
    counterparties = db.query(CounterpartyModel).all()
    risk_limit = db.query(RiskLimitModel).filter(RiskLimitModel.commodity == commodity).first()

    # 1. Baseline Evaluation
    base_findings = evaluate_all_rules(positions, inventory, shipments, counterparties, risk_limit)
    base_scores = compute_scores(base_findings)
    base_state = classify_market_state(base_findings)
    base_critical = sum(1 for f in base_findings if f.get("severity") == "high")
    base_permission = determine_permission(base_scores["evidence_score"], base_scores["risk_score"], base_critical)

    # 2. Build Simulated Copies
    sim_positions = []
    for p in positions:
        cp = copy.copy(p)
        if price_shift_pct != 0.0 and cp.market_price:
            cp.market_price = max(0.01, round(cp.market_price * (1 + price_shift_pct / 100.0), 2))
        sim_positions.append(cp)

    sim_inventory = []
    for inv in inventory:
        cinv = copy.copy(inv)
        if inventory_shift_pct != 0.0:
            cinv.available_quantity = max(0.0, round(cinv.available_quantity * (1 + inventory_shift_pct / 100.0), 2))
        sim_inventory.append(cinv)

    sim_shipments = []
    for s in shipments:
        cs = copy.copy(s)
        if added_shipment_delay_days != 0:
            cs.delay_days = max(0, cs.delay_days + added_shipment_delay_days)
        sim_shipments.append(cs)

    sim_counterparties = []
    for cp in counterparties:
        ccp = copy.copy(cp)
        if counterparty_exposure_shift_pct != 0.0:
            ccp.current_exposure = max(0.0, round(ccp.current_exposure * (1 + counterparty_exposure_shift_pct / 100.0), 2))
        sim_counterparties.append(ccp)

    # 3. Simulated Evaluation
    sim_findings = evaluate_all_rules(sim_positions, sim_inventory, sim_shipments, sim_counterparties, risk_limit)
    sim_scores = compute_scores(sim_findings)
    sim_state = classify_market_state(sim_findings)
    sim_critical = sum(1 for f in sim_findings if f.get("severity") == "high")
    sim_permission = determine_permission(sim_scores["evidence_score"], sim_scores["risk_score"], sim_critical)

    # 4. Assemble Comparison Payload
    return {
        "commodity": commodity,
        "parameters": {
            "price_shift_pct": price_shift_pct,
            "inventory_shift_pct": inventory_shift_pct,
            "added_shipment_delay_days": added_shipment_delay_days,
            "counterparty_exposure_shift_pct": counterparty_exposure_shift_pct,
        },
        "baseline": {
            "permission": base_permission,
            "market_state": base_state,
            "evidence_score": base_scores["evidence_score"],
            "risk_score": base_scores["risk_score"],
            "findings_count": len(base_findings),
            "critical_findings_count": base_critical,
        },
        "simulated": {
            "permission": sim_permission,
            "market_state": sim_state,
            "evidence_score": sim_scores["evidence_score"],
            "risk_score": sim_scores["risk_score"],
            "findings_count": len(sim_findings),
            "critical_findings_count": sim_critical,
        },
        "delta": {
            "risk_score_change": sim_scores["risk_score"] - base_scores["risk_score"],
            "evidence_score_change": sim_scores["evidence_score"] - base_scores["evidence_score"],
            "permission_changed": sim_permission != base_permission,
            "new_findings": [f for f in sim_findings if f not in base_findings],
        },
    }
