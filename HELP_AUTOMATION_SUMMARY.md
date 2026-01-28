# Help Bot Automation - Quick Start

## What Was Built

An AI-powered Help Bot automation system that **records real UI interactions** and stores them as **reusable help methods**.

## Key Features

✅ **UI Recording Mode** - Record button clicks, view changes, modals, and navigation
✅ **Stop & Save** - Name and describe your recorded flows
✅ **Database Storage** - PostgreSQL-ready (currently SQLite) with SQLAlchemy ORM
✅ **Help Bot Integration** - Automatically matches user questions to recorded flows
✅ **Visual Playback** - "Show Me" button executes recorded steps with highlights
✅ **Fallback to AI** - If no recording matches, uses Groq Llama for responses

## File Structure

### Backend
```
backend/app/
├── models/help_automation.py          # SQLAlchemy models
├── schemas/help_automation.py         # Pydantic request/response schemas
├── routes/help_automation.py          # API endpoints (CRUD)
├── routes/help_agent.py              # Enhanced with automation matching
└── main.py                           # Router registration
```

### Frontend
```
frontend/src/
├── hooks/useHelpRecorder.ts          # Recording state management
├── contexts/HelpRecorderContext.tsx  # Global recorder provider
├── components/
│   ├── HelpRecorderPanel.tsx         # Floating record/stop UI
│   └── RecordableButton.tsx          # Auto-recording button wrapper
├── api/client.ts                     # API client methods
└── App.tsx                          # Integrated HelpRecorderProvider
```

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/help/automation` | POST | Create automation method |
| `/help/automation` | GET | List all methods |
| `/help/automation/{name}` | GET | Get specific method |
| `/help/run` | POST | Execute automation |
| `/help/automation/{name}` | DELETE | Delete method |
| `/help/ask` | POST | Ask Help Bot (checks automations first) |

## How to Use

### 1. Record a Help Flow

```
1. Click "Record Help Flow" button (bottom-right panel)
2. Use the app normally (click buttons, change views, etc.)
3. Click "Stop Recording"
4. Enter method name: e.g., "how_to_analyze_tasks"
5. Add description (optional)
6. Click "Save Flow"
```

### 2. Trigger via Help Bot

```
1. Open Help Agent modal
2. Type: "How do I analyze tasks?"
3. System matches "how_to_analyze_tasks"
4. Shows recorded steps as guide
5. Click "Show Me" to watch automation
```

## Example Recorded Step

```json
{
  "step_order": 0,
  "action_type": "BUTTON_CLICK",
  "target": "Analyze Tasks",
  "metadata": {
    "selector": "#analyze-btn",
    "route": "/tasks/analyze"
  }
}
```

## Action Types

- `BUTTON_CLICK` - Button interaction
- `TAB_OPEN` / `TAB_CLOSE` - Tab management
- `VIEW_CHANGE` - Kanban/List/Graph view switches
- `MODAL_OPEN` / `MODAL_CLOSE` - Dialog interactions
- `FORM_SUBMIT` - Form submissions
- `ROUTE_CHANGE` - Navigation events

## Database Schema

**help_automation_methods**
- `id` (UUID), `method_name` (unique), `description`, `created_by`, timestamps

**help_automation_steps**
- `id` (UUID), `method_id` (FK), `step_order`, `action_type`, `target`, `metadata` (JSON), `created_at`

## Integration Examples

### Option 1: RecordableButton
```tsx
import { RecordableButton } from './RecordableButton';

<RecordableButton
  actionLabel="Analyze Tasks"
  metadata={{ selector: "#analyze-btn" }}
  onClick={handleClick}
>
  Analyze
</RecordableButton>
```

### Option 2: Manual Recording
```tsx
import { useHelpRecorderContext } from '../contexts/HelpRecorderContext';

const { recordViewChange } = useHelpRecorderContext();
recordViewChange('kanban', { timestamp: Date.now() });
```

## Testing

### Start Backend
```bash
cd backend
python -m uvicorn app.main:app --reload
```

### Start Frontend
```bash
cd frontend
npm run dev
```

### Test Recording
1. Navigate to `http://localhost:5173`
2. Look for floating "Record Help Flow" panel (bottom-right)
3. Click to start recording
4. Interact with UI
5. Stop and save

### Test Playback
1. Open Help modal
2. Ask question matching your method name
3. Click "Show Me"

## Next Steps

### Immediate
- [ ] Test end-to-end recording flow
- [ ] Verify database table creation
- [ ] Test Help Bot matching

### Future Enhancements
- [ ] Recording editor (reorder/delete steps)
- [ ] Semantic search (embeddings-based matching)
- [ ] Analytics (track most-used flows)
- [ ] Export/import methods
- [ ] Version control for methods

## Troubleshooting

**Recording not starting?**
- Check browser console for errors
- Verify HelpRecorderProvider is wrapping App

**Flows not matching in Help Bot?**
- Use keywords from method name
- Add detailed descriptions
- Check scoring threshold (minimum 2)

**Automation not executing?**
- Verify selectors in ALLOWED_SELECTORS (help_agent.py)
- Check metadata includes valid selector
- Review browser console for errors

## Documentation

📖 Full guide: [HELP_AUTOMATION_GUIDE.md](./HELP_AUTOMATION_GUIDE.md)

---

**Status:** ✅ Ready for Testing
**Date:** 2026-01-28
**Tech Stack:** FastAPI, React 18, TypeScript, SQLAlchemy, PostgreSQL-ready
