"""
Quota Tracking Service

Tracks API usage across all AI services (Google Gemini, Groq, Microsoft Graph).
Logs requests, calculates usage statistics, and manages quota alerts.
"""
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.quota import AIQuotaUsage, QuotaAlert
from app.core.config import settings
from typing import Optional, List, Dict
import logging

logger = logging.getLogger(__name__)


class QuotaService:
    """Service for managing and tracking API quotas."""

    @staticmethod
    def get_or_create_daily_quota(
        db: Session, provider: str, model: str, daily_limit: int = 1000
    ) -> AIQuotaUsage:
        """Get today's quota record or create a new one."""
        today = datetime.utcnow().date()

        quota = db.query(AIQuotaUsage).filter(
            AIQuotaUsage.provider == provider,
            AIQuotaUsage.model == model,
            AIQuotaUsage.service_date >= datetime.combine(today, datetime.min.time()),
            AIQuotaUsage.service_date < datetime.combine(today, datetime.max.time()),
        ).first()

        if not quota:
            quota = AIQuotaUsage(
                provider=provider,
                model=model,
                service_date=datetime.utcnow(),
                request_count=0,
                daily_limit=daily_limit,
                last_used=datetime.utcnow(),
                error_count=0,
                success_count=0,
                avg_response_time=0.0,
            )
            db.add(quota)
            db.commit()
            db.refresh(quota)

        return quota

    @staticmethod
    def log_api_call(
        db: Session,
        provider: str,
        model: str,
        success: bool = True,
        response_time_ms: float = 0.0,
        daily_limit: int = 1000,
    ) -> AIQuotaUsage:
        """Log an API call and update quota usage."""
        quota = QuotaService.get_or_create_daily_quota(db, provider, model, daily_limit)

        # Update counts
        quota.request_count += 1
        if success:
            quota.success_count += 1
        else:
            quota.error_count += 1

        # Update average response time
        total_time = quota.avg_response_time * (quota.success_count - 1 if success else quota.success_count)
        if success:
            quota.avg_response_time = (total_time + response_time_ms) / quota.success_count

        quota.last_used = datetime.utcnow()
        quota.updated_at = datetime.utcnow()

        db.add(quota)
        db.commit()
        db.refresh(quota)

        # Check and create alerts if needed
        QuotaService._check_quota_thresholds(db, quota)

        logger.info(
            f"Logged API call: {provider}/{model} - "
            f"Requests: {quota.request_count}/{quota.daily_limit}, "
            f"Success: {quota.success_count}, Errors: {quota.error_count}"
        )

        return quota

    @staticmethod
    def _check_quota_thresholds(db: Session, quota: AIQuotaUsage) -> None:
        """Check if quota usage crossed any thresholds and create alerts."""
        usage_percent = quota.usage_percentage()
        thresholds = [80, 95, 100]

        for threshold in thresholds:
            if usage_percent >= threshold:
                # Check if alert already exists for this threshold
                existing_alert = db.query(QuotaAlert).filter(
                    QuotaAlert.provider == quota.provider,
                    QuotaAlert.threshold_percentage == threshold,
                    QuotaAlert.is_resolved == 0,
                ).first()

                if not existing_alert:
                    # Determine alert type
                    if threshold == 100:
                        alert_type = "limit_reached"
                        message = f"{quota.provider} has reached its daily quota limit ({quota.daily_limit} requests)"
                    elif threshold == 95:
                        alert_type = "threshold_critical"
                        message = f"{quota.provider} is at {usage_percent:.1f}% of daily quota - {quota.remaining_quota()} requests remaining"
                    else:
                        alert_type = "threshold_warning"
                        message = f"{quota.provider} has used {usage_percent:.1f}% of daily quota"

                    alert = QuotaAlert(
                        provider=quota.provider,
                        alert_type=alert_type,
                        threshold_percentage=threshold,
                        message=message,
                        is_resolved=0,
                        created_at=datetime.utcnow(),
                    )
                    db.add(alert)
                    db.commit()
                    logger.warning(f"Quota Alert: {message}")

    @staticmethod
    def get_quota_status(db: Session, provider: Optional[str] = None) -> List[Dict]:
        """Get current quota status for all or specific provider."""
        today = datetime.utcnow().date()

        query = db.query(AIQuotaUsage).filter(
            AIQuotaUsage.service_date >= datetime.combine(today, datetime.min.time()),
            AIQuotaUsage.service_date < datetime.combine(today, datetime.max.time()),
        )

        if provider:
            query = query.filter(AIQuotaUsage.provider == provider)

        quotas = query.all()

        result = []
        for quota in quotas:
            result.append({
                "provider": quota.provider,
                "model": quota.model,
                "status": QuotaService._get_status(quota),
                "requestsToday": quota.request_count,
                "dailyLimit": quota.daily_limit,
                "remaining": quota.remaining_quota(),
                "usagePercent": quota.usage_percentage(),
                "successCount": quota.success_count,
                "errorCount": quota.error_count,
                "avgResponseTime": quota.avg_response_time,
                "lastUsed": quota.last_used.isoformat() if quota.last_used else None,
            })

        return result

    @staticmethod
    def _get_status(quota: AIQuotaUsage) -> str:
        """Determine quota status based on usage."""
        usage_percent = quota.usage_percentage()
        if usage_percent >= 100:
            return "unavailable"
        elif usage_percent >= 80:
            return "limited"
        else:
            return "available"

    @staticmethod
    def get_alerts(db: Session, resolved: bool = False) -> List[Dict]:
        """Get quota alerts."""
        is_resolved = 1 if resolved else 0
        alerts = db.query(QuotaAlert).filter(
            QuotaAlert.is_resolved == is_resolved
        ).order_by(QuotaAlert.created_at.desc()).all()

        return [
            {
                "id": alert.id,
                "provider": alert.provider,
                "alertType": alert.alert_type,
                "threshold": alert.threshold_percentage,
                "message": alert.message,
                "createdAt": alert.created_at.isoformat(),
                "resolvedAt": alert.resolved_at.isoformat() if alert.resolved_at else None,
            }
            for alert in alerts
        ]

    @staticmethod
    def resolve_alert(db: Session, alert_id: int) -> Optional[QuotaAlert]:
        """Mark an alert as resolved."""
        alert = db.query(QuotaAlert).filter(QuotaAlert.id == alert_id).first()
        if alert:
            alert.mark_resolved()
            db.commit()
            db.refresh(alert)
            logger.info(f"Resolved alert {alert_id}")
        return alert

    @staticmethod
    def get_daily_summary(db: Session) -> Dict:
        """Get daily usage summary across all services."""
        today = datetime.utcnow().date()

        quotas = db.query(AIQuotaUsage).filter(
            AIQuotaUsage.service_date >= datetime.combine(today, datetime.min.time()),
            AIQuotaUsage.service_date < datetime.combine(today, datetime.max.time()),
        ).all()

        total_requests = sum(q.request_count for q in quotas)
        total_limit = sum(q.daily_limit for q in quotas)
        total_success = sum(q.success_count for q in quotas)
        total_errors = sum(q.error_count for q in quotas)
        avg_response_time = (
            sum(q.avg_response_time * q.success_count for q in quotas) / total_success
            if total_success > 0
            else 0.0
        )

        return {
            "date": today.isoformat(),
            "totalRequests": total_requests,
            "totalLimit": total_limit,
            "usagePercent": (total_requests / total_limit * 100) if total_limit > 0 else 0,
            "successCount": total_success,
            "errorCount": total_errors,
            "errorRate": (total_errors / total_requests * 100) if total_requests > 0 else 0,
            "avgResponseTime": avg_response_time,
            "serviceCount": len(quotas),
        }

    @staticmethod
    def reset_daily_quotas(db: Session) -> None:
        """Reset quotas at end of day (should be run as a scheduled task)."""
        yesterday = (datetime.utcnow() - timedelta(days=1)).date()

        old_quotas = db.query(AIQuotaUsage).filter(
            AIQuotaUsage.service_date < datetime.combine(yesterday, datetime.max.time())
        ).all()

        logger.info(f"Archiving {len(old_quotas)} old quota records")
        # In a real system, you might archive these to a history table
        # For now, we just ensure new quotas are created for new day

    @staticmethod
    def get_default_daily_limits() -> Dict[str, int]:
        """Get default daily limits for each service."""
        return {
            "google": 1000,  # Google Gemini
            "groq": 500,      # Groq API
            "microsoft": 2000, # Microsoft Graph API
        }
