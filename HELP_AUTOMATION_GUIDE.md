# Help Bot Automation System

## Overview

The Help Bot Automation System allows users to record real UI interactions and save them as reusable help methods. These recorded flows can later be called by the Help Bot to demonstrate features to users.

## Architecture

### Backend Components

#### Database Models
- **`HelpAutomationMethod`** (`backend/app/models/help_automation.py`)
  - Stores named automation methods
  - Fields: `id`, `method_name`, `description`, `created_by`, `created_at`, `updated_at`
  - One-to-many relationship with steps

- **`HelpAutomationStep`** (`backend/app/models/help_automation.py`)
  - Individual steps within an automation method
  - Fields: `id`, `method_id`, `step_order`, `action_type`, `target`, `metadata`, `created_at`
  - Ordered by `step_order`

#### API Endpoints (`backend/app/routes/help_automation.py`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/help/automation` | Create new automation method with steps |
| GET | `/help/automation` | List all automation methods |
| GET | `/help/automation/{method_name}` | Get specific method with all steps |
| POST | `/help/run` | Get steps for executing a method |
| DELETE | `/help/automation/{method_name}` | Delete an automation method |

#### Help Agent Integration (`backend/app/routes/help_agent.py`)

The Help Agent now:
1. **First** checks for matching recorded automation methods
2. **Falls back** to AI generation if no match found
3. Uses simple keyword matching on `method_name` and `description`
4. Converts recorded steps to machine actions format

### Frontend Components

#### Event Capture Hook (`frontend/src/hooks/useHelpRecorder.ts`)
Custom React hook that manages recording state and captures events:
- `startRecording()` - Begins recording session
- `stopRecording()` - Ends recording and returns all steps
- `recordButtonClick(label, metadata)` - Records button click
- `recordTabOpen/Close(name, metadata)` - Records tab interactions
- `recordViewChange(name, metadata)` - Records view switches
- `recordModalOpen/Close(name, metadata)` - Records modal interactions
- `recordFormSubmit(name, metadata)` - Records form submissions
- `recordRouteChange(route, metadata)` - Records navigation

#### Recorder Context (`frontend/src/contexts/HelpRecorderContext.tsx`)
Global context provider that makes recorder accessible throughout the app.

#### Recording Panel (`frontend/src/components/HelpRecorderPanel.tsx`)
Floating UI panel with:
- **Start Recording** button
- Live step counter during recording
- **Stop Recording** button
- Save dialog for naming and describing flows
- Success/error messaging

#### Recordable Button Component (`frontend/src/components/RecordableButton.tsx`)
Wrapper component that automatically records clicks when recorder is active.

## Recording a Help Flow

### User Experience

1. **Start Recording**
   - Click the "Record Help Flow" button in the floating panel (bottom-right)
   - Panel shows "Recording..." with live step counter

2. **Perform Actions**
   - Use the app normally - all interactions are captured
   - Supported events:
     - Button clicks
     - Tab switches
     - View changes (Kanban, List, Graph, etc.)
     - Modal open/close
     - Form submissions
     - Route navigation

3. **Stop & Save**
   - Click "Stop Recording"
   - Enter a unique method name (e.g., `how_to_analyze_tasks`)
   - Optionally add a description
   - Click "Save Flow"

### Recorded Step Format

Each step is stored with:
```json
{
  "step_order": 0,
  "action_type": "BUTTON_CLICK",
  "target": "Analyze Tasks",
  "metadata": {
    "selector": "#analyze-btn",
    "route": "/tasks/analyze",
    "view": "kanban"
  }
}
```

### Action Types

- `BUTTON_CLICK` - User clicked a button
- `TAB_OPEN` - User opened a tab
- `TAB_CLOSE` - User closed a tab
- `VIEW_CHANGE` - User switched views (Kanban/List/Graph)
- `MODAL_OPEN` - User opened a modal dialog
- `MODAL_CLOSE` - User closed a modal dialog
- `FORM_SUBMIT` - User submitted a form
- `ROUTE_CHANGE` - User navigated to different route

## Using Recorded Flows

### Help Bot Integration

When a user asks the Help Bot a question:

1. **Query Matching**
   - System checks if query matches any recorded method names/descriptions
   - Uses keyword-based scoring (minimum score: 2)
   - Example: "how to analyze" matches `how_to_analyze_tasks`

2. **Response Generation**
   - If match found: Returns recorded steps as guide + machine actions
   - If no match: Falls back to AI-generated response

3. **Visual Walkthrough**
   - User clicks "Show Me" button
   - UI automation executes each recorded step
   - Visual highlights guide user through the flow

### Example Queries That Match Recorded Methods

| Query | Matches Method |
|-------|----------------|
| "How do I analyze tasks?" | `how_to_analyze_tasks` |
| "Show me the graph view" | `view_dependency_graph` |
| "How to create a reminder?" | `create_task_reminder` |
| "Switch to kanban board" | `switch_to_kanban_view` |

## Developer Guide

### Adding Recording to New Components

#### Option 1: Use RecordableButton

```tsx
import { RecordableButton } from './RecordableButton';

<RecordableButton
  actionLabel="Analyze Tasks"
  metadata={{ route: '/tasks/analyze' }}
  className="header-btn"
  onClick={handleAnalyze}
>
  Analyze
</RecordableButton>
```

#### Option 2: Use Recorder Context Directly

```tsx
import { useHelpRecorderContext } from '../contexts/HelpRecorderContext';

function MyComponent() {
  const { recordViewChange } = useHelpRecorderContext();

  const handleViewChange = (view: string) => {
    recordViewChange(view, { timestamp: Date.now() });
    // ... rest of logic
  };
}
```

### Custom Event Recording

```tsx
const { recordStep } = useHelpRecorderContext();

recordStep('CUSTOM_ACTION', 'Target Label', {
  customField: 'value',
  selector: '#my-element'
});
```

### Testing Recorded Methods

#### Via API

```bash
# List all methods
curl http://localhost:8000/help/automation

# Get specific method
curl http://localhost:8000/help/automation/how_to_analyze_tasks

# Test execution
curl -X POST http://localhost:8000/help/run \
  -H "Content-Type: application/json" \
  -d '{"method_name": "how_to_analyze_tasks"}'
```

#### Via Help Bot

1. Open Help Agent modal
2. Type: "how to analyze tasks"
3. Check response for automation method indicator
4. Click "Show Me" to execute

## Database Schema

### help_automation_methods

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| method_name | VARCHAR | Unique method identifier |
| description | TEXT | Optional description |
| created_by | VARCHAR | User ID who created it |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

### help_automation_steps

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| method_id | UUID | Foreign key to methods |
| step_order | INTEGER | Order of execution (0-indexed) |
| action_type | VARCHAR | Type of action |
| target | TEXT | Target element/label |
| metadata | JSONB | Additional context |
| created_at | TIMESTAMP | Creation timestamp |

## Best Practices

### Recording

1. **Plan your flow** - Know what feature you're demonstrating before recording
2. **Use clear names** - Method names should be descriptive (use snake_case)
3. **Add descriptions** - Help improve query matching accuracy
4. **Keep it simple** - Record 3-8 steps per flow for best UX
5. **Test immediately** - Verify the recorded flow works via Help Bot

### Naming Conventions

- Use snake_case: `create_task_reminder`
- Start with action verb: `view_`, `create_`, `update_`, `delete_`
- Be specific: `analyze_teams_messages` not just `analyze`

### Metadata Guidelines

Always include:
- `selector` - CSS selector for the element
- `route` - Current route if applicable
- `view` - Current view (kanban/list/graph) if applicable

Optional:
- `timestamp` - When action occurred
- `taskId` - Related task ID
- Custom fields relevant to your feature

## Troubleshooting

### Recordings Not Saving

- **Check method name uniqueness** - Names must be unique
- **Verify backend connection** - Check browser console for API errors
- **Validate step count** - Must have at least 1 step

### Help Bot Not Matching

- **Use keywords from method name** - e.g., "analyze" for `how_to_analyze_tasks`
- **Add better descriptions** - More keywords = better matching
- **Check scoring threshold** - Currently set to minimum score of 2

### UI Automation Not Working

- **Verify selectors** - Must be in ALLOWED_SELECTORS list (help_agent.py)
- **Check action types** - Must map to valid machine action types
- **Review metadata** - Ensure selector field is present and valid

## Future Enhancements

Potential improvements to consider:

1. **Semantic Search** - Use embeddings for better query matching
2. **Version Control** - Track changes to recorded methods
3. **Recording Editor** - UI to edit/reorder steps after recording
4. **Analytics** - Track which methods are most used
5. **Export/Import** - Share methods between environments
6. **Smart Suggestions** - Suggest which flow to record based on user behavior
7. **Validation** - Pre-check that selectors exist before saving
8. **Recording Pause** - Pause and resume recording sessions

## API Examples

### Create Automation Method

```python
import requests

response = requests.post('http://localhost:8000/help/automation', json={
    "method_name": "create_new_task",
    "description": "How to create a new task from scratch",
    "created_by": "1",
    "steps": [
        {
            "step_order": 0,
            "action_type": "BUTTON_CLICK",
            "target": "Add Tasks",
            "metadata": {"selector": "#add-tasks-btn"}
        },
        {
            "step_order": 1,
            "action_type": "FORM_SUBMIT",
            "target": "Parse Tasks",
            "metadata": {"selector": ".primary-btn"}
        }
    ]
})

print(response.json())
```

### Query Help Agent

```python
response = requests.post('http://localhost:8000/help/ask', json={
    "query": "How do I create a new task?"
})

data = response.json()
print(f"Method: {data['automation_method']}")
print(f"Guide: {data['human_guide']}")
print(f"Steps: {len(data['machine_actions'])}")
```

## Security Considerations

- Recording is **client-side only** - no sensitive data in backend
- Metadata should **not contain** user passwords, tokens, or PII
- Automation methods are **shared across all users** - don't record personal data
- Selectors are **validated** against whitelist before execution
- No external scripts or URLs allowed in automation steps

## Performance Notes

- Recording has **negligible overhead** - uses in-memory array
- Database queries use **indexed columns** (method_name)
- Help Agent checks automation **before AI call** - faster responses
- Steps are **ordered at DB level** - no runtime sorting needed

---

**Version:** 1.0
**Last Updated:** 2026-01-28
**Author:** TaskFlow AI Team
