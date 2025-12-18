# UI Automation Engine - Complete Guide

## Overview

The UI Automation Engine is a production-ready system that executes visual walkthroughs of your application by interpreting JSON action plans. It features:

- ✅ **Synthetic Mouse Pointer** - Animated cursor that moves smoothly between elements
- ✅ **Element Highlighting** - Glowing outlines around target elements
- ✅ **Smart Tooltips** - Contextual messages positioned near elements
- ✅ **Retry Logic** - Automatically retries if elements aren't immediately available
- ✅ **Smooth Animations** - requestAnimationFrame-based animations for 60fps performance
- ✅ **No UI Disruption** - All overlays use `pointer-events: none`

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Action Types](#action-types)
3. [React Hook Usage](#react-hook-usage)
4. [Direct API Usage](#direct-api-usage)
5. [Complete Example](#complete-example)
6. [Architecture](#architecture)
7. [Best Practices](#best-practices)

---

## 🚀 Quick Start

### Basic Usage

```typescript
import { uiAutomation } from './utils/uiAutomation';

const actions = [
  {
    action: 'move',
    selector: '#add-tasks-btn',
    message: 'This button adds new tasks',
    delay: 1200
  },
  {
    action: 'click',
    selector: '#add-tasks-btn',
    message: 'Opening task input',
    delay: 1000
  },
  {
    action: 'type',
    selector: '#task-input',
    value: 'My new task',
    message: 'Entering task text',
    delay: 1500
  }
];

// Run the automation
await uiAutomation.runHelpFlow(actions);
```

---

## 🎬 Action Types

### 1. **move** - Animate Pointer to Element

Moves the synthetic mouse pointer to an element and highlights it.

```json
{
  "action": "move",
  "selector": "#teams-btn",
  "message": "Navigate to Teams integration",
  "delay": 1200
}
```

**Features:**
- Smooth easing animation (600ms)
- Auto-scroll element into view
- Highlights element with glow
- Shows tooltip

---

### 2. **click** - Click Element

Moves to element and triggers a click with visual feedback.

```json
{
  "action": "click",
  "selector": "#teams-btn",
  "message": "Opening Teams modal",
  "delay": 1000
}
```

**Features:**
- Includes pointer animation
- Click ripple effect
- Scale animation on pointer
- Triggers actual DOM click event

---

### 3. **type** / **input** - Type Text

Types text character-by-character into an input field.

```json
{
  "action": "type",
  "selector": "#task-input",
  "value": "Deploy the new API",
  "message": "Entering task description",
  "delay": 2000
}
```

**Features:**
- Character-by-character typing (50ms per char)
- Fires `input` and `change` events
- Works with input and textarea elements
- Visual focus feedback

---

### 4. **wait** - Wait for Element

Waits for an element to appear in the DOM (with timeout).

```json
{
  "action": "wait",
  "selector": "#teams-auth-modal",
  "delay": 3000
}
```

**Features:**
- Polls every 100ms
- Configurable timeout (default 2000ms)
- Useful for async modals/components

---

### 5. **scroll** - Scroll to Element

Smoothly scrolls an element into view.

```json
{
  "action": "scroll",
  "selector": "#footer-section",
  "message": "Scrolling to footer",
  "delay": 1000
}
```

**Features:**
- Smooth scroll behavior
- Centers element in viewport
- Shows tooltip during scroll

---

### 6. **open** - Navigate or Open URL

Opens a URL or changes hash location.

```json
{
  "action": "open",
  "selector": "https://example.com",
  "delay": 500
}
```

or

```json
{
  "action": "open",
  "selector": "#settings",
  "delay": 500
}
```

**Features:**
- Opens external URLs in new tab
- Changes hash for internal navigation

---

### 7. **tooltip** - Show Tooltip

Displays a tooltip at an element without clicking.

```json
{
  "action": "tooltip",
  "selector": "#help-btn",
  "message": "Click here for help anytime!",
  "delay": 2500
}
```

**Features:**
- Pointer animates to element
- Tooltip displays for 2 seconds
- Element is highlighted
- No click triggered

---

## ⚛️ React Hook Usage

### Using `useHelpFlowRunner`

```tsx
import { useHelpFlowRunner } from './hooks/useHelpFlowRunner';

function MyComponent() {
  const { flowState, runFlow, stopFlow } = useHelpFlowRunner();

  const handleStartTour = () => {
    const actions = [
      { action: 'move', selector: '#step1', message: 'First step', delay: 1000 },
      { action: 'click', selector: '#step2', message: 'Second step', delay: 1000 },
    ];
    runFlow(actions);
  };

  return (
    <div>
      <button onClick={handleStartTour}>Start Tour</button>

      {flowState.isRunning && (
        <div className="progress">
          Step {flowState.currentStep} of {flowState.totalSteps}
          {flowState.currentMessage && <p>{flowState.currentMessage}</p>}
        </div>
      )}

      {flowState.isRunning && (
        <button onClick={stopFlow}>Stop Tour</button>
      )}
    </div>
  );
}
```

### Hook API

```typescript
interface HelpFlowState {
  isRunning: boolean;
  currentStep: number;
  totalSteps: number;
  currentMessage?: string;
  error?: string;
}

const {
  flowState,      // Current automation state
  runFlow,        // (actions: MachineAction[]) => Promise<void>
  stopFlow,       // () => void
  resetFlow       // () => void
} = useHelpFlowRunner();
```

---

## 🔧 Direct API Usage

### Class: `UIAutomationEngine`

```typescript
import { uiAutomation } from './utils/uiAutomation';

// Run a flow
await uiAutomation.runHelpFlow(actions, (state) => {
  console.log('Progress:', state);
});

// Check if running
const isRunning = uiAutomation.isFlowRunning(); // boolean

// Stop execution
uiAutomation.stop();
```

### With Progress Callback

```typescript
await uiAutomation.runHelpFlow(actions, (state) => {
  console.log(`Step ${state.currentStep}/${state.totalSteps}`);
  console.log('Message:', state.currentMessage);
  console.log('Running:', state.isRunning);
});
```

---

## 📚 Complete Example

### Example: Teams Integration Walkthrough

```typescript
const teamsWalkthroughActions = [
  {
    action: 'move',
    selector: '#teams-btn',
    message: 'Open Microsoft Teams integration',
    delay: 1200
  },
  {
    action: 'click',
    selector: '#teams-btn',
    delay: 1000
  },
  {
    action: 'wait',
    selector: '#teams-auth-modal',
    message: 'Waiting for Teams modal',
    delay: 2000
  },
  {
    action: 'move',
    selector: '#microsoft-login-btn',
    message: 'Sign in with Microsoft account',
    delay: 1000
  },
  {
    action: 'tooltip',
    selector: '#demo-mode-btn',
    message: 'Or try Demo Mode without logging in!',
    delay: 2500
  },
  {
    action: 'click',
    selector: '#demo-mode-btn',
    delay: 1500
  },
  {
    action: 'wait',
    selector: '#mentions-list',
    message: 'Loading @mentions',
    delay: 2000
  },
  {
    action: 'scroll',
    selector: '.mention-checkbox:first-child',
    message: 'Select mentions to extract',
    delay: 1000
  },
  {
    action: 'click',
    selector: '.mention-checkbox:first-child',
    delay: 800
  },
  {
    action: 'move',
    selector: '#extract-tasks-btn',
    message: 'AI will extract actionable tasks',
    delay: 1200
  },
  {
    action: 'click',
    selector: '#extract-tasks-btn',
    delay: 1500
  }
];

// Execute
uiAutomation.runHelpFlow(teamsWalkthroughActions);
```

---

## 🏗️ Architecture

### Components

#### 1. **Synthetic Pointer** (`pointerElement`)
- Absolutely positioned SVG cursor
- Animates using `requestAnimationFrame`
- Easing: ease-in-out cubic
- Z-index: 10003 (highest)

#### 2. **Highlight Overlay** (`highlightOverlay`)
- Positioned absolutely around target element
- Blue glow with transparency
- Transitions smoothly (300ms)
- Z-index: 10000

#### 3. **Tooltip** (`tooltipElement`)
- Dark background with white text
- Positioned above element (centered)
- Auto-hides/shows per step
- Z-index: 10001

### Animation Flow

```
User triggers automation
  ↓
For each action:
  1. Retry element lookup (3 attempts)
  2. Execute action:
     - Scroll element into view
     - Animate pointer (600ms)
     - Show highlight + tooltip
     - Perform action (click/type/etc)
  3. Wait for delay
  ↓
Cleanup (remove all overlays)
```

### Performance Optimizations

- **requestAnimationFrame**: 60fps smooth animations
- **Easing functions**: Hardware-accelerated transforms
- **Pointer-events: none**: No event blocking
- **Lazy creation**: Elements created only when needed
- **Proper cleanup**: Cancel animations on abort

---

## ✅ Best Practices

### 1. **Selector Strategy**

Use specific, stable IDs:

```json
// ✅ Good
{ "selector": "#add-tasks-btn" }

// ❌ Avoid
{ "selector": "button.primary.large" }
```

### 2. **Delay Timing**

- **Move/Tooltip**: 1000-1500ms
- **Click**: 800-1200ms
- **Type**: 1500-2500ms (depends on text length)
- **Wait**: 2000-3000ms

### 3. **Message Writing**

```json
// ✅ Good: Action-oriented, clear
{ "message": "Click here to add tasks" }

// ❌ Avoid: Vague, passive
{ "message": "Task button" }
```

### 4. **Error Handling**

Always wrap in try-catch:

```typescript
try {
  await uiAutomation.runHelpFlow(actions);
} catch (error) {
  console.error('Automation failed:', error);
  // Fallback or notify user
}
```

### 5. **Dynamic Content**

Use `wait` action before interacting with async elements:

```json
[
  { "action": "click", "selector": "#open-modal" },
  { "action": "wait", "selector": "#modal-content", "delay": 2000 },
  { "action": "click", "selector": "#modal-button" }
]
```

---

## 🐛 Troubleshooting

### Element Not Found
- Increase retry count or add `wait` action
- Check selector is correct
- Ensure element exists in DOM

### Animation Stuttering
- Reduce number of concurrent animations
- Check browser performance
- Ensure no heavy JS blocking main thread

### Tooltip Not Visible
- Check z-index conflicts
- Verify tooltip positioning logic
- Ensure element is scrolled into view

---

## 📦 Integration with Help Agent

### From Backend Response to Execution

```typescript
import { helpApi } from './api/client';
import { uiAutomation } from './utils/uiAutomation';

async function askHelpAgent(query: string) {
  // 1. Get response from AI
  const response = await helpApi.ask(query);

  // 2. Display human guide
  console.log(response.human_guide);

  // 3. Execute machine actions
  if (response.machine_actions.length > 0) {
    await uiAutomation.runHelpFlow(response.machine_actions);
  }
}

// Usage
askHelpAgent("How do I add tasks?");
```

---

## 🎨 Customization

### Custom Pointer Icon

Edit the SVG in `createOverlayElements()`:

```typescript
this.pointerElement.innerHTML = `
  <svg width="24" height="24" viewBox="0 0 24 24">
    <!-- Your custom cursor SVG -->
  </svg>
`;
```

### Custom Highlight Style

```typescript
this.highlightOverlay.style.cssText = `
  border: 2px solid #your-color;
  box-shadow: 0 0 30px rgba(your-rgba);
  // ...
`;
```

### Custom Tooltip Style

```typescript
this.tooltipElement.style.cssText = `
  background: #your-bg;
  color: #your-text;
  font-size: 16px;
  // ...
`;
```

---

## 🚀 Production Checklist

- ✅ Test all action types
- ✅ Verify retry logic works
- ✅ Check mobile responsiveness
- ✅ Test with screen readers (overlays don't interfere)
- ✅ Verify animations perform well on low-end devices
- ✅ Add error boundaries in React
- ✅ Log automation errors for debugging
- ✅ Test cleanup on component unmount

---

## 📝 License

MIT

## 🙋 Support

For issues or questions, contact the development team or file an issue on GitHub.

---

**Built with ❤️ for TaskFlow AI**
