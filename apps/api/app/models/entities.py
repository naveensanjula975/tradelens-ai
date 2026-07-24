import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, DateTime, JSON, ForeignKey
from app.database import Base

def gen_id():
    return str(uuid.uuid4())

class PositionModel(Base):
    __tablename__ = "positions"

    id = Column(String, primary_key=True, default=gen_id)
    commodity = Column(String, nullable=False, index=True)
    instrument = Column(String, nullable=False)
    direction = Column(String, nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String, nullable=False)
    entry_price = Column(Float, nullable=False)
    market_price = Column(Float, nullable=False)
    currency = Column(String, default="USD")
    counterparty = Column(String, nullable=True)

class InventoryModel(Base):
    __tablename__ = "inventory"

    id = Column(String, primary_key=True, default=gen_id)
    commodity = Column(String, nullable=False, index=True)
    location = Column(String, nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String, nullable=False)
    minimum_required = Column(Float, nullable=False)
    available_quantity = Column(Float, nullable=False)

class ShipmentModel(Base):
    __tablename__ = "shipments"

    id = Column(String, primary_key=True, default=gen_id)
    commodity = Column(String, nullable=False, index=True)
    origin = Column(String, nullable=False)
    destination = Column(String, nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String, default="MT")
    expected_arrival = Column(String, nullable=False)
    status = Column(String, nullable=False)
    delay_days = Column(Integer, default=0)

class CounterpartyModel(Base):
    __tablename__ = "counterparties"

    id = Column(String, primary_key=True, default=gen_id)
    name = Column(String, nullable=False)
    credit_limit = Column(Float, nullable=False)
    current_exposure = Column(Float, nullable=False)
    risk_rating = Column(String, nullable=False)

class MarketEventModel(Base):
    __tablename__ = "market_events"

    id = Column(String, primary_key=True, default=gen_id)
    commodity = Column(String, nullable=False, index=True)
    title = Column(String, nullable=False)
    impact_level = Column(String, nullable=False)
    description = Column(String, nullable=False)
    source = Column(String, nullable=False)
    date = Column(String, nullable=False)

class RiskLimitModel(Base):
    __tablename__ = "risk_limits"

    id = Column(String, primary_key=True, default=gen_id)
    commodity = Column(String, nullable=False, unique=True, index=True)
    max_position_quantity = Column(Float, nullable=False)
    max_counterparty_exposure_pct = Column(Float, nullable=False)
    min_inventory_days = Column(Integer, nullable=False)

class AlertModel(Base):
    __tablename__ = "alerts"

    id = Column(String, primary_key=True, default=gen_id)
    commodity = Column(String, nullable=False, index=True)
    category = Column(String, nullable=False)
    severity = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    evidence = Column(JSON, default=list)
    recommended_action = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class DecisionSnapshotModel(Base):
    __tablename__ = "decision_snapshots"

    id = Column(String, primary_key=True, default=gen_id)
    commodity = Column(String, nullable=False, index=True)
    market_state = Column(String, nullable=False)
    permission = Column(String, nullable=False)
    evidence_score = Column(Integer, nullable=False)
    risk_score = Column(Integer, nullable=False)
    confidence_score = Column(Integer, default=90)
    summary = Column(String, nullable=False)
    supporting_evidence = Column(JSON, default=list)
    blocking_factors = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)

class AIBriefModel(Base):
    __tablename__ = "ai_briefs"

    id = Column(String, primary_key=True, default=gen_id)
    commodity = Column(String, nullable=False, index=True)
    headline = Column(String, nullable=False)
    summary = Column(String, nullable=False)
    why = Column(JSON, default=list)
    next_actions = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)
