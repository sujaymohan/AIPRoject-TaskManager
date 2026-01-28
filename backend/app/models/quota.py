"""
AI Quota Models

Models for tracking AI service usage and quotas.
"""
from sqlalchemy import Column, String, Integer, DateTime, Float
from datetime import datetime, timedelta

# Lazy import of Base to avoid circular imports - will be set when needed
try:
    from app.core.database import Base
except ImportError:
    # Fallback during initialization
    from sqlalchemy.orm import declarative_base
    Base = declarative_base()


class AIQuotaUsage(Base):
    """Track daily usage for each AI service."""
    __tablename__ = "ai_quota_usage"

    id = Column(Integer, primary_key=True, index=True)
    provider = Column(String, index=True)  # "google", "groq", "microsoft"
    model = Column(String)  # Model name/version
    service_date = Column(DateTime, default=datetime.utcnow, index=True)  # Date of usage (UTC)
    request_count = Column(Integer, default=0)  # Number of requests made
    daily_limit = Column(Integer, default=1000)  # Daily limit for this service
    last_used = Column(DateTime, default=datetime.utcnow)  # Last time service was used
    error_count = Column(Integer, default=0)  # Failed requests
    success_count = Column(Integer, default=0)  # Successful requests
    avg_response_time = Column(Float, default=0.0)  # Average response time in ms
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def is_expired(self) -> bool:
        """Check if usage record is from today."""
        today = datetime.utcnow().date()
        return self.service_date.date() != today

    def remaining_quota(self) -> int:
        """Calculate remaining quota for the day."""
        return max(0, self.daily_limit - self.request_count)

    def usage_percentage(self) -> float:
        """Calculate usage percentage."""
        if self.daily_limit == 0:
            return 0.0
        return (self.request_count / self.daily_limit) * 100


class QuotaAlert(Base):
    """Track quota alerts for thresholds."""
    __tablename__ = "quota_alerts"

    id = Column(Integer, primary_key=True, index=True)
    provider = Column(String, index=True)  # Which AI service
    alert_type = Column(String)  # "threshold_warning", "limit_reached", "error_rate_high"
    threshold_percentage = Column(Integer)  # Triggered at what percentage (e.g., 80)
    message = Column(String)  # Alert message
    is_resolved = Column(Integer, default=0)  # 0 = active, 1 = resolved
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    def mark_resolved(self):
        """Mark alert as resolved."""
        self.is_resolved = 1
        self.resolved_at = datetime.utcnow()
