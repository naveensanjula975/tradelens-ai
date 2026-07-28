"""
Background task helpers for TradeLens AI.

These functions are designed to be called on-demand or from scheduled jobs.
They do not require a message queue — they run synchronously within a
database session and are triggered from FastAPI background_tasks.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.entities import DecisionSnapshotModel, AIBriefModel, AlertModel
from app.services.dashboard_service import get_dashboard_data_for_commodity

logger = logging.getLogger(__name__)

COMMODITIES = ["Copper", "Aluminium", "Zinc", "Nickel"]


def snapshot_all_commodities(db: Session) -> dict[str, str]:
    """
    Evaluate and persist a DecisionSnapshot + AIBrief for every commodity.
    Returns a summary dict mapping commodity → permission status.
    """
    results: dict[str, str] = {}
    for commodity in COMMODITIES:
        try:
            data = get_dashboard_data_for_commodity(db, commodity)

            # Persist snapshot
            snap = DecisionSnapshotModel(
                commodity=commodity,
                market_state=data.decision.market_state,
                permission=data.decision.permission,
                evidence_score=data.decision.evidence_score,
                risk_score=data.decision.risk_score,
                confidence_score=data.decision.confidence_score,
                summary=data.decision.summary,
                supporting_evidence=data.decision.supporting_evidence,
                blocking_factors=data.decision.blocking_factors,
            )
            db.add(snap)

            # Persist AI brief
            brief = AIBriefModel(
                commodity=commodity,
                headline=data.ai_brief.headline,
                summary=data.ai_brief.summary,
                why=data.ai_brief.why,
                next_actions=data.ai_brief.next_actions,
            )
            db.add(brief)

            results[commodity] = data.decision.permission
            logger.info("Snapshot saved for %s: %s", commodity, data.decision.permission)

        except Exception as exc:  # noqa: BLE001
            logger.error("Failed to snapshot %s: %s", commodity, exc)
            results[commodity] = "error"

    db.commit()
    return results


def purge_old_snapshots(db: Session, keep_last_n: int = 50) -> int:
    """
    Remove old DecisionSnapshot records, keeping the most recent `keep_last_n`
    per commodity. Returns total rows deleted.
    """
    deleted = 0
    for commodity in COMMODITIES:
        rows = (
            db.query(DecisionSnapshotModel)
            .filter(DecisionSnapshotModel.commodity == commodity)
            .order_by(DecisionSnapshotModel.created_at.desc())
            .all()
        )
        to_delete = rows[keep_last_n:]
        for row in to_delete:
            db.delete(row)
            deleted += 1

    db.commit()
    logger.info("Purged %d old decision snapshots.", deleted)
    return deleted
