"""
Price Watchlist Service for TradeLens AI.

Manages trader-defined price threshold alerts. When a watchlist entry's
threshold_price is crossed by the latest market_price for the matching
commodity instrument, is_triggered is set to True.

Each entry specifies:
  - commodity + instrument (matches PositionModel)
  - direction: 'above' | 'below'
  - threshold_price: the trigger level
  - note: optional trader annotation
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.models.entities import PriceWatchlistModel, PositionModel


# ── Watchlist CRUD ─────────────────────────────────────────────────────────────

def list_watchlist(db: Session, commodity: str | None = None) -> list[PriceWatchlistModel]:
    """Return all watchlist entries, optionally filtered by commodity."""
    q = db.query(PriceWatchlistModel)
    if commodity:
        q = q.filter(PriceWatchlistModel.commodity == commodity)
    return q.order_by(PriceWatchlistModel.created_at.desc()).all()


def get_watchlist_entry(db: Session, entry_id: str) -> PriceWatchlistModel | None:
    return db.query(PriceWatchlistModel).filter(PriceWatchlistModel.id == entry_id).first()


def create_watchlist_entry(db: Session, data: dict) -> PriceWatchlistModel:
    """Create a new watchlist entry and immediately evaluate it against live prices."""
    direction = str(data.get("direction", "")).strip().lower()
    if direction not in ("above", "below"):
        raise ValueError("direction must be 'above' or 'below'")
    if not data.get("threshold_price") or float(data["threshold_price"]) <= 0:
        raise ValueError("threshold_price must be a positive number")

    entry = PriceWatchlistModel(
        commodity=data["commodity"],
        instrument=data["instrument"],
        label=data.get("label") or f"{data['commodity']} {data['instrument']} {direction} {data['threshold_price']}",
        direction=direction,
        threshold_price=float(data["threshold_price"]),
        note=data.get("note"),
        is_triggered=False,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    # Eagerly evaluate against current live prices
    _evaluate_single(db, entry)
    return entry


def update_watchlist_entry(db: Session, entry_id: str, data: dict) -> PriceWatchlistModel | None:
    """Update threshold/note/direction for a watchlist entry and re-evaluate."""
    entry = get_watchlist_entry(db, entry_id)
    if not entry:
        return None

    updatable = ("label", "direction", "threshold_price", "note")
    for key in updatable:
        if key in data:
            setattr(entry, key, data[key])

    db.commit()
    db.refresh(entry)
    _evaluate_single(db, entry)
    return entry


def delete_watchlist_entry(db: Session, entry_id: str) -> bool:
    entry = get_watchlist_entry(db, entry_id)
    if not entry:
        return False
    db.delete(entry)
    db.commit()
    return True


# ── Evaluation Engine ─────────────────────────────────────────────────────────

def _get_latest_price(db: Session, commodity: str, instrument: str) -> float | None:
    """
    Look up the latest market_price from positions matching the commodity+instrument.
    Returns None when no matching position exists.
    """
    pos = (
        db.query(PositionModel)
        .filter(
            PositionModel.commodity == commodity,
            PositionModel.instrument == instrument,
        )
        .order_by(PositionModel.market_price.desc())
        .first()
    )
    return pos.market_price if pos else None


def _evaluate_single(db: Session, entry: PriceWatchlistModel) -> None:
    """
    Evaluate a single watchlist entry against the current live market price.
    Updates is_triggered, current_price, and last_checked_at in-place.
    """
    current_price = _get_latest_price(db, entry.commodity, entry.instrument)

    entry.last_checked_at = datetime.utcnow()
    if current_price is not None:
        entry.current_price = current_price
        direction = str(entry.direction).lower()
        if direction == "above":
            entry.is_triggered = current_price >= entry.threshold_price
        elif direction == "below":
            entry.is_triggered = current_price <= entry.threshold_price
    else:
        # No live price available — leave triggered state unchanged
        entry.is_triggered = False

    db.commit()


def evaluate_all_watchlist(db: Session, commodity: str | None = None) -> dict[str, Any]:
    """
    Evaluate all (or filtered) watchlist entries against live market prices.
    Returns a summary of triggered vs. pending entries.
    """
    entries = list_watchlist(db, commodity)

    triggered = []
    pending = []

    for entry in entries:
        _evaluate_single(db, entry)
        payload = _entry_to_dict(entry)
        if entry.is_triggered:
            triggered.append(payload)
        else:
            pending.append(payload)

    return {
        "evaluated_count": len(entries),
        "triggered_count": len(triggered),
        "pending_count": len(pending),
        "triggered": triggered,
        "pending": pending,
    }


def _entry_to_dict(entry: PriceWatchlistModel) -> dict[str, Any]:
    return {
        "id": entry.id,
        "commodity": entry.commodity,
        "instrument": entry.instrument,
        "label": entry.label,
        "direction": entry.direction,
        "threshold_price": entry.threshold_price,
        "current_price": entry.current_price,
        "is_triggered": entry.is_triggered,
        "note": entry.note,
        "created_at": entry.created_at.isoformat() if entry.created_at else None,
        "last_checked_at": entry.last_checked_at.isoformat() if entry.last_checked_at else None,
    }
