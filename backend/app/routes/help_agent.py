from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Literal
from groq import Groq
from app.core.config import settings

router = APIRouter(prefix="/help", tags=["help"])

# Configure Groq client
groq_client = Groq(api_key=settings.GROQ_API_KEY)

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
• Use selectors that match the actual app IDs:
  - #add-tasks-btn (Add Tasks button)
  - #teams-btn (Teams button)
  - #analyze-btn (Analyze Message button)
  - #improve-all-btn (Improve Tasks button)
  - #kanban-board (Kanban board)
  - #list-view (List view)
  - #graph-view (Dependency graph)
  - #tree-view (Tree/Flowchart view)
  - #task-input (Task input textarea)
  - #message-input (Message analyzer input)
  - #teams-auth-modal (Teams authentication modal)
  - #microsoft-login-btn (Microsoft login button)
  - #demo-mode-btn (Demo mode button)
  - #mentions-list (Teams mentions list)
  - .mention-checkbox (Mention checkboxes)
  - #extract-tasks-btn (Extract tasks button)
  - #settings-btn (Settings button)
  - #reminders-btn (Reminders button)
  - #theme-toggle (Theme toggle button)
• Only include actions that make sense for the requested task
• If no UI action is needed, return an empty array []

--------------------------------
APPLICATION CONTEXT
--------------------------------
The app includes:
• Kanban Board (To Do / In Progress / Done)
• List View
• Dependency Graph
• Flowchart / Tree View
• Add Tasks (paste text → AI parse)
• Analyze Message
• Improve Tasks (re-analysis)
• Microsoft Teams Integration
• Task Details Drawer
• AI Suggestions (Message, Email, Deploy Checklist)
• Reminders & Notifications
• Sorting & Filtering
• Dark/Light Theme
• Demo Mode

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


@router.post("/ask", response_model=HelpAgentResponse)
async def ask_help_agent(request: HelpAgentRequest):
    """
    Ask the TaskFlow AI Help Agent for guidance on how to use features.
    Returns both a human-readable guide and machine-executable actions.
    """
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
            machine_actions = [MachineAction(**action) for action in actions_list]
        except json.JSONDecodeError:
            # If parsing fails, return empty actions
            machine_actions = []

        return HelpAgentResponse(
            human_guide=human_guide,
            machine_actions=machine_actions,
            query=request.query
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Help agent error: {str(e)}")
