"""
Repository layer for TradeLens AI.

Provides a clean data-access abstraction above SQLAlchemy session queries.
All business logic and risk evaluation is kept in services/engines.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.entities import (
    AlertModel,
    CounterpartyModel,
    InventoryModel,
    PositionModel,
    RiskLimitModel,
    ShipmentModel,
    MarketEventModel,
)


class PositionRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def list(self, commodity: str | None = None) -> list[PositionModel]:
        q = self._db.query(PositionModel)
        if commodity:
            q = q.filter(PositionModel.commodity == commodity)
        return q.all()

    def get(self, position_id: str) -> PositionModel | None:
        return self._db.query(PositionModel).filter(PositionModel.id == position_id).first()

    def create(self, **kwargs) -> PositionModel:
        obj = PositionModel(**kwargs)
        self._db.add(obj)
        self._db.commit()
        self._db.refresh(obj)
        return obj

    def update(self, position_id: str, **kwargs) -> PositionModel | None:
        obj = self.get(position_id)
        if obj is None:
            return None
        for k, v in kwargs.items():
            setattr(obj, k, v)
        self._db.commit()
        self._db.refresh(obj)
        return obj

    def delete(self, position_id: str) -> bool:
        obj = self.get(position_id)
        if obj is None:
            return False
        self._db.delete(obj)
        self._db.commit()
        return True


class InventoryRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def list(self, commodity: str | None = None) -> list[InventoryModel]:
        q = self._db.query(InventoryModel)
        if commodity:
            q = q.filter(InventoryModel.commodity == commodity)
        return q.all()

    def get(self, item_id: str) -> InventoryModel | None:
        return self._db.query(InventoryModel).filter(InventoryModel.id == item_id).first()

    def create(self, **kwargs) -> InventoryModel:
        obj = InventoryModel(**kwargs)
        self._db.add(obj)
        self._db.commit()
        self._db.refresh(obj)
        return obj

    def update(self, item_id: str, **kwargs) -> InventoryModel | None:
        obj = self.get(item_id)
        if obj is None:
            return None
        for k, v in kwargs.items():
            setattr(obj, k, v)
        self._db.commit()
        self._db.refresh(obj)
        return obj

    def delete(self, item_id: str) -> bool:
        obj = self.get(item_id)
        if obj is None:
            return False
        self._db.delete(obj)
        self._db.commit()
        return True


class ShipmentRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def list(self, commodity: str | None = None) -> list[ShipmentModel]:
        q = self._db.query(ShipmentModel)
        if commodity:
            q = q.filter(ShipmentModel.commodity == commodity)
        return q.all()

    def get(self, item_id: str) -> ShipmentModel | None:
        return self._db.query(ShipmentModel).filter(ShipmentModel.id == item_id).first()

    def create(self, **kwargs) -> ShipmentModel:
        obj = ShipmentModel(**kwargs)
        self._db.add(obj)
        self._db.commit()
        self._db.refresh(obj)
        return obj

    def update(self, item_id: str, **kwargs) -> ShipmentModel | None:
        obj = self.get(item_id)
        if obj is None:
            return None
        for k, v in kwargs.items():
            setattr(obj, k, v)
        self._db.commit()
        self._db.refresh(obj)
        return obj

    def delete(self, item_id: str) -> bool:
        obj = self.get(item_id)
        if obj is None:
            return False
        self._db.delete(obj)
        self._db.commit()
        return True


class CounterpartyRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def list(self) -> list[CounterpartyModel]:
        return self._db.query(CounterpartyModel).all()

    def get(self, item_id: str) -> CounterpartyModel | None:
        return self._db.query(CounterpartyModel).filter(CounterpartyModel.id == item_id).first()

    def create(self, **kwargs) -> CounterpartyModel:
        obj = CounterpartyModel(**kwargs)
        self._db.add(obj)
        self._db.commit()
        self._db.refresh(obj)
        return obj

    def update(self, item_id: str, **kwargs) -> CounterpartyModel | None:
        obj = self.get(item_id)
        if obj is None:
            return None
        for k, v in kwargs.items():
            setattr(obj, k, v)
        self._db.commit()
        self._db.refresh(obj)
        return obj

    def delete(self, item_id: str) -> bool:
        obj = self.get(item_id)
        if obj is None:
            return False
        self._db.delete(obj)
        self._db.commit()
        return True


class AlertRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def list(self, commodity: str | None = None) -> list[AlertModel]:
        q = self._db.query(AlertModel)
        if commodity:
            q = q.filter(AlertModel.commodity == commodity)
        return q.order_by(AlertModel.created_at.desc()).all()

    def clear_for_commodity(self, commodity: str) -> None:
        self._db.query(AlertModel).filter(AlertModel.commodity == commodity).delete()
        self._db.flush()


class RiskLimitRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def get_for_commodity(self, commodity: str) -> RiskLimitModel | None:
        return self._db.query(RiskLimitModel).filter(RiskLimitModel.commodity == commodity).first()


class MarketEventRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def list(self, commodity: str | None = None) -> list[MarketEventModel]:
        q = self._db.query(MarketEventModel)
        if commodity:
            q = q.filter(MarketEventModel.commodity == commodity)
        return q.order_by(MarketEventModel.date.desc()).all()
