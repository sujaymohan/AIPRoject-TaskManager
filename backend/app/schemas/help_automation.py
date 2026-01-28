from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class HelpAutomationStepBase(BaseModel):
    """Base schema for automation step"""
    step_order: int = Field(..., ge=0, description="Order of the step (0-indexed)")
    action_type: str = Field(..., description="Type of action (BUTTON_CLICK, TAB_OPEN, etc.)")
    target: str = Field(..., description="Target element (button label, tab name, route)")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional context as JSON")


class HelpAutomationStepCreate(HelpAutomationStepBase):
    """Schema for creating a new automation step"""
    pass


class HelpAutomationStepResponse(BaseModel):
    """Schema for automation step in responses"""
    id: str
    method_id: str
    step_order: int = Field(..., ge=0, description="Order of the step (0-indexed)")
    action_type: str = Field(..., description="Type of action (BUTTON_CLICK, TAB_OPEN, etc.)")
    target: str = Field(..., description="Target element (button label, tab name, route)")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional context as JSON", alias="step_metadata")
    created_at: datetime

    model_config = {
        "from_attributes": True,
        "populate_by_name": True
    }


class HelpAutomationMethodBase(BaseModel):
    """Base schema for automation method"""
    method_name: str = Field(..., min_length=1, max_length=100, description="Unique method name")
    description: Optional[str] = Field(default=None, description="Optional method description")


class HelpAutomationMethodCreate(HelpAutomationMethodBase):
    """Schema for creating a new automation method with steps"""
    steps: List[HelpAutomationStepCreate] = Field(..., min_length=1, description="List of steps to record")
    created_by: str = Field(default="1", description="User ID who created the method")


class HelpAutomationMethodResponse(HelpAutomationMethodBase):
    """Schema for automation method in responses"""
    id: str
    created_by: str
    created_at: datetime
    updated_at: datetime
    steps: List[HelpAutomationStepResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


class HelpAutomationMethodListResponse(HelpAutomationMethodBase):
    """Schema for listing automation methods (without steps)"""
    id: str
    created_by: str
    created_at: datetime
    updated_at: datetime
    step_count: int = Field(default=0, description="Number of steps in this method")

    class Config:
        from_attributes = True


class HelpRunRequest(BaseModel):
    """Request to run an automation method"""
    method_name: str = Field(..., description="Name of the method to execute")


class HelpRunResponse(BaseModel):
    """Response containing steps for execution"""
    method_name: str
    description: Optional[str]
    steps: List[HelpAutomationStepResponse]
    total_steps: int

    class Config:
        from_attributes = True
