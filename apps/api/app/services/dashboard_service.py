from sqlalchemy.orm import Session
from app.models.entities import PositionModel, InventoryModel, ShipmentModel, CounterpartyModel, RiskLimitModel, AlertModel, DecisionSnapshotModel
from app.engines.risk.rules import evaluate_all_rules, calculate_scores
from app.engines.state.classifications import classify_market_state
from app.engines.permission.policies import determine_permission
from app.ai.brief_generator import generate_ai_brief
from app.schemas.entities import DashboardResponse, DecisionSnapshot, AIBrief, Alert, Position, Inventory, Shipment, Counterparty

def get_dashboard_data_for_commodity(db: Session, commodity: str = "Copper") -> DashboardResponse:
    positions = db.query(PositionModel).filter(PositionModel.commodity == commodity).all()
    inventory = db.query(InventoryModel).filter(InventoryModel.commodity == commodity).all()
    shipments = db.query(ShipmentModel).filter(ShipmentModel.commodity == commodity).all()
    counterparties = db.query(CounterpartyModel).all()
    risk_limit = db.query(RiskLimitModel).filter(RiskLimitModel.commodity == commodity).first()

    findings = evaluate_all_rules(positions, inventory, shipments, counterparties, risk_limit)
    scores = calculate_scores(findings)
    market_state = classify_market_state(findings)

    # Save/refresh alerts
    db.query(AlertModel).filter(AlertModel.commodity == commodity).delete()
    alerts_list = []
    critical_alerts_count = 0

    for f in findings:
        if f["severity"] == "high":
            critical_alerts_count += 1
        
        alert_obj = AlertModel(
            commodity=commodity,
            category=f["category"],
            severity=f["severity"],
            title=f.get("rule", "Risk Finding").replace("_", " ").title(),
            description=f["message"],
            evidence=[f["message"]],
            recommended_action=f.get("action")
        )
        db.add(alert_obj)
        alerts_list.append(alert_obj)
    
    db.commit()

    permission = determine_permission(scores["evidence_score"], scores["risk_score"], critical_alerts_count)

    supporting_evidence = [f["message"] for f in findings if f["severity"] != "high"]
    blocking_factors = [f["message"] for f in findings if f["severity"] == "high"]
    if not blocking_factors and permission in ["Blocked", "Review Required"]:
        blocking_factors = [f"Overall risk score ({scores['risk_score']}/100) exceeds tolerance limits."]

    summary_text = f"Increasing exposure is {permission.lower()} due to {market_state.lower()} conditions."
    
    snapshot = DecisionSnapshot(
        commodity=commodity,
        market_state=market_state,
        permission=permission,
        evidence_score=scores["evidence_score"],
        risk_score=scores["risk_score"],
        confidence_score=92,
        summary=summary_text,
        supporting_evidence=supporting_evidence,
        blocking_factors=blocking_factors
    )

    alerts_json = [{"severity": a.severity, "title": a.title, "description": a.description} for a a in alerts_list]
    ai_brief_dict = generate_ai_brief(commodity, market_state, permission, scores["risk_score"], scores["evidence_score"], alerts_json)

    return DashboardResponse(
        commodity=commodity,
        decision=snapshot,
        ai_brief=AIBrief(**ai_brief_dict),
        alerts=[Alert.model_validate(a) for a in alerts_list],
        positions=[Position.model_validate(p) for p in positions],
        inventory=[Inventory.model_validate(i) for i in inventory],
        shipments=[Shipment.model_validate(s) for s in shipments],
        counterparties=[Counterparty.model_validate(c) for c in counterparties]
    )
