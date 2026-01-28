from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List

from ..core.database import get_db
from ..models.help_automation import HelpAutomationMethod, HelpAutomationStep
from ..schemas.help_automation import (
    HelpAutomationMethodCreate,
    HelpAutomationMethodResponse,
    HelpAutomationMethodListResponse,
    HelpRunRequest,
    HelpRunResponse
)

router = APIRouter(prefix="/help", tags=["help-automation"])


@router.post("/automation", response_model=HelpAutomationMethodResponse)
def create_automation_method(
    method_data: HelpAutomationMethodCreate,
    db: Session = Depends(get_db)
):
    """
    Save a new automation method with its steps.

    Returns the created method with all steps.
    """
    # Check if method_name already exists
    existing = db.query(HelpAutomationMethod).filter(
        HelpAutomationMethod.method_name == method_data.method_name
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Method with name '{method_data.method_name}' already exists"
        )

    # Create the method
    new_method = HelpAutomationMethod(
        method_name=method_data.method_name,
        description=method_data.description,
        created_by=method_data.created_by
    )

    db.add(new_method)
    db.flush()  # Get the ID before committing

    # Create the steps
    for step_data in method_data.steps:
        new_step = HelpAutomationStep(
            method_id=new_method.id,
            step_order=step_data.step_order,
            action_type=step_data.action_type,
            target=step_data.target,
            step_metadata=step_data.metadata  # Map to step_metadata column
        )
        db.add(new_step)

    db.commit()
    db.refresh(new_method)

    # Manually construct response to properly map step_metadata to metadata
    return HelpAutomationMethodResponse(
        id=new_method.id,
        method_name=new_method.method_name,
        description=new_method.description,
        created_by=new_method.created_by,
        created_at=new_method.created_at,
        updated_at=new_method.updated_at,
        steps=[
            {
                "id": step.id,
                "method_id": step.method_id,
                "step_order": step.step_order,
                "action_type": step.action_type,
                "target": step.target,
                "metadata": step.step_metadata or {},
                "created_at": step.created_at
            }
            for step in new_method.steps
        ]
    )


@router.get("/automation", response_model=List[HelpAutomationMethodListResponse])
def list_automation_methods(
    db: Session = Depends(get_db)
):
    """
    Get all automation methods (without step details).
    """
    methods = db.query(HelpAutomationMethod).all()

    # Convert to response format with step count
    response = []
    for method in methods:
        response.append({
            "id": method.id,
            "method_name": method.method_name,
            "description": method.description,
            "created_by": method.created_by,
            "created_at": method.created_at,
            "updated_at": method.updated_at,
            "step_count": len(method.steps)
        })

    return response


@router.get("/automation/{method_name}", response_model=HelpAutomationMethodResponse)
def get_automation_method(
    method_name: str,
    db: Session = Depends(get_db)
):
    """
    Get a specific automation method with all its ordered steps.
    """
    method = db.query(HelpAutomationMethod).filter(
        HelpAutomationMethod.method_name == method_name
    ).first()

    if not method:
        raise HTTPException(
            status_code=404,
            detail=f"Automation method '{method_name}' not found"
        )

    # Manually construct response to properly map step_metadata to metadata
    return HelpAutomationMethodResponse(
        id=method.id,
        method_name=method.method_name,
        description=method.description,
        created_by=method.created_by,
        created_at=method.created_at,
        updated_at=method.updated_at,
        steps=[
            {
                "id": step.id,
                "method_id": step.method_id,
                "step_order": step.step_order,
                "action_type": step.action_type,
                "target": step.target,
                "metadata": step.step_metadata or {},
                "created_at": step.created_at
            }
            for step in method.steps
        ]
    )


@router.post("/run", response_model=HelpRunResponse)
def run_automation_method(
    run_request: HelpRunRequest,
    db: Session = Depends(get_db)
):
    """
    Get steps for executing an automation method.

    This endpoint is called by the Help Bot to retrieve
    the recorded steps for a given method.
    """
    method = db.query(HelpAutomationMethod).filter(
        HelpAutomationMethod.method_name == run_request.method_name
    ).first()

    if not method:
        raise HTTPException(
            status_code=404,
            detail=f"Automation method '{run_request.method_name}' not found"
        )

    return HelpRunResponse(
        method_name=method.method_name,
        description=method.description,
        steps=[
            {
                "id": step.id,
                "method_id": step.method_id,
                "step_order": step.step_order,
                "action_type": step.action_type,
                "target": step.target,
                "metadata": step.step_metadata or {},
                "created_at": step.created_at
            }
            for step in method.steps
        ],
        total_steps=len(method.steps)
    )


@router.delete("/automation/{method_name}")
def delete_automation_method(
    method_name: str,
    db: Session = Depends(get_db)
):
    """
    Delete an automation method and all its steps.
    """
    method = db.query(HelpAutomationMethod).filter(
        HelpAutomationMethod.method_name == method_name
    ).first()

    if not method:
        raise HTTPException(
            status_code=404,
            detail=f"Automation method '{method_name}' not found"
        )

    db.delete(method)
    db.commit()

    return {"message": f"Automation method '{method_name}' deleted successfully"}
