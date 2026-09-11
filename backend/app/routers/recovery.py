from fastapi import APIRouter

from app.services.recovery import recovery_service

router = APIRouter()


def serialize_request(request) -> dict:
    return {
        "request_id": request.request_id,
        "subject": request.subject,
        "reason": request.reason,
        "status": request.status,
        "approvals": request.approvals,
        "required_approvals": request.required_approvals,
        "timelock_hours": request.timelock_hours,
    }


@router.get("/")
async def get_recovery_center() -> dict:
    requests = recovery_service.list_requests()

    return {
        "service": "recovery",
        "status": "ready",
        "summary": recovery_service.get_summary(),
        "requests": [
            serialize_request(request)
            for request in requests
        ],
    }


@router.get("/requests")
async def list_recovery_requests() -> dict:
    requests = recovery_service.list_requests()

    return {
        "service": "recovery",
        "status": "ready",
        "count": len(requests),
        "requests": [
            serialize_request(request)
            for request in requests
        ],
    }