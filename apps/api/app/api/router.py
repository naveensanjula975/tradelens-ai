from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.schemas.entities import DashboardResponse, Position, PositionCreate, Inventory, Shipment, Counterparty, Alert
from app.models.entities import PositionModel, InventoryModel, ShipmentModel, CounterpartyModel, AlertModel
from app.services.dashboard_service import get_dashboard_data_for_commodity
from app.services.import_service import import_positions_csv, import_inventory_csv, import_shipments_csv

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

# INVENTORY
@router.get("/api/inventory", response_model=List[Inventory])
def list_inventory(commodity: str | None = None, db: Session = Depends(get_db)):
    query = db.query(InventoryModel)
    if commodity:
        query = query.filter(InventoryModel.commodity == commodity)
    return query.all()

# SHIPMENTS
@router.get("/api/shipments", response_model=List[Shipment])
def list_shipments(commodity: str | None = None, db: Session = Depends(get_db)):
    query = db.query(ShipmentModel)
    if commodity:
        query = query.filter(ShipmentModel.commodity == commodity)
    return query.all()

# COUNTERPARTIES
@router.get("/api/counterparties", response_model=List[Counterparty])
def list_counterparties(db: Session = Depends(get_db)):
    return db.query(CounterpartyModel).all()

# ALERTS
@router.get("/api/alerts", response_model=List[Alert])
def list_alerts(commodity: str | None = None, db: Session = Depends(get_db)):
    query = db.query(AlertModel)
    if commodity:
        query = query.filter(AlertModel.commodity == commodity)
    return query.all()

# UPLOADS
@router.post("/api/uploads/positions")
async def upload_positions(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    count = import_positions_csv(db, content)
    return {"message": f"Successfully imported {count} positions"}

@router.post("/api/uploads/inventory")
async def upload_inventory(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    count = import_inventory_csv(db, content)
    return {"message": f"Successfully imported {count} inventory records"}

@router.post("/api/uploads/shipments")
async def upload_shipments(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    count = import_shipments_csv(db, content)
    return {"message": f"Successfully imported {count} shipment records"}
