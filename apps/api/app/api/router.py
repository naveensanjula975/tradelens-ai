from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import Callable, List

from app.database import get_db
from app.config import settings
from app.schemas.entities import DashboardResponse, Position, PositionCreate, Inventory, InventoryCreate, Shipment, ShipmentCreate, Counterparty, CounterpartyCreate, Alert
from app.models.entities import PositionModel, InventoryModel, ShipmentModel, CounterpartyModel, AlertModel
from app.services.dashboard_service import get_dashboard_data_for_commodity
from app.services.import_service import ImportValidationError, import_positions_csv, import_inventory_csv, import_shipments_csv

router = APIRouter()
CSV_CONTENT_TYPES = {"text/csv", "application/csv", "application/vnd.ms-excel"}

@router.get("/health")
def health_check():
    return {"status": "ok", "version": "0.1.0"}

@router.get("/api/dashboard", response_model=DashboardResponse)
def get_dashboard(commodity: str = "Copper", db: Session = Depends(get_db)):
    return get_dashboard_data_for_commodity(db, commodity)

@router.get("/api/dashboard/{commodity}", response_model=DashboardResponse)
def get_dashboard_by_commodity(commodity: str, db: Session = Depends(get_db)):
    return get_dashboard_data_for_commodity(db, commodity)

# POSITIONS
@router.get("/api/positions", response_model=List[Position])
def list_positions(commodity: str | None = None, db: Session = Depends(get_db)):
    query = db.query(PositionModel)
    if commodity:
        query = query.filter(PositionModel.commodity == commodity)
    return query.all()

@router.post("/api/positions", response_model=Position)
def create_position(item: PositionCreate, db: Session = Depends(get_db)):
    pos = PositionModel(**item.model_dump())
    db.add(pos)
    db.commit()
    db.refresh(pos)
    return pos

@router.put("/api/positions/{item_id}", response_model=Position)
def update_position(item_id: str, item: PositionCreate, db: Session = Depends(get_db)):
    pos = db.query(PositionModel).filter(PositionModel.id == item_id).first()
    if not pos:
        raise HTTPException(status_code=404, detail="Position not found")
    for k, v in item.model_dump().items():
        setattr(pos, k, v)
    db.commit()
    db.refresh(pos)
    return pos

@router.delete("/api/positions/{item_id}")
def delete_position(item_id: str, db: Session = Depends(get_db)):
    pos = db.query(PositionModel).filter(PositionModel.id == item_id).first()
    if not pos:
        raise HTTPException(status_code=404, detail="Position not found")
    db.delete(pos)
    db.commit()
    return {"message": "Position deleted successfully"}

# INVENTORY
@router.get("/api/inventory", response_model=List[Inventory])
def list_inventory(commodity: str | None = None, db: Session = Depends(get_db)):
    query = db.query(InventoryModel)
    if commodity:
        query = query.filter(InventoryModel.commodity == commodity)
    return query.all()

@router.post("/api/inventory", response_model=Inventory)
def create_inventory(item: InventoryCreate, db: Session = Depends(get_db)):
    inv = InventoryModel(**item.model_dump())
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return inv

@router.put("/api/inventory/{item_id}", response_model=Inventory)
def update_inventory(item_id: str, item: InventoryCreate, db: Session = Depends(get_db)):
    inv = db.query(InventoryModel).filter(InventoryModel.id == item_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Inventory record not found")
    for key, value in item.model_dump().items():
        setattr(inv, key, value)
    db.commit()
    db.refresh(inv)
    return inv

@router.delete("/api/inventory/{item_id}")
def delete_inventory(item_id: str, db: Session = Depends(get_db)):
    inv = db.query(InventoryModel).filter(InventoryModel.id == item_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Inventory record not found")
    db.delete(inv)
    db.commit()
    return {"message": "Inventory record deleted successfully"}

# SHIPMENTS
@router.get("/api/shipments", response_model=List[Shipment])
def list_shipments(commodity: str | None = None, db: Session = Depends(get_db)):
    query = db.query(ShipmentModel)
    if commodity:
        query = query.filter(ShipmentModel.commodity == commodity)
    return query.all()

@router.post("/api/shipments", response_model=Shipment)
def create_shipment(item: ShipmentCreate, db: Session = Depends(get_db)):
    shp = ShipmentModel(**item.model_dump())
    db.add(shp)
    db.commit()
    db.refresh(shp)
    return shp

@router.put("/api/shipments/{item_id}", response_model=Shipment)
def update_shipment(item_id: str, item: ShipmentCreate, db: Session = Depends(get_db)):
    shp = db.query(ShipmentModel).filter(ShipmentModel.id == item_id).first()
    if not shp:
        raise HTTPException(status_code=404, detail="Shipment not found")
    for k, v in item.model_dump().items():
        setattr(shp, k, v)
    db.commit()
    db.refresh(shp)
    return shp

@router.delete("/api/shipments/{item_id}")
def delete_shipment(item_id: str, db: Session = Depends(get_db)):
    shp = db.query(ShipmentModel).filter(ShipmentModel.id == item_id).first()
    if not shp:
        raise HTTPException(status_code=404, detail="Shipment not found")
    db.delete(shp)
    db.commit()
    return {"message": "Shipment deleted successfully"}

# COUNTERPARTIES
@router.get("/api/counterparties", response_model=List[Counterparty])
def list_counterparties(db: Session = Depends(get_db)):
    return db.query(CounterpartyModel).all()

@router.post("/api/counterparties", response_model=Counterparty)
def create_counterparty(item: CounterpartyCreate, db: Session = Depends(get_db)):
    cp = CounterpartyModel(**item.model_dump())
    db.add(cp)
    db.commit()
    db.refresh(cp)
    return cp

@router.put("/api/counterparties/{item_id}", response_model=Counterparty)
def update_counterparty(item_id: str, item: CounterpartyCreate, db: Session = Depends(get_db)):
    cp = db.query(CounterpartyModel).filter(CounterpartyModel.id == item_id).first()
    if not cp:
        raise HTTPException(status_code=404, detail="Counterparty not found")
    for key, value in item.model_dump().items():
        setattr(cp, key, value)
    db.commit()
    db.refresh(cp)
    return cp

@router.delete("/api/counterparties/{item_id}")
def delete_counterparty(item_id: str, db: Session = Depends(get_db)):
    cp = db.query(CounterpartyModel).filter(CounterpartyModel.id == item_id).first()
    if not cp:
        raise HTTPException(status_code=404, detail="Counterparty not found")
    db.delete(cp)
    db.commit()
    return {"message": "Counterparty deleted successfully"}

# ALERTS
@router.get("/api/alerts", response_model=List[Alert])
def list_alerts(commodity: str | None = None, db: Session = Depends(get_db)):
    query = db.query(AlertModel)
    if commodity:
        query = query.filter(AlertModel.commodity == commodity)
    return query.all()

@router.post("/api/alerts/evaluate")
def evaluate_alerts(commodity: str = "Copper", db: Session = Depends(get_db)):
    dashboard = get_dashboard_data_for_commodity(db, commodity)
    return {"commodity": commodity, "evaluated_alerts_count": len(dashboard.alerts)}

# BRIEFS
@router.post("/api/briefs/generate")
def generate_brief_endpoint(commodity: str = "Copper", db: Session = Depends(get_db)):
    dashboard = get_dashboard_data_for_commodity(db, commodity)
    return dashboard.ai_brief

@router.get("/api/briefs/latest")
def get_latest_brief(commodity: str = "Copper", db: Session = Depends(get_db)):
    dashboard = get_dashboard_data_for_commodity(db, commodity)
    return dashboard.ai_brief

@router.post("/api/briefs/export")
def export_brief_endpoint(commodity: str = "Copper", db: Session = Depends(get_db)):
    from app.ai.brief_generator import export_brief_to_markdown
    dashboard = get_dashboard_data_for_commodity(db, commodity)
    md_text = export_brief_to_markdown(
        commodity=commodity,
        market_state=dashboard.decision.market_state,
        permission=dashboard.decision.permission,
        risk_score=dashboard.decision.risk_score,
        evidence_score=dashboard.decision.evidence_score,
        brief=dashboard.ai_brief.model_dump()
    )
    return {"commodity": commodity, "content": md_text}

# UPLOADS
async def _process_csv_upload(
    file: UploadFile,
    file_type: str,
    importer: Callable[[Session, bytes], int],
    db: Session,
):
    filename = file.filename or ""
    if not filename.lower().endswith(".csv") and file.content_type not in CSV_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail={
            "message": "CSV validation failed",
            "errors": [{
                "row": 1,
                "column": "file",
                "code": "invalid_file_type",
                "message": "Upload must be a CSV file",
            }],
        })

    content = await file.read(settings.MAX_CSV_UPLOAD_BYTES + 1)
    if len(content) > settings.MAX_CSV_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail={
            "message": "CSV upload is too large",
            "errors": [{
                "row": 1,
                "column": "file",
                "code": "file_too_large",
                "message": f"CSV file must not exceed {settings.MAX_CSV_UPLOAD_BYTES} bytes",
            }],
        })

    try:
        count = importer(db, content)
    except ImportValidationError as exc:
        raise HTTPException(status_code=400, detail=exc.to_detail()) from exc

    return {
        "message": "Import completed",
        "imported_count": count,
        "file_type": file_type,
    }


@router.post("/api/uploads/positions")
async def upload_positions(file: UploadFile = File(...), db: Session = Depends(get_db)):
    return await _process_csv_upload(file, "positions", import_positions_csv, db)

@router.post("/api/uploads/inventory")
async def upload_inventory(file: UploadFile = File(...), db: Session = Depends(get_db)):
    return await _process_csv_upload(file, "inventory", import_inventory_csv, db)

@router.post("/api/uploads/shipments")
async def upload_shipments(file: UploadFile = File(...), db: Session = Depends(get_db)):
    return await _process_csv_upload(file, "shipments", import_shipments_csv, db)

# SNAPSHOT TASKS
@router.post("/api/snapshots/run")
def run_all_snapshots(db: Session = Depends(get_db)):
    from app.tasks.snapshots import snapshot_all_commodities
    results = snapshot_all_commodities(db)
    return {"message": "Snapshot run completed", "results": results}

@router.delete("/api/snapshots/purge")
def purge_snapshots(keep_last_n: int = 50, db: Session = Depends(get_db)):
    from app.tasks.snapshots import purge_old_snapshots
    deleted = purge_old_snapshots(db, keep_last_n=keep_last_n)
    return {"message": f"Purged {deleted} old snapshot records"}

# DECISION HISTORY
@router.get("/api/decision-history")
def get_decision_history(commodity: str = "Copper", limit: int = 20, db: Session = Depends(get_db)):
    from app.models.entities import DecisionSnapshotModel
    rows = (
        db.query(DecisionSnapshotModel)
        .filter(DecisionSnapshotModel.commodity == commodity)
        .order_by(DecisionSnapshotModel.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": r.id,
            "commodity": r.commodity,
            "market_state": r.market_state,
            "permission": r.permission,
            "evidence_score": r.evidence_score,
            "risk_score": r.risk_score,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


# MARKET EVENTS
@router.get("/api/market-events")
def list_market_events(commodity: str | None = None, limit: int = 50, db: Session = Depends(get_db)):
    from app.models.entities import MarketEventModel
    q = db.query(MarketEventModel)
    if commodity:
        q = q.filter(MarketEventModel.commodity == commodity)
    return q.order_by(MarketEventModel.date.desc()).limit(limit).all()

@router.post("/api/market-events")
def create_market_event(data: dict, db: Session = Depends(get_db)):
    from app.models.entities import MarketEventModel
    event = MarketEventModel(**data)
    db.add(event)
    db.commit()
    db.refresh(event)
    return event

@router.delete("/api/market-events/{event_id}")
def delete_market_event(event_id: str, db: Session = Depends(get_db)):
    from app.models.entities import MarketEventModel
    event = db.query(MarketEventModel).filter(MarketEventModel.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Market event not found")
    db.delete(event)
    db.commit()
    return {"message": "Market event deleted successfully"}


# RISK LIMITS
@router.get("/api/risk-limits")
def list_risk_limits(db: Session = Depends(get_db)):
    from app.models.entities import RiskLimitModel
    return db.query(RiskLimitModel).all()

@router.put("/api/risk-limits/{commodity}")
def upsert_risk_limit(commodity: str, data: dict, db: Session = Depends(get_db)):
    from app.models.entities import RiskLimitModel
    limit = db.query(RiskLimitModel).filter(RiskLimitModel.commodity == commodity).first()
    if limit:
        for k, v in data.items():
            if k != "commodity":
                setattr(limit, k, v)
    else:
        limit = RiskLimitModel(commodity=commodity, **{k: v for k, v in data.items() if k != "commodity"})
        db.add(limit)
    db.commit()
    db.refresh(limit)
    return limit


# SCENARIO SIMULATION
@router.post("/api/simulation/evaluate")
def evaluate_scenario_simulation(payload: dict, db: Session = Depends(get_db)):
    from app.engines.simulation.simulator import run_scenario_simulation
    commodity = payload.get("commodity", "Copper")
    price_shift_pct = float(payload.get("price_shift_pct", 0.0))
    inventory_shift_pct = float(payload.get("inventory_shift_pct", 0.0))
    added_shipment_delay_days = int(payload.get("added_shipment_delay_days", 0))
    counterparty_exposure_shift_pct = float(payload.get("counterparty_exposure_shift_pct", 0.0))

    return run_scenario_simulation(
        db,
        commodity=commodity,
        price_shift_pct=price_shift_pct,
        inventory_shift_pct=inventory_shift_pct,
        added_shipment_delay_days=added_shipment_delay_days,
        counterparty_exposure_shift_pct=counterparty_exposure_shift_pct,
    )
