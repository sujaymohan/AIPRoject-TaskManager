from typing import List
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.database import get_db
from app.models.task import Task
from app.models.reminder import Reminder, ReminderStatus
from app.schemas.reminder import ReminderCreate, ReminderResponse

router = APIRouter(tags=["reminders"])


class ReminderUpdate(BaseModel):
    """Schema for updating a reminder."""
    remind_at: datetime


class SnoozeRequest(BaseModel):
    """Schema for snoozing a reminder."""
    minutes: int  # Number of minutes to snooze


@router.post("/tasks/{task_id}/reminders", response_model=ReminderResponse)
def create_reminder(task_id: int, request: ReminderCreate, db: Session = Depends(get_db)):
    """Create a reminder for a task."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Validation: Ensure reminder is not in the past
    now = datetime.utcnow()
    if request.remind_at <= now:
        raise HTTPException(
            status_code=400,
            detail="Reminder time must be in the future"
        )

    reminder = Reminder(
        task_id=task_id,
        remind_at=request.remind_at,
        status=ReminderStatus.PENDING,
    )
    db.add(reminder)
    db.commit()
    db.refresh(reminder)

    return ReminderResponse(
        id=reminder.id,
        task_id=reminder.task_id,
        remind_at=reminder.remind_at,
        status=reminder.status,
        created_at=reminder.created_at,
        task_text=task.clean_text,
    )


@router.get("/reminders", response_model=List[ReminderResponse])
def get_reminders(db: Session = Depends(get_db)):
    """Get all reminders."""
    reminders = (
        db.query(Reminder)
        .join(Task)
        .filter(Task.user_id == "1")
        .order_by(Reminder.remind_at)
        .all()
    )

    return [
        ReminderResponse(
            id=r.id,
            task_id=r.task_id,
            remind_at=r.remind_at,
            status=r.status,
            created_at=r.created_at,
            task_text=r.task.clean_text,
        )
        for r in reminders
    ]


@router.get("/reminders/pending", response_model=List[ReminderResponse])
def get_pending_reminders(db: Session = Depends(get_db)):
    """Get pending reminders."""
    reminders = (
        db.query(Reminder)
        .join(Task)
        .filter(Task.user_id == "1", Reminder.status == ReminderStatus.PENDING)
        .order_by(Reminder.remind_at)
        .all()
    )

    return [
        ReminderResponse(
            id=r.id,
            task_id=r.task_id,
            remind_at=r.remind_at,
            status=r.status,
            created_at=r.created_at,
            task_text=r.task.clean_text,
        )
        for r in reminders
    ]


@router.get("/notifications", response_model=List[ReminderResponse])
def get_notifications(db: Session = Depends(get_db)):
    """Get reminders that are due (for polling)."""
    now = datetime.utcnow()
    reminders = (
        db.query(Reminder)
        .join(Task)
        .filter(
            Task.user_id == "1",
            Reminder.status == ReminderStatus.PENDING,
            Reminder.remind_at <= now,
        )
        .order_by(Reminder.remind_at)
        .all()
    )

    return [
        ReminderResponse(
            id=r.id,
            task_id=r.task_id,
            remind_at=r.remind_at,
            status=r.status,
            created_at=r.created_at,
            task_text=r.task.clean_text,
        )
        for r in reminders
    ]


@router.patch("/reminders/{reminder_id}", response_model=ReminderResponse)
def update_reminder(reminder_id: int, request: ReminderUpdate, db: Session = Depends(get_db)):
    """Update a reminder's time."""
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    # Validation: Ensure new time is in the future
    now = datetime.utcnow()
    if request.remind_at <= now:
        raise HTTPException(
            status_code=400,
            detail="Reminder time must be in the future"
        )

    reminder.remind_at = request.remind_at
    reminder.status = ReminderStatus.PENDING  # Reset to pending if it was sent
    db.commit()
    db.refresh(reminder)

    return ReminderResponse(
        id=reminder.id,
        task_id=reminder.task_id,
        remind_at=reminder.remind_at,
        status=reminder.status,
        created_at=reminder.created_at,
        task_text=reminder.task.clean_text,
    )


@router.post("/reminders/{reminder_id}/snooze", response_model=ReminderResponse)
def snooze_reminder(reminder_id: int, request: SnoozeRequest, db: Session = Depends(get_db)):
    """Snooze a reminder by X minutes."""
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    # Validation: minutes must be positive
    if request.minutes <= 0:
        raise HTTPException(status_code=400, detail="Snooze time must be positive")

    # Add minutes to current remind_at
    now = datetime.utcnow()
    new_time = max(now, reminder.remind_at) + timedelta(minutes=request.minutes)

    reminder.remind_at = new_time
    reminder.status = ReminderStatus.PENDING  # Reset to pending
    db.commit()
    db.refresh(reminder)

    return ReminderResponse(
        id=reminder.id,
        task_id=reminder.task_id,
        remind_at=reminder.remind_at,
        status=reminder.status,
        created_at=reminder.created_at,
        task_text=reminder.task.clean_text,
    )


@router.delete("/reminders/{reminder_id}")
def delete_reminder(reminder_id: int, db: Session = Depends(get_db)):
    """Delete a reminder."""
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    db.delete(reminder)
    db.commit()
    return {"message": "Reminder deleted successfully"}
