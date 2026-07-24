import os
import json
import pandas as pd
from app.database import SessionLocal, engine, Base
from app.models.entities import PositionModel, InventoryModel, ShipmentModel, CounterpartyModel, RiskLimitModel, MarketEventModel

def seed():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "sample"))

    # Seed Positions
    pos_df = pd.read_csv(os.path.join(base_dir, "positions.csv"))
    for _, row in pos_df.iterrows():
        db.add(PositionModel(
            commodity=str(row['commodity']),
            instrument=str(row['instrument']),
            direction=str(row['direction']),
            quantity=float(row['quantity']),
            unit=str(row['unit']),
            entry_price=float(row['entry_price']),
            market_price=float(row['market_price']),
            currency=str(row.get('currency', 'USD')),
            counterparty=str(row['counterparty']) if 'counterparty' in row and pd.notna(row['counterparty']) else None
        ))

    # Seed Inventory
    inv_df = pd.read_csv(os.path.join(base_dir, "inventory.csv"))
    for _, row in inv_df.iterrows():
        db.add(InventoryModel(
            commodity=str(row['commodity']),
            location=str(row['location']),
            quantity=float(row['quantity']),
            unit=str(row['unit']),
            minimum_required=float(row['minimum_required']),
            available_quantity=float(row['available_quantity'])
        ))

    # Seed Shipments
    shp_df = pd.read_csv(os.path.join(base_dir, "shipments.csv"))
    for _, row in shp_df.iterrows():
        db.add(ShipmentModel(
            commodity=str(row['commodity']),
            origin=str(row['origin']),
            destination=str(row['destination']),
            quantity=float(row['quantity']),
            unit=str(row.get('unit', 'MT')),
            expected_arrival=str(row['expected_arrival']),
            status=str(row['status']),
            delay_days=int(row['delay_days']) if 'delay_days' in row and pd.notna(row['delay_days']) else 0
        ))

    # Seed Counterparties
    cp_df = pd.read_csv(os.path.join(base_dir, "counterparties.csv"))
    for _, row in cp_df.iterrows():
        db.add(CounterpartyModel(
            id=str(row['id']),
            name=str(row['name']),
            credit_limit=float(row['credit_limit']),
            current_exposure=float(row['current_exposure']),
            risk_rating=str(row['risk_rating'])
        ))

    # Seed Risk Limits
    rl_df = pd.read_csv(os.path.join(base_dir, "risk_limits.csv"))
    for _, row in rl_df.iterrows():
        db.add(RiskLimitModel(
            commodity=str(row['commodity']),
            max_position_quantity=float(row['max_position_quantity']),
            max_counterparty_exposure_pct=float(row['max_counterparty_exposure_pct']),
            min_inventory_days=int(row['min_inventory_days'])
        ))

    # Seed Market Events
    with open(os.path.join(base_dir, "market_events.json")) as f:
        events = json.load(f)
        for ev in events:
            db.add(MarketEventModel(
                id=ev['id'],
                commodity=ev['commodity'],
                title=ev['title'],
                impact_level=ev['impact_level'],
                description=ev['description'],
                source=ev['source'],
                date=ev['date']
            ))

    db.commit()
    db.close()
    print("Database successfully seeded with sample commodity data.")

if __name__ == "__main__":
    seed()
