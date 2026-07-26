import csv
import io
import math
import re
from datetime import date
from typing import Any, Callable

import pandas as pd
from sqlalchemy.orm import Session

from app.models.entities import InventoryModel, PositionModel, ShipmentModel


MAX_IMPORT_ERRORS = 100
ISO_DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")
ValidationError = dict[str, Any]
RowValidator = Callable[[pd.Series, int, list[ValidationError]], dict[str, Any] | None]


class ImportValidationError(ValueError):
    def __init__(
        self,
        errors: list[ValidationError],
        message: str = "CSV validation failed",
    ):
        super().__init__(message)
        self.message = message
        self.errors = errors[:MAX_IMPORT_ERRORS]

    def to_detail(self) -> dict[str, Any]:
        return {"message": self.message, "errors": self.errors}


def _add_error(
    errors: list[ValidationError],
    row: int,
    column: str,
    code: str,
    message: str,
) -> None:
    if len(errors) < MAX_IMPORT_ERRORS:
        errors.append(
            {
                "row": row,
                "column": column,
                "code": code,
                "message": message,
            }
        )


def _file_error(column: str, code: str, message: str) -> ImportValidationError:
    errors: list[ValidationError] = []
    _add_error(errors, 1, column, code, message)
    return ImportValidationError(errors)


def _read_csv(content: bytes, required_columns: list[str], file_type: str) -> pd.DataFrame:
    if not content or not content.strip():
        raise _file_error("file", "empty_file", "CSV file is empty")

    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise _file_error(
            "file", "invalid_encoding", "CSV file must use UTF-8 encoding"
        ) from exc

    try:
        header = next(csv.reader(io.StringIO(text), strict=True))
    except (StopIteration, csv.Error) as exc:
        raise _file_error("file", "invalid_csv", "Could not parse CSV header") from exc

    normalized_columns = [column.strip() for column in header]
    duplicate_columns = sorted(
        {column for column in normalized_columns if normalized_columns.count(column) > 1}
    )
    if duplicate_columns:
        raise _file_error(
            "columns",
            "duplicate_columns",
            f"Duplicate CSV columns: {', '.join(duplicate_columns)}",
        )

    try:
        dataframe = pd.read_csv(
            io.StringIO(text),
            dtype=str,
            keep_default_na=False,
            skipinitialspace=True,
        )
    except Exception as exc:
        raise _file_error(
            "file", "invalid_csv", f"Could not parse CSV file: {exc}"
        ) from exc

    dataframe.columns = normalized_columns
    if dataframe.empty:
        raise _file_error("file", "empty_file", "CSV file contains no data rows")

    missing = [column for column in required_columns if column not in dataframe.columns]
    if missing:
        raise _file_error(
            "columns",
            "missing_columns",
            f"Missing required columns for {file_type} import: {', '.join(missing)}",
        )

    return dataframe


def _required_text(
    row: pd.Series,
    column: str,
    row_number: int,
    errors: list[ValidationError],
) -> str | None:
    value = str(row[column]).strip()
    if not value:
        _add_error(
            errors,
            row_number,
            column,
            "required",
            f"{column.replace('_', ' ').title()} is required",
        )
        return None
    return value


def _optional_text(row: pd.Series, column: str, default: str | None) -> str | None:
    if column not in row.index:
        return default
    value = str(row[column]).strip()
    return value or default


def _number(
    row: pd.Series,
    column: str,
    row_number: int,
    errors: list[ValidationError],
    *,
    positive: bool = False,
    non_negative: bool = False,
) -> float | None:
    raw_value = _required_text(row, column, row_number, errors)
    if raw_value is None:
        return None

    try:
        value = float(raw_value)
    except ValueError:
        _add_error(
            errors,
            row_number,
            column,
            "invalid_number",
            f"{column.replace('_', ' ').title()} must be a valid number",
        )
        return None

    if not math.isfinite(value):
        _add_error(
            errors,
            row_number,
            column,
            "invalid_number",
            f"{column.replace('_', ' ').title()} must be a finite number",
        )
        return None
    if positive and value <= 0:
        _add_error(
            errors,
            row_number,
            column,
            "not_positive",
            f"{column.replace('_', ' ').title()} must be a positive number",
        )
        return None
    if non_negative and value < 0:
        _add_error(
            errors,
            row_number,
            column,
            "negative_value",
            f"{column.replace('_', ' ').title()} must be non-negative",
        )
        return None
    return value


def _validate_position(
    row: pd.Series, row_number: int, errors: list[ValidationError]
) -> dict[str, Any] | None:
    starting_error_count = len(errors)
    commodity = _required_text(row, "commodity", row_number, errors)
    instrument = _required_text(row, "instrument", row_number, errors)
    direction_value = _required_text(row, "direction", row_number, errors)
    unit = _required_text(row, "unit", row_number, errors)
    quantity = _number(row, "quantity", row_number, errors, positive=True)
    entry_price = _number(row, "entry_price", row_number, errors, positive=True)
    market_price = _number(row, "market_price", row_number, errors, positive=True)

    direction = None
    if direction_value:
        directions = {"long": "Long", "short": "Short"}
        direction = directions.get(direction_value.casefold())
        if direction is None:
            _add_error(
                errors,
                row_number,
                "direction",
                "invalid_choice",
                "Direction must be Long or Short",
            )

    if len(errors) != starting_error_count:
        return None
    return {
        "commodity": commodity,
        "instrument": instrument,
        "direction": direction,
        "quantity": quantity,
        "unit": unit,
        "entry_price": entry_price,
        "market_price": market_price,
        "currency": _optional_text(row, "currency", "USD"),
        "counterparty": _optional_text(row, "counterparty", None),
    }


def _validate_inventory(
    row: pd.Series, row_number: int, errors: list[ValidationError]
) -> dict[str, Any] | None:
    starting_error_count = len(errors)
    commodity = _required_text(row, "commodity", row_number, errors)
    location = _required_text(row, "location", row_number, errors)
    unit = _required_text(row, "unit", row_number, errors)
    quantity = _number(row, "quantity", row_number, errors, non_negative=True)
    minimum_required = _number(
        row, "minimum_required", row_number, errors, non_negative=True
    )
    available_quantity = _number(
        row, "available_quantity", row_number, errors, non_negative=True
    )

    if quantity is not None and available_quantity is not None:
        if available_quantity > quantity:
            _add_error(
                errors,
                row_number,
                "available_quantity",
                "exceeds_quantity",
                "Available quantity cannot exceed quantity",
            )

    if len(errors) != starting_error_count:
        return None
    return {
        "commodity": commodity,
        "location": location,
        "quantity": quantity,
        "unit": unit,
        "minimum_required": minimum_required,
        "available_quantity": available_quantity,
    }


def _validate_shipment(
    row: pd.Series, row_number: int, errors: list[ValidationError]
) -> dict[str, Any] | None:
    starting_error_count = len(errors)
    commodity = _required_text(row, "commodity", row_number, errors)
    origin = _required_text(row, "origin", row_number, errors)
    destination = _required_text(row, "destination", row_number, errors)
    quantity = _number(row, "quantity", row_number, errors, positive=True)
    expected_arrival = _required_text(row, "expected_arrival", row_number, errors)
    status = _required_text(row, "status", row_number, errors)

    if expected_arrival:
        try:
            if not ISO_DATE_PATTERN.fullmatch(expected_arrival):
                raise ValueError
            date.fromisoformat(expected_arrival)
        except ValueError:
            _add_error(
                errors,
                row_number,
                "expected_arrival",
                "invalid_date",
                "Expected arrival must be a valid date in YYYY-MM-DD format",
            )

    delay_days = 0
    delay_value = _optional_text(row, "delay_days", "0")
    try:
        delay_days = int(delay_value or "0")
        if delay_days < 0:
            raise ValueError
    except ValueError:
        _add_error(
            errors,
            row_number,
            "delay_days",
            "invalid_integer",
            "Delay days must be a non-negative integer",
        )

    if len(errors) != starting_error_count:
        return None
    return {
        "commodity": commodity,
        "origin": origin,
        "destination": destination,
        "quantity": quantity,
        "unit": _optional_text(row, "unit", "MT"),
        "expected_arrival": expected_arrival,
        "status": status,
        "delay_days": delay_days,
    }


def _import_csv(
    db: Session,
    content: bytes,
    *,
    required_columns: list[str],
    file_type: str,
    validator: RowValidator,
    model: type[PositionModel] | type[InventoryModel] | type[ShipmentModel],
) -> int:
    try:
        dataframe = _read_csv(content, required_columns, file_type)
        errors: list[ValidationError] = []
        records = []

        for index, row in dataframe.iterrows():
            values = validator(row, index + 2, errors)
            if values is not None:
                records.append(model(**values))
            if len(errors) >= MAX_IMPORT_ERRORS:
                break

        if errors:
            raise ImportValidationError(errors)

        db.add_all(records)
        db.commit()
        return len(records)
    except Exception:
        db.rollback()
        raise


def import_positions_csv(db: Session, content: bytes) -> int:
    return _import_csv(
        db,
        content,
        required_columns=[
            "commodity",
            "instrument",
            "direction",
            "quantity",
            "unit",
            "entry_price",
            "market_price",
        ],
        file_type="positions",
        validator=_validate_position,
        model=PositionModel,
    )


def import_inventory_csv(db: Session, content: bytes) -> int:
    return _import_csv(
        db,
        content,
        required_columns=[
            "commodity",
            "location",
            "quantity",
            "unit",
            "minimum_required",
            "available_quantity",
        ],
        file_type="inventory",
        validator=_validate_inventory,
        model=InventoryModel,
    )


def import_shipments_csv(db: Session, content: bytes) -> int:
    return _import_csv(
        db,
        content,
        required_columns=[
            "commodity",
            "origin",
            "destination",
            "quantity",
            "expected_arrival",
            "status",
        ],
        file_type="shipments",
        validator=_validate_shipment,
        model=ShipmentModel,
    )
