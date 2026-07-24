import io
import pandas as pd
from sqlalchemy.orm import Session
from app.models.entities import PositionModel, InventoryModel, ShipmentModel, CounterpartyModel

def import_positions_csv(db: Session, content: bytes):
    df = pd.read_csv(io.BytesIO(content))
    records = []
    for _, row in df.iterrows():
        pos = PositionModel(
            commodity=str(row['commodity']),
            instrument=str(row['instrument']),
            direction=str(row['direction']),
            quantity=float(row['quantity']),
            unit=str(row['unit']),
            entry_price=float(row['entry_price']),
            market_price=float(row['market_price']),
            currency=str(row.get('currency', 'USD')),
            counterparty=str(row['counterparty']) if 'counterparty' in row and pd.notna(row['counterparty']) else None
        )
        db.add(pos)
        records.append(pos)
    db.commit()
    return len(records)

def import_inventory_csv(db: Session, content: bytes):
    df = pd.read_csv(io.BytesIO(content))
    records = []
    for _, row in df.iterrows():
        inv = InventoryModel(
            commodity=str(row['commodity']),
            location=str(row['location']),
            quantity=float(row['quantity']),
            unit=str(row['unit']),
            minimum_required=float(row['minimum_required']),
            available_quantity=float(row['available_quantity'])
        )
        db.add(inv)
        records.append(inv)
    db.commit()
    return len(records)

def import_shipments_csv(db: Session, content: bytes):
    df = pd.read_csv(io.BytesIO(content))
    records = []
    for _, row in df.iterrows():
        shp = ShipmentModel(
            commodity=str(row['commodity']),
            origin=str(row['origin']),
            destination=str(row['destination']),
            quantity=float(row['quantity']),
            unit=str(row.get('unit', 'MT')),
            expected_arrival=str(row['expected_arrival']),
            status=str(row['status']),
            delay_days=int(row['delay_days']) if 'delay_days' in row and pd.notna(row['delay_days']) else 0
        )
        db.add(shp)
        records.append(shp)
    db.commit()
    return len(records)
