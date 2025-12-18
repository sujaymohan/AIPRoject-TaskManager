# Outlook Calendar Integration Guide

## Overview

Your TaskFlow AI application now has full Outlook Calendar integration with the `Calendars.ReadWrite` permission. This guide explains how to connect the Calendar tab to your real Outlook Calendar.

## What's Already Set Up

### ✅ Backend
- **Calendar API Routes** ([backend/app/routes/calendar.py](backend/app/routes/calendar.py))
  - `GET /calendar/events` - Fetch calendar events
  - `POST /calendar/events` - Create new calendar events
  - `GET /calendar/freebusy` - Get free/busy schedule
  - `DELETE /calendar/events/{event_id}` - Delete events

- **Microsoft Graph API Integration**
  - Uses your existing Teams OAuth setup
  - Requires `Calendars.ReadWrite` permission (already added)
  - Endpoint: `https://graph.microsoft.com/v1.0/me/calendar`

### ✅ Frontend
- **Calendar Tab UI** ([frontend/src/components/CalendarTab.tsx](frontend/src/components/CalendarTab.tsx))
  - Agenda View (timeline for next 7 days)
  - Week View (grid with hourly slots)
  - Task Scheduling Panel (smart scheduling with AI)

- **Calendar Service** ([frontend/src/services/outlookCalendarService.ts](frontend/src/services/outlookCalendarService.ts))
  - Currently in mock mode
  - Ready to switch to real API calls

- **Calendar API Client** ([frontend/src/api/client.ts](frontend/src/api/client.ts))
  - `calendarApi.getEvents(accessToken, startDate, endDate)`
  - `calendarApi.createEvent(accessToken, event)`
  - `calendarApi.getFreeBusy(accessToken, startDate, endDate)`
  - `calendarApi.deleteEvent(accessToken, eventId)`

## How to Activate Real Calendar Integration

### Step 1: Update the Calendar Service

Edit [frontend/src/services/outlookCalendarService.ts](frontend/src/services/outlookCalendarService.ts):

```typescript
// Line 18: Change this to false
private useMockData = false; // Set to false when MCP is configured
```

### Step 2: Implement Real API Calls

Replace the mock methods in `outlookCalendarService.ts` with real API calls. Here's an example for `getEvents`:

```typescript
async getEvents(startDate: string, endDate: string): Promise<CalendarEvent[]> {
  if (this.useMockData) {
    return this.getMockEvents(startDate, endDate);
  }

  try {
    // Get access token (same way as Teams integration)
    const accessToken = this.getStoredAccessToken(); // Implement this

    // Call your backend API
    const response = await calendarApi.getEvents(accessToken, startDate, endDate);

    // Transform to CalendarEvent[] format
    return response.events.map(event => ({
      id: event.id,
      subject: event.subject,
      start: event.start,
      end: event.end,
      isAllDay: event.isAllDay,
      status: event.status as EventStatus,
      type: event.type as EventType,
      organizer: event.organizer,
      location: event.location,
      webLink: event.webLink,
      body: event.body,
      isCancelled: event.isCancelled,
      taskId: event.taskId || undefined,
    }));
  } catch (error) {
    console.error('Failed to fetch calendar events:', error);
    throw error;
  }
}
```

### Step 3: Share Access Token with Calendar Service

You need to provide the Microsoft Graph access token to the calendar service. You have two options:

#### Option A: Use the Same Teams OAuth Flow

Since you already have Teams OAuth set up, you can reuse the same access token:

```typescript
// In outlookCalendarService.ts
private getStoredAccessToken(): string {
  const token = localStorage.getItem('teams_access_token');
  if (!token) {
    throw new Error('Not authenticated. Please sign in with Microsoft Teams.');
  }
  return token;
}
```

#### Option B: Add Token to Service Constructor

Pass the access token when creating the service:

```typescript
class OutlookCalendarService {
  constructor(private accessToken?: string) {}

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  // Then use this.accessToken in API calls
}

// Usage
export const outlookCalendarService = new OutlookCalendarService();
// Later: outlookCalendarService.setAccessToken(token);
```

### Step 4: Handle Authentication in Calendar Tab

Update [frontend/src/components/CalendarTab.tsx](frontend/src/components/CalendarTab.tsx) to check for authentication:

```typescript
export function CalendarTab({ tasks, refreshTrigger, onTaskUpdated, onTaskDeleted }: CalendarTabProps) {
  const [subView, setSubView] = useState<CalendarSubView>('agenda');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('teams_access_token');
    setIsAuthenticated(!!token);

    if (token) {
      outlookCalendarService.setAccessToken(token); // If using Option B
      loadCalendarEvents();
    } else {
      setLoading(false);
    }
  }, [refreshTrigger]);

  // ... rest of component

  if (!isAuthenticated) {
    return (
      <div className="calendar-auth-needed">
        <h2>Microsoft Account Required</h2>
        <p>Please sign in with your Microsoft account to view your calendar.</p>
        <button onClick={handleSignIn}>Sign In with Microsoft</button>
      </div>
    );
  }

  // ... rest of component
}
```

## Testing the Integration

### 1. Test with Mock Data (Current State)
```bash
# Open the app
http://localhost:5173

# Navigate to Calendar tab
# You should see mock events in Agenda and Week views
```

### 2. Test with Real Calendar Data

After implementing the steps above:

1. **Sign in with Microsoft Teams** (if not already signed in)
2. **Grant Calendar Permissions** when prompted
3. **Navigate to Calendar Tab**
4. **Verify** you can see your real Outlook calendar events
5. **Test Smart Scheduling**:
   - Go to a task with a reminder
   - Click "Suggest Times" in the scheduling panel
   - Schedule the task on your calendar

### 3. Test Creating Events

From the scheduling panel:
```typescript
// When user clicks "Schedule" button
await outlookCalendarService.createEventFromTask(task, startTime, endTime);
// This should create a real event in Outlook Calendar
```

## API Endpoints Summary

### Backend Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/calendar/events` | Fetch calendar events for date range |
| POST | `/calendar/events` | Create new calendar event |
| GET | `/calendar/freebusy` | Get free/busy schedule |
| DELETE | `/calendar/events/{event_id}` | Delete calendar event |

### Required Parameters

All endpoints require:
- `access_token` (query parameter) - Microsoft Graph access token with `Calendars.ReadWrite` permission

### Example Request

```bash
curl -X GET "http://localhost:8000/calendar/events?access_token=YOUR_TOKEN&start_date=2025-12-15T00:00:00Z&end_date=2025-12-22T00:00:00Z"
```

## Permissions Required

Your Microsoft App Registration must have:
- ✅ `Calendars.ReadWrite` (already added)
- ✅ `User.Read` (already have from Teams)
- ✅ `Chat.Read` (already have from Teams)

## Security Notes

1. **Never expose access tokens** - Always use them on the backend
2. **Token expiration** - Microsoft Graph tokens expire after 1 hour. Implement refresh logic:
   ```typescript
   // Check token expiration
   const tokenExpiry = localStorage.getItem('teams_token_expiry');
   if (Date.now() > parseInt(tokenExpiry)) {
     // Refresh token logic here
   }
   ```
3. **HTTPS only** - Use HTTPS in production
4. **CORS** - Backend already configured for localhost:5173

## Troubleshooting

### Issue: "Unauthorized: Invalid or expired access token"
**Solution**: Re-authenticate with Microsoft. Clear `teams_access_token` from localStorage and sign in again.

### Issue: "Calendars.ReadWrite permission not granted"
**Solution**:
1. Go to Azure Portal → Your App Registration → API Permissions
2. Verify `Calendars.ReadWrite` is added
3. Click "Grant admin consent"
4. Re-authenticate in the app

### Issue: Mock data still showing after switching to real API
**Solution**:
1. Verify `useMockData = false` in [outlookCalendarService.ts:18](frontend/src/services/outlookCalendarService.ts#L18)
2. Clear browser cache
3. Hard refresh (Ctrl+Shift+R)

### Issue: Calendar events not showing
**Solution**:
1. Check browser console for errors
2. Verify access token is valid: `localStorage.getItem('teams_access_token')`
3. Check backend logs for API errors
4. Test the Graph API directly: `https://graph.microsoft.com/v1.0/me/calendar/events`

## Next Steps

1. ✅ **Switch to real API** - Follow Steps 1-4 above
2. **Add token refresh logic** - Handle expired tokens
3. **Add error boundaries** - Show user-friendly errors
4. **Sync task updates** - Update calendar when task changes
5. **Add recurring events** - Support for recurring meetings
6. **Implement conflict detection** - Warn users of scheduling conflicts

## Support

- Microsoft Graph API Docs: https://learn.microsoft.com/en-us/graph/api/resources/calendar
- Calendar API Reference: https://learn.microsoft.com/en-us/graph/api/calendar-list-events

---

**Status**: Ready for integration. The Calendar tab is fully functional with mock data and ready to connect to your Outlook Calendar using the same OAuth setup as Teams.
