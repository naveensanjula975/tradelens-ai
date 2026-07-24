from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class PositionBase(BaseModel):
    commodity: str
    instrument: str
    direction: str
    quantity: float
    unit: str
    entry_price: float
    market_price: float
    currency: str = "USD"
    counterparty: Optional[str] = None

class PositionCreate(PositionBase):
    pass

class Position(PositionBase):
    id: str

    class Config:
        from_attributes = True

class InventoryBase(BaseModel):
    commodity: str
    location: str
    quantity: float
    unit: str
    minimum_required: float
    available_quantity: float

class InventoryCreate(InventoryBase):
    pass

class Inventory(InventoryBase):
    id: str

    class Config:
        from_attributes = True

class ShipmentBase(BaseModel):
    commodity: str
    origin: str
    destination: str
    quantity: float
    unit: str = "MT"
    expected_arrival: str
    status: str
    delay_days: int = 0

class ShipmentCreate(ShipmentBase):
    pass

class Shipment(ShipmentBase):
    id: str

    class Config:
        from_attributes = True

class CounterpartyBase(BaseModel):
    name: str
    credit_limit: float
    current_exposure: float
    risk_rating: str

class CounterpartyCreate(CounterpartyBase):
    pass

class Counterparty(CounterpartyBase):
    id: str

    class Config:
        from_attributes = True

class AlertBase(BaseModel):
    commodity: str
    category: str
    severity: str
    title: str
    description: str
    evidence: List[str] = []
    recommended_action: Optional[str] = None

class Alert(AlertBase):
    id: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class DecisionSnapshot(BaseModel):
    commodity: str
    market_state: str
    permission: str
    evidence_score: int
    risk_score: int
    confidence_score: int = 90
    summary: str
    supporting_evidence: List[str] = []
    blocking_factors: List[str] = []
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class AIBrief(BaseModel):
    headline: str
    summary: str
    why: List[str]
    next_actions: List[str]

class DashboardResponse(BaseModel):
    commodity: str
    decision: DecisionSnapshot
    ai_brief: AIBrief
    alerts: List[Alert]
    positions: List[Position]
    inventory: List[Inventory]
    shipments: List[Shipment]
    counterparties: List[Counterparty]
