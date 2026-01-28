# Real Quota Tracking Implementation

This document describes the real-time quota tracking system for AI services used in the TaskManager application.

## Overview

The quota tracking system monitors API usage across all AI services:
- **Google Gemini 2.5 Flash** (1000 requests/day limit)
- **Groq Llama 3.3 70B** (500 requests/day limit)
- **Microsoft Graph API** (2000 requests/day limit)

## Architecture

### 1. Database Models (`backend/app/models/quota.py`)

#### `AIQuotaUsage` Table
Tracks daily usage metrics for each AI service:
- `provider`: AI service provider (Google Gemini, Groq, Microsoft)
- `model`: Model name/version
- `service_date`: Date of usage (UTC)
- `request_count`: Total requests made
- `daily_limit`: Daily quota limit
- `success_count`: Successful requests
- `error_count`: Failed requests
- `avg_response_time`: Average response time in milliseconds
- `last_used`: Last time service was used

**Methods:**
- `remaining_quota()`: Returns remaining quota for the day
- `usage_percentage()`: Returns usage as percentage of daily limit
- `is_expired()`: Checks if record is from today

#### `QuotaAlert` Table
Tracks quota threshold alerts:
- `provider`: Which AI service triggered alert
- `alert_type`: Type of alert (warning, critical, limit_reached)
- `threshold_percentage`: Percentage threshold (80%, 95%, 100%)
- `message`: Alert message
- `is_resolved`: Alert status (0=active, 1=resolved)
- `created_at`: When alert was created
- `resolved_at`: When alert was resolved

**Methods:**
- `mark_resolved()`: Mark alert as resolved

### 2. Quota Service (`backend/app/services/quota_service.py`)

Core service for managing quotas:

#### Key Methods:
- `get_or_create_daily_quota()`: Get today's quota or create new one
- `log_api_call()`: Log an API call and update quota metrics
- `get_quota_status()`: Get current quota for all/specific provider
- `get_alerts()`: Get active or resolved alerts
- `resolve_alert()`: Mark alert as resolved
- `get_daily_summary()`: Get daily usage summary across all services

#### Automatic Alert Management:
When quota usage crosses thresholds (80%, 95%, 100%), the service automatically creates alerts:
- **80%**: Warning alert - "threshold_warning"
- **95%**: Critical alert - "threshold_critical"
- **100%**: Limit reached - "limit_reached"

### 3. API Integration

#### Endpoints (`backend/app/routes/quota.py`)

**GET `/ai-quota/status`**
- Returns current quota status for all services
- Includes real data from database or mock data if no usage yet
- Response includes remaining quota, usage percentage, error counts, avg response time

**GET `/ai-quota/alerts?resolved=false`**
- Returns active quota alerts by default
- Set `resolved=true` to get resolved alerts

**POST `/ai-quota/alerts/{alert_id}/resolve`**
- Marks a specific alert as resolved

**GET `/ai-quota/summary`**
- Returns daily usage summary across all services
- Includes total requests, total limit, error rate, avg response time

### 4. Quota Logging in AI Service

The `AIService` class automatically logs API calls to track usage:

```python
@staticmethod
def _log_quota(provider: str, model: str, success: bool, response_time_ms: float):
    """Log API call to quota service (called asynchronously)."""
    # Logs to database in background thread
```

Integration points:
- **`analyze_tasks()`**: Logs Google Gemini API calls
- **`suggest_message()`**: Logs suggestion generation calls
- **`suggest_email()`**: Logs email generation calls
- **`suggest_deploy_checklist()`**: Logs checklist generation calls
- **`analyze_messages()`**: Logs message analysis calls
- **`reanalyze_tasks()`**: Logs task reanalysis calls
- **`detect_dependencies()`**: Logs dependency detection calls

### 5. Frontend Component

**`frontend/src/components/AIQuotaStatus.tsx`**

Displays quota status in the dashboard header:
- Compact view: Shows total usage percentage with status indicator
- Expanded view: Shows per-service breakdown with:
  - Progress bar (color-coded: green <50%, yellow 50-80%, red >80%)
  - Used/Limit/Remaining counts
  - Success/Error counts
  - Average response time
  - Last used timestamp
  - Reset time

Fetches data from `/ai-quota/status` endpoint every 5 minutes.

## How It Works

### Request Lifecycle:

1. **User requests task analysis** → AI Service processes request
2. **API call made to Google Gemini** → Service measures response time
3. **In background (non-blocking)**:
   - Create or get today's quota record
   - Increment request_count
   - Update success/error counts
   - Calculate average response time
   - Check quota thresholds
   - Create alerts if threshold crossed
4. **Response sent to user** (quota logging doesn't block)
5. **Frontend fetches quota status** from `/ai-quota/status`
6. **Dashboard displays real-time quota usage**

### Automatic Alert Generation:

```
Usage: 0% ─────── 80% ──────── 95% ─────── 100%
       Normal   Warning      Critical    Limit Reached
                 Alert        Alert       Alert
```

When usage percentage reaches a threshold, an alert is automatically created and stored in the database.

## Configuration

Default daily limits (in `QuotaService.get_default_daily_limits()`):
```python
{
    "google": 1000,      # Google Gemini
    "groq": 500,         # Groq API
    "microsoft": 2000,   # Microsoft Graph API
}
```

## Testing

To test the quota tracking system:

1. **Check database tables are created**:
   - Tables are auto-created on app startup via `Base.metadata.create_all()`

2. **Make an API call** that uses Google Gemini:
   - Task analysis, message suggestion, etc.

3. **Check quota status**:
   ```bash
   curl http://localhost:8000/ai-quota/status
   ```

4. **Check alerts**:
   ```bash
   curl http://localhost:8000/ai-quota/alerts
   ```

5. **View in frontend**:
   - Open TaskManager dashboard
   - Look for "AI Services" widget in header
   - Expand to see per-service breakdown

## Database Schema

### ai_quota_usage table:
```sql
CREATE TABLE ai_quota_usage (
    id INTEGER PRIMARY KEY,
    provider VARCHAR,
    model VARCHAR,
    service_date DATETIME,
    request_count INTEGER DEFAULT 0,
    daily_limit INTEGER DEFAULT 1000,
    last_used DATETIME,
    error_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    avg_response_time FLOAT DEFAULT 0.0,
    created_at DATETIME,
    updated_at DATETIME
);
CREATE INDEX idx_provider ON ai_quota_usage(provider);
CREATE INDEX idx_service_date ON ai_quota_usage(service_date);
```

### quota_alerts table:
```sql
CREATE TABLE quota_alerts (
    id INTEGER PRIMARY KEY,
    provider VARCHAR,
    alert_type VARCHAR,
    threshold_percentage INTEGER,
    message VARCHAR,
    is_resolved INTEGER DEFAULT 0,
    created_at DATETIME,
    resolved_at DATETIME
);
CREATE INDEX idx_provider ON quota_alerts(provider);
```

## Future Enhancements

1. **Historical analytics**: Archive old quota records for trend analysis
2. **Per-user tracking**: Track quotas per user account
3. **Rate limiting**: Automatically throttle requests approaching limits
4. **Notifications**: Send email/Slack alerts when limits approached
5. **Quota reset scheduling**: Automatic daily quota reset
6. **Provider-specific limits**: Fetch actual limits from provider APIs
7. **Usage predictions**: ML-based prediction of when quotas will be exceeded
8. **Cost tracking**: Track API call costs alongside usage
