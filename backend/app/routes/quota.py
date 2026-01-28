"""
AI Quota Status Routes

Endpoints for checking AI service quotas and usage limits.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Literal
from datetime import datetime, timedelta
import os
from app.core.database import get_db
from app.services.quota_service import QuotaService
from sqlalchemy.orm import Session

router = APIRouter(prefix="/ai-quota", tags=["ai-quota"])


class QuotaInfo(BaseModel):
    """Information about a single AI service quota."""
    provider: str
    model: str
    status: Literal["available", "limited", "unavailable"]
    requestsToday: int
    dailyLimit: int
    remaining: int
    usagePercent: float
    lastUsed: Optional[str] = None
    nextResetTime: Optional[str] = None
    successCount: int = 0
    errorCount: int = 0
    avgResponseTime: float = 0.0


class QuotaStatusResponse(BaseModel):
    """Response containing all AI service quotas."""
    quotas: List[QuotaInfo]
    lastUpdated: str


class QuotaAlert(BaseModel):
    """Quota alert information."""
    id: int
    provider: str
    alertType: str
    threshold: int
    message: str
    createdAt: str
    resolvedAt: Optional[str] = None


class QuotaAlertsResponse(BaseModel):
    """Response containing quota alerts."""
    alerts: List[QuotaAlert]
    count: int


class DailySummary(BaseModel):
    """Daily quota usage summary."""
    date: str
    totalRequests: int
    totalLimit: int
    usagePercent: float
    successCount: int
    errorCount: int
    errorRate: float
    avgResponseTime: float
    serviceCount: int


@router.get("/status", response_model=QuotaStatusResponse)
async def get_quota_status(db: Session = Depends(get_db)):
    """
    Get the current quota status for all AI services used in the application.

    Returns:
        QuotaStatusResponse with quota information for:
        - Google Gemini 2.5 Flash
        - Groq Llama 3.3 70B
        - Microsoft Graph API
    """
    try:
        # Get quota data from database
        quota_data = QuotaService.get_quota_status(db)
        limits = QuotaService.get_default_daily_limits()

        # Create a map of existing quota data by provider
        quota_map = {q["provider"]: q for q in quota_data} if quota_data else {}

        # Define all services we want to show
        all_services = [
            {"provider": "Google Gemini", "model": "gemini-2.5-flash", "limit_key": "google"},
            {"provider": "Groq Llama", "model": "llama-3.3-70b-versatile", "limit_key": "groq"},
            {"provider": "Microsoft Graph", "model": "Teams API v1.0", "limit_key": "microsoft"},
        ]

        # Calculate next reset time (end of day)
        now = datetime.utcnow()
        reset_time = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        reset_str = reset_time.strftime("%H:%M")

        quotas: List[QuotaInfo] = []

        for service in all_services:
            provider = service["provider"]
            if provider in quota_map:
                # Use real data from database
                quota = quota_map[provider]
                quotas.append(
                    QuotaInfo(
                        provider=quota["provider"],
                        model=quota["model"],
                        status=quota["status"],
                        requestsToday=quota["requestsToday"],
                        dailyLimit=quota["dailyLimit"],
                        remaining=quota["remaining"],
                        usagePercent=quota["usagePercent"],
                        lastUsed=quota["lastUsed"],
                        nextResetTime=reset_str,
                        successCount=quota["successCount"],
                        errorCount=quota["errorCount"],
                        avgResponseTime=quota["avgResponseTime"],
                    )
                )
            else:
                # Use default values for services without data
                daily_limit = limits.get(service["limit_key"], 1000)
                quotas.append(
                    QuotaInfo(
                        provider=provider,
                        model=service["model"],
                        status="available",
                        requestsToday=0,
                        dailyLimit=daily_limit,
                        remaining=daily_limit,
                        usagePercent=0.0,
                        lastUsed=None,
                        nextResetTime=reset_str,
                        successCount=0,
                        errorCount=0,
                        avgResponseTime=0.0,
                    )
                )

        return QuotaStatusResponse(
            quotas=quotas,
            lastUpdated=datetime.utcnow().isoformat(),
        )

    except Exception as e:
        print(f"Error fetching quota status: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch quota status")


@router.get("/alerts", response_model=QuotaAlertsResponse)
async def get_quota_alerts(resolved: bool = False, db: Session = Depends(get_db)):
    """
    Get quota alerts.

    Args:
        resolved: If False (default), return active alerts. If True, return resolved alerts.

    Returns:
        List of quota alerts
    """
    try:
        alerts_data = QuotaService.get_alerts(db, resolved=resolved)
        return QuotaAlertsResponse(
            alerts=[QuotaAlert(**alert) for alert in alerts_data],
            count=len(alerts_data),
        )
    except Exception as e:
        print(f"Error fetching quota alerts: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch quota alerts")


@router.post("/alerts/{alert_id}/resolve")
async def resolve_quota_alert(alert_id: int, db: Session = Depends(get_db)):
    """Resolve a quota alert."""
    try:
        alert = QuotaService.resolve_alert(db, alert_id)
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")
        return {"status": "resolved", "alertId": alert_id}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error resolving alert: {e}")
        raise HTTPException(status_code=500, detail="Failed to resolve alert")


@router.get("/summary", response_model=DailySummary)
async def get_daily_summary(db: Session = Depends(get_db)):
    """Get daily usage summary across all services."""
    try:
        summary = QuotaService.get_daily_summary(db)
        return DailySummary(**summary)
    except Exception as e:
        print(f"Error fetching daily summary: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch daily summary")
