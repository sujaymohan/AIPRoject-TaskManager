# Integration Examples - Help Bot Automation

## Quick Integration Guide

This document shows how to add recording capabilities to existing and new components.

## Option 1: Using RecordableButton (Recommended)

### Basic Usage

Replace regular buttons with `RecordableButton` to automatically record clicks:

```tsx
import { RecordableButton } from './RecordableButton';

// Before
<button className="header-btn" onClick={handleAnalyze}>
  Analyze Tasks
</button>

// After
<RecordableButton
  actionLabel="Analyze Tasks"
  className="header-btn"
  onClick={handleAnalyze}
>
  Analyze Tasks
</RecordableButton>
```

### With Metadata

Add context to help the playback system:

```tsx
<RecordableButton
  actionLabel="Switch to Kanban View"
  metadata={{
    selector: "#kanban-view-btn",
    view: "kanban",
    route: "/dashboard"
  }}
  className="view-btn"
  onClick={() => setView('kanban')}
>
  <Columns size={18} />
  Kanban
</RecordableButton>
```

### Motion Buttons (Framer Motion)

Works with motion components too:

```tsx
import { motion } from 'framer-motion';
import { RecordableButton } from './RecordableButton';

const MotionButton = motion(RecordableButton);

<MotionButton
  actionLabel="Add Tasks"
  metadata={{ selector: "#add-tasks-btn" }}
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  onClick={handleAddTasks}
>
  <Plus size={18} />
  Add Tasks
</MotionButton>
```

## Option 2: Using Context Directly

For non-button interactions or custom logic:

### Tab Switching

```tsx
import { useHelpRecorderContext } from '../contexts/HelpRecorderContext';

function TabBar() {
  const { recordTabOpen } = useHelpRecorderContext();

  const handleTabClick = (tabName: string) => {
    recordTabOpen(tabName, {
      selector: `#tab-${tabName.toLowerCase()}`,
      timestamp: Date.now()
    });
    setActiveTab(tabName);
  };

  return (
    <div className="tab-bar">
      <button onClick={() => handleTabClick('Overview')}>Overview</button>
      <button onClick={() => handleTabClick('Details')}>Details</button>
    </div>
  );
}
```

### View Changes

```tsx
import { useHelpRecorderContext } from '../contexts/HelpRecorderContext';

function ViewSwitcher() {
  const { recordViewChange } = useHelpRecorderContext();
  const [view, setView] = useState('kanban');

  const switchView = (newView: string) => {
    recordViewChange(newView, {
      selector: `#${newView}-view-btn`,
      previousView: view,
      view: newView
    });
    setView(newView);
  };

  return (
    <div className="view-switcher">
      <button onClick={() => switchView('kanban')}>Kanban</button>
      <button onClick={() => switchView('list')}>List</button>
      <button onClick={() => switchView('graph')}>Graph</button>
    </div>
  );
}
```

### Modal Interactions

```tsx
import { useHelpRecorderContext } from '../contexts/HelpRecorderContext';

function HelpModal() {
  const [isOpen, setIsOpen] = useState(false);
  const { recordModalOpen, recordModalClose } = useHelpRecorderContext();

  const openModal = () => {
    recordModalOpen('Help Agent', {
      selector: '.help-agent-modal',
      route: window.location.pathname
    });
    setIsOpen(true);
  };

  const closeModal = () => {
    recordModalClose('Help Agent', {
      selector: '.help-agent-modal'
    });
    setIsOpen(false);
  };

  return (
    <>
      <button onClick={openModal}>Open Help</button>
      {isOpen && (
        <div className="help-agent-modal">
          <button onClick={closeModal}>Close</button>
          {/* Modal content */}
        </div>
      )}
    </>
  );
}
```

### Form Submissions

```tsx
import { useHelpRecorderContext } from '../contexts/HelpRecorderContext';

function TaskForm() {
  const { recordFormSubmit } = useHelpRecorderContext();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    recordFormSubmit('Create Task Form', {
      selector: '#task-create-form',
      formData: { /* sanitized data */ }
    });

    // Submit logic...
  };

  return (
    <form id="task-create-form" onSubmit={handleSubmit}>
      <input name="title" />
      <button type="submit">Create Task</button>
    </form>
  );
}
```

### Route Navigation

```tsx
import { useHelpRecorderContext } from '../contexts/HelpRecorderContext';
import { useNavigate } from 'react-router-dom';

function NavigationMenu() {
  const { recordRouteChange } = useHelpRecorderContext();
  const navigate = useNavigate();

  const handleNavigate = (route: string) => {
    recordRouteChange(route, {
      previousRoute: window.location.pathname,
      timestamp: Date.now()
    });
    navigate(route);
  };

  return (
    <nav>
      <button onClick={() => handleNavigate('/dashboard')}>Dashboard</button>
      <button onClick={() => handleNavigate('/settings')}>Settings</button>
    </nav>
  );
}
```

## Option 3: Custom Action Types

For app-specific actions not covered by built-in types:

```tsx
import { useHelpRecorderContext } from '../contexts/HelpRecorderContext';

function CustomComponent() {
  const { recordStep } = useHelpRecorderContext();

  const handleCustomAction = () => {
    recordStep(
      'CUSTOM_ACTION' as any, // Cast to bypass type checking
      'Custom Target Label',
      {
        selector: '#custom-element',
        customField: 'value',
        metadata: { /* any data */ }
      }
    );

    // Your custom logic...
  };

  return (
    <button onClick={handleCustomAction}>
      Custom Action
    </button>
  );
}
```

## Real-World Examples

### Example 1: TaskDashboard Header

```tsx
import { RecordableButton } from './RecordableButton';
import { Plus, MessageSquare, Wand2, Settings } from 'lucide-react';

function TaskDashboardHeader() {
  return (
    <header className="dashboard-header">
      <RecordableButton
        actionLabel="Add Tasks"
        metadata={{ selector: "#add-tasks-btn" }}
        className="header-btn"
        onClick={handleAddTasks}
      >
        <Plus size={18} />
        Add Tasks
      </RecordableButton>

      <RecordableButton
        actionLabel="Analyze Message"
        metadata={{ selector: "#analyze-btn" }}
        className="header-btn"
        onClick={openMessageAnalyzer}
      >
        <MessageSquare size={18} />
        Analyze
      </RecordableButton>

      <RecordableButton
        actionLabel="Improve All Tasks"
        metadata={{ selector: "#improve-all-btn" }}
        className="header-btn"
        onClick={handleImproveAll}
      >
        <Wand2 size={18} />
        Improve
      </RecordableButton>

      <RecordableButton
        actionLabel="Settings"
        metadata={{ selector: "#settings-btn" }}
        className="header-btn icon-btn"
        onClick={() => setSettingsPanelOpen(true)}
      >
        <Settings size={18} />
      </RecordableButton>
    </header>
  );
}
```

### Example 2: View Switcher with Recording

```tsx
import { useHelpRecorderContext } from '../contexts/HelpRecorderContext';
import { Columns, List, GitBranch, Network } from 'lucide-react';

type ViewType = 'kanban' | 'list' | 'graph' | 'visualize';

function ViewSwitcher() {
  const [currentView, setCurrentView] = useState<ViewType>('kanban');
  const { recordViewChange } = useHelpRecorderContext();

  const views = [
    { name: 'kanban', icon: Columns, label: 'Kanban' },
    { name: 'list', icon: List, label: 'List' },
    { name: 'graph', icon: GitBranch, label: 'Graph' },
    { name: 'visualize', icon: Network, label: 'Visualize' }
  ];

  const handleViewChange = (view: ViewType) => {
    recordViewChange(view, {
      selector: `#${view}-view-btn`,
      previousView: currentView,
      view: view
    });
    setCurrentView(view);
  };

  return (
    <div className="view-toggle-segmented">
      {views.map(({ name, icon: Icon, label }) => (
        <button
          key={name}
          id={`${name}-view-btn`}
          className={currentView === name ? 'active' : ''}
          onClick={() => handleViewChange(name as ViewType)}
        >
          <Icon size={18} />
          {label}
        </button>
      ))}
    </div>
  );
}
```

### Example 3: Modal with Recording

```tsx
import { useState } from 'react';
import { useHelpRecorderContext } from '../contexts/HelpRecorderContext';
import { X } from 'lucide-react';

function TeamsMentionsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const { recordModalOpen, recordModalClose, recordButtonClick } = useHelpRecorderContext();

  const openModal = () => {
    recordModalOpen('Teams Mentions', {
      selector: '.teams-modal'
    });
    setIsOpen(true);
  };

  const closeModal = () => {
    recordModalClose('Teams Mentions', {
      selector: '.teams-modal'
    });
    setIsOpen(false);
  };

  const handleProcessMentions = () => {
    recordButtonClick('Process Mentions', {
      selector: '.teams-process-btn'
    });
    // Process logic...
  };

  if (!isOpen) {
    return <button onClick={openModal}>Open Teams</button>;
  }

  return (
    <div className="teams-modal-overlay" onClick={closeModal}>
      <div className="teams-modal" onClick={e => e.stopPropagation()}>
        <div className="teams-modal-header">
          <h2>Teams Mentions</h2>
          <button className="close-btn" onClick={closeModal}>
            <X size={20} />
          </button>
        </div>
        <div className="teams-modal-content">
          {/* Content */}
        </div>
        <div className="teams-modal-footer">
          <button className="teams-process-btn" onClick={handleProcessMentions}>
            Process Selected
          </button>
        </div>
      </div>
    </div>
  );
}
```

## Best Practices

### 1. Always Provide Selectors in Metadata

```tsx
// Good
<RecordableButton
  actionLabel="Delete Task"
  metadata={{ selector: "#delete-task-btn" }}
  onClick={handleDelete}
>
  Delete
</RecordableButton>

// Bad - missing selector
<RecordableButton
  actionLabel="Delete Task"
  onClick={handleDelete}
>
  Delete
</RecordableButton>
```

### 2. Use Descriptive Action Labels

```tsx
// Good
recordButtonClick('Switch to Kanban View', { ... })

// Bad - too vague
recordButtonClick('Switch', { ... })
```

### 3. Include Context in Metadata

```tsx
// Good - rich context
recordViewChange('graph', {
  selector: '#graph-view-btn',
  previousView: 'kanban',
  view: 'graph',
  taskCount: tasks.length
})

// Acceptable - minimal context
recordViewChange('graph', {
  selector: '#graph-view-btn'
})
```

### 4. Sanitize Sensitive Data

```tsx
// Good - no sensitive data
recordFormSubmit('Login Form', {
  selector: '#login-form',
  timestamp: Date.now()
})

// Bad - includes password
recordFormSubmit('Login Form', {
  selector: '#login-form',
  password: 'secret123' // ❌ NEVER DO THIS
})
```

## Testing Your Integration

### 1. Start Recording
```
Click "Record Help Flow" → Panel shows "Recording..."
```

### 2. Trigger Your Component
```
Click the button/perform the action you integrated
```

### 3. Check Step Counter
```
Counter should increment (e.g., "Steps recorded: 1")
```

### 4. Stop and Save
```
Click "Stop Recording" → Save with name → Verify success message
```

### 5. Test Playback
```
Open Help Agent → Ask matching question → Click "Show Me"
```

## Conditional Recording

Only record in certain conditions:

```tsx
import { useHelpRecorderContext } from '../contexts/HelpRecorderContext';

function ConditionalRecording() {
  const { isRecording, recordButtonClick } = useHelpRecorderContext();

  const handleClick = () => {
    // Only record if explicitly recording
    if (isRecording) {
      recordButtonClick('Conditional Action', {
        selector: '#conditional-btn'
      });
    }

    // Always execute main logic
    doSomething();
  };

  return <button onClick={handleClick}>Action</button>;
}
```

## TypeScript Tips

### Custom Metadata Types

```tsx
interface CustomMetadata {
  selector: string;
  taskId?: number;
  view?: 'kanban' | 'list' | 'graph';
  route?: string;
}

const handleClick = () => {
  const metadata: CustomMetadata = {
    selector: '#my-btn',
    taskId: 123,
    view: 'kanban'
  };

  recordButtonClick('My Action', metadata);
};
```

### Extending Action Types

```tsx
// Define custom action types
type CustomActionType =
  | 'BUTTON_CLICK'
  | 'TAB_OPEN'
  | 'CUSTOM_ACTION_1'
  | 'CUSTOM_ACTION_2';

// Use with recordStep
recordStep('CUSTOM_ACTION_1' as any, 'Target', { ... });
```

## Troubleshooting

### Recordings Not Capturing

**Problem:** Steps not incrementing when clicking buttons

**Solution:**
```tsx
// Check 1: Is HelpRecorderProvider wrapping your component?
// App.tsx should have:
<HelpRecorderProvider>
  <YourComponent />
</HelpRecorderProvider>

// Check 2: Are you using the context?
const { recordButtonClick } = useHelpRecorderContext(); // ✅

// Check 3: Is recording active?
console.log('Recording?', isRecording);
```

### Selectors Not Working in Playback

**Problem:** Automation can't find elements

**Solution:**
```tsx
// Check 1: Is selector in ALLOWED_SELECTORS? (help_agent.py)

// Check 2: Use ID selectors when possible
metadata={{ selector: "#kanban-view-btn" }} // ✅
metadata={{ selector: ".some-class" }}      // ⚠️ May be filtered

// Check 3: Test selector in browser console
document.querySelector('#your-selector')
```

---

For more examples, see:
- [HELP_AUTOMATION_GUIDE.md](./HELP_AUTOMATION_GUIDE.md)
- [HELP_AUTOMATION_SUMMARY.md](./HELP_AUTOMATION_SUMMARY.md)
