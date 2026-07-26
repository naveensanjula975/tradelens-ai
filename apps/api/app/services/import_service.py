import io
import pandas as pd
from sqlalchemy.orm import Session
from app.models.entities import PositionModel, InventoryModel, ShipmentModel, CounterpartyModel


class ImportValidationError(ValueError):
    pass


def _read_csv(content: bytes):
    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception as exc:
        raise ImportValidationError(f"Could not parse CSV file: {exc}") from exc

    if df.empty:
        raise ImportValidationError("CSV file is empty")

    return df


def _validate_required_columns(df, required_columns, file_type):
    missing = [col for col in required_columns if col not in df.columns]
    if missing:
        raise ImportValidationError(
            f"Missing required columns for {file_type} import: {', '.join(missing)}"
        )


def _require_non_empty_value(row, column, row_number):
    value = row[column]
    if pd.isna(value) or str(value).strip() == "":
        raise ImportValidationError(
            f"Row {row_number} is missing a value for required column '{column}'"
        )
    return value


def _coerce_float(value, column, row_number):
    try:
        return float(value)
    except (TypeError, ValueError) as exc:
        raise ImportValidationError(
            f"Row {row_number} has an invalid numeric value for '{column}': {value}"
        ) from exc


def import_positions_csv(db: Session, content: bytes):
    df = _read_csv(content)
    _validate_required_columns(df, ["commodity", "instrument", "direction", "quantity", "unit", "entry_price", "market_price"], "positions")

    records = []
    for idx, row in df.iterrows():
        row_number = idx + 2
        commodity = str(_require_non_empty_value(row, "commodity", row_number))
        instrument = str(_require_non_empty_value(row, "instrument", row_number))
        direction = str(_require_non_empty_value(row, "direction", row_number))
        unit = str(_require_non_empty_value(row, "unit", row_number))
        entry_price = _coerce_float(_require_non_empty_value(row, "entry_price", row_number), "entry_price", row_number)
        market_price = _coerce_float(_require_non_empty_value(row, "market_price", row_number), "market_price", row_number)
        quantity = _coerce_float(_require_non_empty_value(row, "quantity", row_number), "quantity", row_number)
        currency = str(row.get("currency", "USD")) if "currency" in row and pd.notna(row.get("currency")) else "USD"
        counterparty = str(row["counterparty"]) if "counterparty" in row and pd.notna(row["counterparty"]) else None

        pos = PositionModel(
            commodity=commodity,
            instrument=instrument,
            direction=direction,
            quantity=quantity,
            unit=unit,
            entry_price=entry_price,
            market_price=market_price,
            currency=currency,
            counterparty=counterparty,
        )
        db.add(pos)
        records.append(pos)
    db.commit()
    return len(records)


def import_inventory_csv(db: Session, content: bytes):
    df = _read_csv(content)
    _validate_required_columns(df, ["commodity", "location", "quantity", "unit", "minimum_required", "available_quantity"], "inventory")

    records = []
    for idx, row in df.iterrows():
        row_number = idx + 2
        commodity = str(_require_non_empty_value(row, "commodity", row_number))
        location = str(_require_non_empty_value(row, "location", row_number))
        unit = str(_require_non_empty_value(row, "unit", row_number))
        quantity = _coerce_float(_require_non_empty_value(row, "quantity", row_number), "quantity", row_number)
        minimum_required = _coerce_float(_require_non_empty_value(row, "minimum_required", row_number), "minimum_required", row_number)
        available_quantity = _coerce_float(_require_non_empty_value(row, "available_quantity", row_number), "available_quantity", row_number)

        inv = InventoryModel(
            commodity=commodity,
            location=location,
            quantity=quantity,
            unit=unit,
            minimum_required=minimum_required,
            available_quantity=available_quantity,
        )
        db.add(inv)
        records.append(inv)
    db.commit()
    return len(records)


def import_shipments_csv(db: Session, content: bytes):
    df = _read_csv(content)
    _validate_required_columns(df, ["commodity", "origin", "destination", "quantity", "expected_arrival", "status"], "shipments")

    records = []
    for idx, row in df.iterrows():
        row_number = idx + 2
        commodity = str(_require_non_empty_value(row, "commodity", row_number))
        origin = str(_require_non_empty_value(row, "origin", row_number))
        destination = str(_require_non_empty_value(row, "destination", row_number))
        quantity = _coerce_float(_require_non_empty_value(row, "quantity", row_number), "quantity", row_number)
        expected_arrival = str(_require_non_empty_value(row, "expected_arrival", row_number))
        status = str(_require_non_empty_value(row, "status", row_number))
        unit = str(row.get("unit", "MT")) if "unit" in row and pd.notna(row.get("unit")) else "MT"
        delay_days = int(row["delay_days"]) if "delay_days" in row and pd.notna(row["delay_days"]) else 0

        shp = ShipmentModel(
            commodity=commodity,
            origin=origin,
            destination=destination,
            quantity=quantity,
            unit=unit,
            expected_arrival=expected_arrival,
            status=status,
            delay_days=delay_days,
        )
        db.add(shp)
        records.append(shp)
    db.commit()
    return len(records)
