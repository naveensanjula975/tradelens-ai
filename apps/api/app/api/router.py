from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.schemas.entities import DashboardResponse, Position, PositionCreate, Inventory, InventoryCreate, Shipment, ShipmentCreate, Counterparty, CounterpartyCreate, Alert
from app.models.entities import PositionModel, InventoryModel, ShipmentModel, CounterpartyModel, AlertModel
from app.services.dashboard_service import get_dashboard_data_for_commodity
from app.services.import_service import ImportValidationError, import_positions_csv, import_inventory_csv, import_shipments_csv

router = APIRouter()

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
@router.post("/api/uploads/positions")
async def upload_positions(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    try:
        count = import_positions_csv(db, content)
    except ImportValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"message": f"Successfully imported {count} positions"}

@router.post("/api/uploads/inventory")
async def upload_inventory(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    try:
        count = import_inventory_csv(db, content)
    except ImportValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"message": f"Successfully imported {count} inventory records"}

@router.post("/api/uploads/shipments")
async def upload_shipments(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    try:
        count = import_shipments_csv(db, content)
    except ImportValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"message": f"Successfully imported {count} shipment records"}
