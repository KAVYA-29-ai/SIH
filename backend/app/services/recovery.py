from dataclasses import dataclass

from sqlalchemy import select

from app.db.models import RecoveryRequestRecord
from app.db.session import SessionLocal


@dataclass(frozen=True)
class RecoveryRequest:
    request_id: str
    subject: str
    reason: str
    status: str
    approvals: int
    required_approvals: int
    timelock_hours: int


class RecoveryService:
    """PostgreSQL-backed recovery request service."""

    def list_requests(self) -> list[RecoveryRequest]:
        with SessionLocal() as db:
            records = db.scalars(
                select(RecoveryRequestRecord).order_by(
                    RecoveryRequestRecord.created_at.desc()
                )
            ).all()

        return [
            RecoveryRequest(
                request_id=record.id,
                subject=record.subject,
                reason=record.reason,
                status=record.status,
                approvals=record.approvals,
                required_approvals=record.required_approvals,
                timelock_hours=record.timelock_hours,
            )
            for record in records
        ]

    def get_summary(self) -> dict:
        requests = self.list_requests()

        return {
            "active_requests": len(requests),
            "pending_consensus": sum(
                1
                for request in requests
                if request.status == "Pending Consensus"
            ),
            "required_approvals": sum(
                request.required_approvals
                for request in requests
            ),
            "timelock_hours": max(
                (request.timelock_hours for request in requests),
                default=48,
            ),
        }


recovery_service = RecoveryService()
