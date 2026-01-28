from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from ..core.database import Base


class HelpAutomationMethod(Base):
    """Stores named automation methods that can be called by the Help Bot"""
    __tablename__ = "help_automation_methods"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    method_name = Column(String, unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    created_by = Column(String, nullable=False, default="1")  # User ID
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationship to steps
    steps = relationship(
        "HelpAutomationStep",
        back_populates="method",
        cascade="all, delete-orphan",
        order_by="HelpAutomationStep.step_order"
    )

    def __repr__(self):
        return f"<HelpAutomationMethod(method_name='{self.method_name}', steps={len(self.steps)})>"


class HelpAutomationStep(Base):
    """Individual steps within an automation method"""
    __tablename__ = "help_automation_steps"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    method_id = Column(String, ForeignKey("help_automation_methods.id", ondelete="CASCADE"), nullable=False)
    step_order = Column(Integer, nullable=False)
    action_type = Column(String, nullable=False)  # BUTTON_CLICK, TAB_OPEN, VIEW_CHANGE, etc.
    target = Column(Text, nullable=False)  # Button label, tab name, route, etc.
    step_metadata = Column(JSON, nullable=True)  # Additional context as JSON (renamed to avoid SQLAlchemy conflict)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationship to parent method
    method = relationship("HelpAutomationMethod", back_populates="steps")

    def __repr__(self):
        return f"<HelpAutomationStep(order={self.step_order}, action='{self.action_type}', target='{self.target}')>"
