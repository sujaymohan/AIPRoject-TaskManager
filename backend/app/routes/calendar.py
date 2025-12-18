"""
Calendar routes for Outlook Calendar integration via Microsoft Graph API
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from pydantic import BaseModel
import httpx
from datetime import datetime

router = APIRouter(prefix="/calendar", tags=["calendar"])

GRAPH_API_BASE = "https://graph.microsoft.com/v1.0"


class CalendarEventCreate(BaseModel):
    subject: str
    start: str  # ISO datetime
    end: str  # ISO datetime
    body: Optional[str] = None
    location: Optional[str] = None
    task_id: Optional[int] = None


@router.get("/events")
async def get_calendar_events(
    access_token: str = Query(..., description="Microsoft Graph access token"),
    start_date: str = Query(..., description="Start date (ISO format)"),
    end_date: str = Query(..., description="End date (ISO format)"),
):
    """
    Fetch calendar events from Outlook Calendar via Microsoft Graph API
    Requires Calendars.Read or Calendars.ReadWrite permission
    """
    try:
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }

        # Build the Graph API request
        params = {
            "$select": "subject,start,end,isAllDay,showAs,type,organizer,location,webLink,body,isCancelled",
            "$filter": f"start/dateTime ge '{start_date}' and end/dateTime le '{end_date}'",
            "$orderby": "start/dateTime",
            "$top": 100,
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{GRAPH_API_BASE}/me/calendar/events",
                headers=headers,
                params=params,
                timeout=30.0,
            )

            if response.status_code == 401:
                raise HTTPException(status_code=401, detail="Unauthorized: Invalid or expired access token")
            elif response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Microsoft Graph API error: {response.text}"
                )

            data = response.json()

            # Transform Graph API response to our format
            events = []
            for event in data.get("value", []):
                events.append({
                    "id": event["id"],
                    "subject": event["subject"],
                    "start": event["start"]["dateTime"],
                    "end": event["end"]["dateTime"],
                    "isAllDay": event.get("isAllDay", False),
                    "status": event.get("showAs", "busy").lower(),
                    "type": event.get("type", "singleInstance"),
                    "organizer": event.get("organizer", {}).get("emailAddress", {}).get("name"),
                    "location": event.get("location", {}).get("displayName"),
                    "webLink": event.get("webLink"),
                    "body": event.get("body", {}).get("content"),
                    "isCancelled": event.get("isCancelled", False),
                    "taskId": None,  # We'll need to track this separately
                })

            return {"events": events, "count": len(events)}

    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Network error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/events")
async def create_calendar_event(
    event: CalendarEventCreate,
    access_token: str = Query(..., description="Microsoft Graph access token"),
):
    """
    Create a calendar event in Outlook Calendar via Microsoft Graph API
    Requires Calendars.ReadWrite permission
    """
    try:
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }

        # Build event payload for Graph API
        event_payload = {
            "subject": event.subject,
            "start": {
                "dateTime": event.start,
                "timeZone": "UTC"
            },
            "end": {
                "dateTime": event.end,
                "timeZone": "UTC"
            },
        }

        if event.body:
            event_payload["body"] = {
                "contentType": "text",
                "content": event.body
            }

        if event.location:
            event_payload["location"] = {
                "displayName": event.location
            }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{GRAPH_API_BASE}/me/calendar/events",
                headers=headers,
                json=event_payload,
                timeout=30.0,
            )

            if response.status_code == 401:
                raise HTTPException(status_code=401, detail="Unauthorized: Invalid or expired access token")
            elif response.status_code not in [200, 201]:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Microsoft Graph API error: {response.text}"
                )

            created_event = response.json()

            # Transform response
            return {
                "id": created_event["id"],
                "subject": created_event["subject"],
                "start": created_event["start"]["dateTime"],
                "end": created_event["end"]["dateTime"],
                "isAllDay": created_event.get("isAllDay", False),
                "status": created_event.get("showAs", "busy").lower(),
                "webLink": created_event.get("webLink"),
                "taskId": event.task_id,
            }

    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Network error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/freebusy")
async def get_free_busy(
    access_token: str = Query(..., description="Microsoft Graph access token"),
    start_date: str = Query(..., description="Start date (ISO format)"),
    end_date: str = Query(..., description="End date (ISO format)"),
):
    """
    Get free/busy schedule information via Microsoft Graph API
    Requires Calendars.Read or Calendars.ReadWrite permission
    """
    try:
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }

        # Build schedule request payload
        payload = {
            "schedules": ["user@domain.com"],  # Will be replaced with actual user email
            "startTime": {
                "dateTime": start_date,
                "timeZone": "UTC"
            },
            "endTime": {
                "dateTime": end_date,
                "timeZone": "UTC"
            },
            "availabilityViewInterval": 60  # 60-minute intervals
        }

        async with httpx.AsyncClient() as client:
            # First get user email
            user_response = await client.get(
                f"{GRAPH_API_BASE}/me",
                headers=headers,
                timeout=30.0,
            )

            if user_response.status_code != 200:
                raise HTTPException(
                    status_code=user_response.status_code,
                    detail="Failed to get user information"
                )

            user_email = user_response.json().get("mail") or user_response.json().get("userPrincipalName")
            payload["schedules"] = [user_email]

            # Get schedule
            response = await client.post(
                f"{GRAPH_API_BASE}/me/calendar/getSchedule",
                headers=headers,
                json=payload,
                timeout=30.0,
            )

            if response.status_code == 401:
                raise HTTPException(status_code=401, detail="Unauthorized: Invalid or expired access token")
            elif response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Microsoft Graph API error: {response.text}"
                )

            data = response.json()
            schedule = data.get("value", [])[0] if data.get("value") else {}

            # Transform to our format
            time_slots = []
            for item in schedule.get("scheduleItems", []):
                time_slots.append({
                    "start": item["start"]["dateTime"],
                    "end": item["end"]["dateTime"],
                    "status": item.get("status", "busy").lower()
                })

            return {"time_slots": time_slots}

    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Network error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/events/{event_id}")
async def delete_calendar_event(
    event_id: str,
    access_token: str = Query(..., description="Microsoft Graph access token"),
):
    """
    Delete a calendar event from Outlook Calendar via Microsoft Graph API
    Requires Calendars.ReadWrite permission
    """
    try:
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{GRAPH_API_BASE}/me/calendar/events/{event_id}",
                headers=headers,
                timeout=30.0,
            )

            if response.status_code == 401:
                raise HTTPException(status_code=401, detail="Unauthorized: Invalid or expired access token")
            elif response.status_code == 404:
                raise HTTPException(status_code=404, detail="Event not found")
            elif response.status_code != 204:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Microsoft Graph API error: {response.text}"
                )

            return {"message": "Event deleted successfully"}

    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Network error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
