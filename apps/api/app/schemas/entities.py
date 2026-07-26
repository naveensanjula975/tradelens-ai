import re
from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, field_validator, model_validator


ISO_DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _required_text(value: object) -> str:
    if value is None:
        raise ValueError("Value must not be blank")
    text = str(value).strip()
    if not text:
        raise ValueError("Value must not be blank")
    return text


def _positive_number(value: float) -> float:
    if value <= 0:
        raise ValueError("Value must be greater than zero")
    return value


def _non_negative_number(value: float) -> float:
    if value < 0:
        raise ValueError("Value must be non-negative")
    return value

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

    @field_validator("commodity", "instrument", "unit", "currency", mode="before")
    @classmethod
    def validate_required_text(cls, value: object) -> str:
        return _required_text(value)

    @field_validator("direction", mode="before")
    @classmethod
    def validate_direction(cls, value: object) -> str:
        directions = {"long": "Long", "short": "Short"}
        direction = directions.get(_required_text(value).casefold())
        if direction is None:
            raise ValueError("Direction must be Long or Short")
        return direction

    @field_validator("quantity", "entry_price", "market_price")
    @classmethod
    def validate_positive_numbers(cls, value: float) -> float:
        return _positive_number(value)

    @field_validator("counterparty", mode="before")
    @classmethod
    def normalize_counterparty(cls, value: object | None) -> str | None:
        if value is None:
            return None
        return str(value).strip() or None

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

    @field_validator("commodity", "location", "unit", mode="before")
    @classmethod
    def validate_required_text(cls, value: object) -> str:
        return _required_text(value)

    @field_validator("quantity", "minimum_required", "available_quantity")
    @classmethod
    def validate_non_negative_numbers(cls, value: float) -> float:
        return _non_negative_number(value)

    @model_validator(mode="after")
    def validate_available_quantity(self):
        if self.available_quantity > self.quantity:
            raise ValueError("Available quantity cannot exceed quantity")
        return self

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

    @field_validator("commodity", "origin", "destination", "unit", "status", mode="before")
    @classmethod
    def validate_required_text(cls, value: object) -> str:
        return _required_text(value)

    @field_validator("quantity")
    @classmethod
    def validate_quantity(cls, value: float) -> float:
        return _positive_number(value)

    @field_validator("expected_arrival", mode="before")
    @classmethod
    def validate_expected_arrival(cls, value: object) -> str:
        expected_arrival = _required_text(value)
        try:
            if not ISO_DATE_PATTERN.fullmatch(expected_arrival):
                raise ValueError
            date.fromisoformat(expected_arrival)
        except ValueError as exc:
            raise ValueError(
                "Expected arrival must be a valid date in YYYY-MM-DD format"
            ) from exc
        return expected_arrival

    @field_validator("delay_days")
    @classmethod
    def validate_delay_days(cls, value: int) -> int:
        if value < 0:
            raise ValueError("Delay days must be non-negative")
        return value

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

    @field_validator("name", "risk_rating", mode="before")
    @classmethod
    def validate_required_text(cls, value: object) -> str:
        return _required_text(value)

    @field_validator("credit_limit")
    @classmethod
    def validate_credit_limit(cls, value: float) -> float:
        return _positive_number(value)

    @field_validator("current_exposure")
    @classmethod
    def validate_current_exposure(cls, value: float) -> float:
        return _non_negative_number(value)

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
