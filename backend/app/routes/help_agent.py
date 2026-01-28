from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional, Literal
from groq import Groq
import time
import threading
import logging
from app.core.config import settings
from app.core.database import get_db
from app.models.help_automation import HelpAutomationMethod

logger = logging.getLogger(__name__)


def _log_groq_quota(success: bool, response_time_ms: float):
    """Log Groq API call to quota service (called in background thread)."""
    try:
        from app.core.database import SessionLocal
        from app.services.quota_service import QuotaService

        db = SessionLocal()
        try:
            QuotaService.log_api_call(
                db,
                provider="Groq Llama",
                model="llama-3.3-70b-versatile",
                success=success,
                response_time_ms=response_time_ms,
                daily_limit=500,
            )
        finally:
            db.close()
    except Exception as e:
        logger.warning(f"Failed to log Groq quota: {e}")

router = APIRouter(prefix="/help", tags=["help"])

# Configure Groq client
groq_client = Groq(api_key=settings.GROQ_API_KEY)

# Allowed selectors - actions with selectors not in this list will be filtered out
ALLOWED_SELECTORS = {
    # Header action buttons
    "#add-tasks-btn",
    "#teams-btn",
    "#analyze-btn",
    "#improve-all-btn",
    "#settings-btn",
    "#help-fab",

    # View switcher buttons
    "#kanban-view-btn",
    "#list-view-btn",
    "#graph-view-btn",
    "#visualize-view-btn",
    "#calendar-view-btn",

    # Kanban board
    "#kanban-column-todo",
    "#kanban-column-in_progress",
    "#kanban-column-done",
    ".kanban-task-card",
    ".kanban-column",
    ".kanban-modal",
    ".kanban-modal-overlay",
    "[data-task-id]",

    # Teams modal
    ".teams-modal",
    ".teams-modal-overlay",
    ".teams-modal-header",
    ".teams-modal-content",
    ".teams-modal-footer",
    ".demo-data-btn",
    ".teams-mentions-list",
    ".teams-mention-item",
    ".mention-checkbox",
    ".teams-process-btn",
    ".teams-cancel-btn",
    ".teams-filter-popup",
    ".teams-selection-controls",
    "#mention-limit",

    # Help agent modal
    ".help-agent-modal",
    ".quick-question-btn",
    ".run-automation-btn",
    ".send-btn",
    ".modal-header",
    ".modal-body",
    ".modal-footer",

    # Message analyzer
    ".analyzer-modal",
    ".analyzer-input-section",
    ".analyzer-content",
    ".clear-btn",

    # Task paste area
    ".task-paste-area",
    ".primary-btn",

    # Settings panel
    ".settings-panel",

    # Reminder panel
    ".reminder-panel",
    ".reminder-header",
    ".reminder-content",

    # Task detail panel
    ".task-detail-panel",
    ".task-detail-modal",
    ".task-detail-content",

    # Delete all modal
    ".delete-all-modal",
    ".delete-all-modal-overlay",
    ".delete-all-modal-confirm",
    ".delete-all-modal-cancel",

    # Common elements
    ".close-btn",
    ".modal-overlay",
    ".delete-btn",
    ".header-btn",
    ".icon-btn",
    ".theme-toggle",
    ".view-toggle-segmented",
}

# Selector patterns that are explicitly forbidden (AI hallucinations)
FORBIDDEN_SELECTOR_PATTERNS = [
    ".status-option",
    ".dropdown",
    "select",
    ".status-select",
    ".status-btn",
    ".change-status",
]


def is_selector_allowed(selector: str) -> bool:
    """
    Validate that a selector is in the allowed list.
    Returns False for forbidden patterns or unknown selectors.
    """
    # Check for forbidden patterns
    selector_lower = selector.lower()
    for pattern in FORBIDDEN_SELECTOR_PATTERNS:
        if pattern in selector_lower:
            return False

    # Check if selector matches allowed list
    # Exact match
    if selector in ALLOWED_SELECTORS:
        return True

    # Check for data-task-id attribute selector (allows [data-task-id="123"])
    if selector.startswith("[data-task-id"):
        return True

    # Check for task-card ID selector (allows #task-card-123)
    if selector.startswith("#task-card-"):
        return True

    return False

class MachineAction(BaseModel):
    action: Literal['move', 'click', 'input', 'type', 'wait', 'open', 'scroll', 'tooltip']
    selector: str
    message: Optional[str] = None
    value: Optional[str] = None
    delay: Optional[int] = None

class HelpAgentRequest(BaseModel):
    query: str

class HelpAgentResponse(BaseModel):
    human_guide: str
    machine_actions: List[MachineAction]
    query: str
    automation_method: Optional[str] = None  # Name of matched automation method if found

# System prompt for the Help Agent
HELP_AGENT_PROMPT = """You are the TaskFlow AI Help Agent.

You are an expert guide for the TaskFlow AI application — an AI-powered task management system that parses messy text into clean, categorized, actionable tasks with dependencies, reminders, and visualizations.

Your role is to:
1. Help users understand how to use features
2. Guide users step-by-step in plain human language
3. Generate a structured MACHINE ACTION PLAN that the UI automation layer can execute

You ALWAYS respond in TWO SECTIONS:

========================
HUMAN GUIDE
========================
A clear, friendly, step-by-step explanation written for a human.
• Short numbered steps
• Clear feature names as they appear in the UI
• No technical jargon
• Assume the user is inside the TaskFlow AI app

========================
MACHINE ACTION PLAN
========================
A valid JSON array describing UI actions.
Each action object MUST follow this schema:

{
  "action": "move" | "click" | "input" | "type" | "wait" | "open" | "scroll" | "tooltip",
  "selector": "CSS_SELECTOR_OR_UNIQUE_ID",
  "message": "Optional tooltip text shown to the user",
  "value": "Optional input value (for type/input actions)",
  "delay": number (milliseconds)
}

Action Types:
- "move": Animate pointer to element and highlight it
- "click": Move to element and trigger click
- "input" or "type": Type text into an input field character by character
- "wait": Wait for element to appear in DOM
- "scroll": Scroll element into view
- "open": Navigate to URL or hash
- "tooltip": Show tooltip message at element

Rules:
• The JSON must be valid and parseable
• Do NOT include comments in JSON
• Use realistic delays (800–1500ms)

CRITICAL SELECTOR RULES:
• You MUST ONLY use selectors from the ALLOWED SELECTORS list below
• NEVER invent, guess, or fabricate selectors that are not in this list
• If a selector you need is not listed, DO NOT use it - return an empty array instead
• NEVER use dropdown selectors (.status-option*, select, .dropdown*, etc.) - they do not exist
• Status changes are ONLY done via drag-and-drop in Kanban view

ALLOWED SELECTORS (use ONLY these):

HEADER BUTTONS:
  - #add-tasks-btn (Add Tasks button - opens task input)
  - #teams-btn (Teams button - opens Teams mentions modal)
  - #analyze-btn (Analyze button - opens message analyzer)
  - #improve-all-btn (Improve button - re-analyzes existing tasks)
  - #settings-btn (Settings button - opens settings panel)
  - #help-fab (Help floating button - opens help modal)

VIEW SWITCHER:
  - #kanban-view-btn (Kanban view - board with columns)
  - #list-view-btn (List view - task list)
  - #graph-view-btn (Graph view - dependency graph)
  - #visualize-view-btn (Visualize view - tree/flowchart)
  - #calendar-view-btn (Calendar view)

KANBAN BOARD:
  - #kanban-column-todo (To Do column)
  - #kanban-column-in_progress (In Progress column)
  - #kanban-column-done (Done column)
  - .kanban-task-card (Task cards - draggable)
  - [data-task-id] (Individual task cards)

TEAMS MODAL:
  - .demo-data-btn (Demo mode button)
  - .teams-mentions-list (List of mentions)
  - .teams-mention-item (Individual mention item)
  - .mention-checkbox (Checkbox to select mention)
  - .teams-process-btn (Send to AI button)
  - #mention-limit (Mention limit input)

HELP MODAL:
  - .help-agent-modal (Help modal container)
  - .quick-question-btn (Quick question buttons)
  - .run-automation-btn (Show Me button)
  - .send-btn (Send question button)

MESSAGE ANALYZER:
  - .analyzer-modal (Analyzer modal)
  - .analyzer-input-section (Input section)

PANELS:
  - .settings-panel (Settings panel)
  - .reminder-panel (Reminders panel - displays pending reminders)
  - .reminder-header (Click to expand/collapse reminders list)
  - .reminder-content (Reminders list content area)
  - .task-detail-panel (Task detail side panel)
  - .task-detail-modal (Task detail container)

COMMON:
  - .close-btn (Close button on modals)
  - .modal-overlay (Modal backdrop)
  - .theme-toggle (Dark/light mode toggle)

• Only include actions that make sense for the requested task
• If no UI action is needed, return an empty array []
• If the action cannot be shown with allowed selectors, return an empty array []

--------------------------------
APPLICATION CONTEXT
--------------------------------
The app includes:
• Kanban Board (To Do / In Progress / Done) - Main view for task management
• List View
• Dependency Graph
• Flowchart / Tree View
• Add Tasks (paste text → AI parse)
• Analyze Message
• Improve Tasks (re-analysis)
• Microsoft Teams Integration
• Task Details Drawer with full task management options
• AI Suggestions (Message, Email, Deploy Checklist)
• Reminders & Notifications (set on individual tasks)
• Sorting & Filtering
• Dark/Light Theme
• Demo Mode

--------------------------------
CHANGING TASK STATUS
--------------------------------
IMPORTANT: Status changes are ONLY done via DRAG AND DROP in Kanban view.
There are NO dropdown menus, NO select boxes, NO status buttons for changing status.

To change a task's status (To Do → In Progress → Done):
1. Switch to Kanban view using #kanban-view-btn
2. DRAG AND DROP a task card from one column to another:
   - Drag from "To Do" column (#kanban-column-todo) to "In Progress" (#kanban-column-in_progress)
   - Drag from "In Progress" to "Done" (#kanban-column-done)
3. The three columns are:
   - To Do (todo) - Tasks not yet started
   - In Progress (in_progress) - Tasks being worked on
   - Done (done) - Completed tasks

Visual walkthrough for status change MUST use ONLY these selectors:
   - #kanban-view-btn (to switch to Kanban)
   - .kanban-task-card (to highlight a task card)
   - #kanban-column-todo, #kanban-column-in_progress, #kanban-column-done (to highlight columns)

DO NOT use any other selectors for status changes. DO NOT invent selectors.

--------------------------------
SETTING REMINDERS ON TASKS
--------------------------------
IMPORTANT: Reminders are set WITHIN the Task Detail Panel (right sidebar), NOT in the Reminder Panel.
The Reminder Panel at top just displays pending/active reminders.

To set a reminder on a task:
1. Find the task in any view (Kanban, List, Calendar, etc.)
2. Click on the task card/row to open the Task Detail Panel (.task-detail-panel)
3. Look for the "Reminders" or "Set Reminder" section in the panel
4. Enter the reminder date in the date input field
5. Enter the reminder time in the time input field
6. Click the "Set Reminder" button to save
7. The reminder will appear in the .reminder-panel at the top of the screen

Visual walkthrough for setting reminders SHOULD show:
   - Click on a task card (.kanban-task-card or task from list)
   - Highlight the .task-detail-panel that opens on the right
   - Highlight the date/time input fields within the panel
   - Show confirmation in .reminder-panel at top

Use these selectors for reminder walkthroughs:
   - .kanban-task-card (click on a task to open details)
   - .task-detail-panel (highlights where reminder inputs are)
   - .task-detail-modal (container for task detail)
   - .reminder-panel (shows final confirmation)
   - .reminder-header (optional: show where to view all reminders)

--------------------------------
BEHAVIOR RULES
--------------------------------
• Be concise but confident
• Never mention internal APIs or models
• Never explain what JSON is
• Never ask unnecessary follow-up questions
• If the user asks "how do I…", assume they want UI guidance
• If the user asks "what is…", explain without UI actions unless helpful
• Prefer showing actions over describing menus

Your response MUST be formatted exactly as follows:

========================
HUMAN GUIDE
========================
[Your step-by-step guide here]

========================
MACHINE ACTION PLAN
========================
[Valid JSON array here]

Now respond to the user's query."""


def match_automation_method(query: str, db: Session) -> Optional[HelpAutomationMethod]:
    """
    Attempt to match user query to an existing automation method.
    Uses simple keyword matching on method_name and description.
    Returns the best matching method or None.
    """
    query_lower = query.lower()

    # Get all methods
    methods = db.query(HelpAutomationMethod).all()

    if not methods:
        return None

    # Score each method based on keyword matches
    best_match = None
    best_score = 0

    for method in methods:
        score = 0
        method_name_words = method.method_name.replace('_', ' ').lower().split()

        # Check method name keywords
        for word in method_name_words:
            if len(word) > 3 and word in query_lower:
                score += 2

        # Check description if available
        if method.description:
            desc_words = method.description.lower().split()
            for word in desc_words:
                if len(word) > 4 and word in query_lower:
                    score += 1

        if score > best_score:
            best_score = score
            best_match = method

    # Return match only if score is significant
    return best_match if best_score >= 2 else None


def convert_automation_to_machine_actions(method: HelpAutomationMethod) -> List[MachineAction]:
    """
    Convert recorded automation steps to machine actions format.
    Maps action types and adds appropriate delays.
    """
    machine_actions = []

    for step in method.steps:
        action_type_map = {
            'BUTTON_CLICK': 'click',
            'TAB_OPEN': 'click',
            'TAB_CLOSE': 'click',
            'VIEW_CHANGE': 'click',
            'MODAL_OPEN': 'click',
            'MODAL_CLOSE': 'click',
            'FORM_SUBMIT': 'click',
            'ROUTE_CHANGE': 'open'
        }

        action_type = action_type_map.get(step.action_type, 'click')

        # Extract metadata fields (use step_metadata column)
        metadata = step.step_metadata or {}
        selector = metadata.get('selector', f'#{step.target.lower().replace(" ", "-")}')

        machine_action = MachineAction(
            action=action_type,
            selector=selector,
            message=f"{step.action_type.replace('_', ' ').title()}: {step.target}",
            delay=1000
        )

        # Only add if selector is allowed
        if is_selector_allowed(selector):
            machine_actions.append(machine_action)

    return machine_actions


@router.post("/ask", response_model=HelpAgentResponse)
async def ask_help_agent(request: HelpAgentRequest, db: Session = Depends(get_db)):
    """
    Ask the TaskFlow AI Help Agent for guidance on how to use features.
    First checks for recorded automation methods, then falls back to AI.
    Returns both a human-readable guide and machine-executable actions.
    """
    start_time = time.time()

    # First, try to match with recorded automation methods
    matched_method = match_automation_method(request.query, db)

    if matched_method:
        logger.info(f"Matched automation method: {matched_method.method_name}")

        # Convert recorded steps to machine actions
        machine_actions = convert_automation_to_machine_actions(matched_method)

        # Generate human guide from recorded steps
        human_guide = f"**{matched_method.description or 'Recorded Help Flow'}**\n\n"
        human_guide += "Here's a step-by-step walkthrough:\n\n"

        for step in matched_method.steps:
            human_guide += f"{step.step_order + 1}. {step.action_type.replace('_', ' ').title()}: **{step.target}**\n"

        human_guide += "\n_This is a pre-recorded help flow. Click 'Show Me' to see it in action._"

        return HelpAgentResponse(
            human_guide=human_guide,
            machine_actions=machine_actions,
            query=request.query,
            automation_method=matched_method.method_name
        )

    # No match found, fall back to AI generation
    try:
        # Use Groq's free API with llama model
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": HELP_AGENT_PROMPT
                },
                {
                    "role": "user",
                    "content": request.query
                }
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            max_tokens=2048
        )
        response_time_ms = (time.time() - start_time) * 1000

        # Log successful API call
        threading.Thread(
            target=_log_groq_quota,
            args=(True, response_time_ms),
            daemon=True,
        ).start()

        response_text = chat_completion.choices[0].message.content

        # Parse the response
        human_guide = ""
        machine_actions_json = ""

        # Split by the section markers
        sections = response_text.split("========================")

        for i, section in enumerate(sections):
            if "HUMAN GUIDE" in section:
                # Get the next section content
                if i + 1 < len(sections):
                    human_guide = sections[i + 1].strip()
                    # Remove the next section header
                    if "MACHINE ACTION PLAN" in human_guide:
                        human_guide = human_guide.split("MACHINE ACTION PLAN")[0].strip()

            if "MACHINE ACTION PLAN" in section:
                # Get the next section content
                if i + 1 < len(sections):
                    machine_actions_json = sections[i + 1].strip()

        # Clean up the JSON - remove code fences if present
        if machine_actions_json.startswith("```json"):
            machine_actions_json = machine_actions_json[7:]
        if machine_actions_json.startswith("```"):
            machine_actions_json = machine_actions_json[3:]
        if machine_actions_json.endswith("```"):
            machine_actions_json = machine_actions_json[:-3]
        machine_actions_json = machine_actions_json.strip()

        # Parse the JSON
        import json
        try:
            actions_list = json.loads(machine_actions_json)
            raw_actions = [MachineAction(**action) for action in actions_list]

            # Filter out actions with invalid/forbidden selectors
            machine_actions = []
            for action in raw_actions:
                if is_selector_allowed(action.selector):
                    machine_actions.append(action)
                else:
                    print(f"[HELP_AGENT] Filtered invalid selector: {action.selector}")

        except json.JSONDecodeError:
            # If parsing fails, return empty actions
            machine_actions = []

        return HelpAgentResponse(
            human_guide=human_guide,
            machine_actions=machine_actions,
            query=request.query,
            automation_method=None
        )

    except Exception as e:
        # Log failed API call
        response_time_ms = (time.time() - start_time) * 1000
        threading.Thread(
            target=_log_groq_quota,
            args=(False, response_time_ms),
            daemon=True,
        ).start()
        raise HTTPException(status_code=500, detail=f"Help agent error: {str(e)}")
