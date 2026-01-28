from app.routes.tasks import router as tasks_router
from app.routes.reminders import router as reminders_router
from app.routes.graph import router as graph_router
from app.routes.teams import router as teams_router
from app.routes.help_agent import router as help_router
from app.routes.calendar import router as calendar_router
from app.routes.quota import router as quota_router
from app.routes.help_automation import router as help_automation_router

__all__ = ["tasks_router", "reminders_router", "graph_router", "teams_router", "help_router", "calendar_router", "quota_router", "help_automation_router"]
