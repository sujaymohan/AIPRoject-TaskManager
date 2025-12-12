# Message Merger Feature Guide

## Overview

The Message Merger feature automatically groups and consolidates sequential messages from the same user that arrive within a short time window. This reduces UI clutter and presents a cleaner conversation flow in the Teams mentions interface.

## How It Works

### Automatic Grouping Rules

Messages are automatically merged when they meet ALL of the following criteria:

1. **Same Sender**: Messages must be from the same user (identified by sender email or ID)
2. **Time Window**: Messages arrive within the configured time window (default: 10 seconds)
3. **Sequential**: No messages from other users in between
4. **Same Chat** (optional): Messages are from the same chat/channel (configurable)
5. **No Attachments**: Messages don't contain attachments
6. **Not System Events**: Messages aren't system-generated events (typing indicators, reactions, etc.)

### What Happens When Messages Are Merged

When multiple messages are grouped together:

- **Consolidated Text**: All message texts are combined with line breaks between them
- **Timestamp Range**: Shows the time range from first to last message
- **Message Count Badge**: Displays how many messages were merged (e.g., "3 messages merged")
- **Preserved Metadata**: Sender info, chat details, and other metadata from the first message are retained
- **Original IDs Tracked**: All original message IDs are stored for reference

## Configuration

### Environment Variables

You can configure the merger behavior via `.env` file:

```env
# Enable or disable message merging
MESSAGE_MERGE_ENABLED=true

# Time window in seconds (1-300)
MESSAGE_MERGE_TIME_WINDOW_SECONDS=10

# Only merge messages from the same chat/channel
MESSAGE_MERGE_SAME_CHAT_ONLY=true
```

### Runtime Configuration API

You can also update the configuration at runtime without restarting the server:

**Get Current Configuration:**
```bash
GET http://localhost:8000/teams/merge-config
```

Response:
```json
{
  "enabled": true,
  "time_window_seconds": 10,
  "merge_same_chat_only": true
}
```

**Update Configuration:**
```bash
POST http://localhost:8000/teams/merge-config
Content-Type: application/json

{
  "enabled": true,
  "time_window_seconds": 5,
  "merge_same_chat_only": false
}
```

## UI Display

### Merged Message Indicator

When messages are merged, the UI displays:

1. **Merged Badge**: A purple gradient badge showing "X messages merged"
2. **Time Range**: The start and end timestamps of the merged messages
3. **Combined Text**: All message texts concatenated with proper spacing

### Visual Styling

- The merged indicator appears below the message text
- Features a gradient background (purple/blue)
- Includes an icon and clear messaging
- Shows time range in a readable format

## Mock Data for Testing

The demo mode includes pre-configured mock data that demonstrates message merging:

### Test Scenario 1: Sarah Chen's Messages
- **Message 1** (mock-1): "@You Hey, can you review the PR..."
- **Message 2** (mock-7): "@You Also, I found a bug..." (3 seconds later)
- **Message 3** (mock-8): "@You It's related to the password reset..." (7 seconds after first)

These three messages are **automatically merged** into one message card showing "3 messages merged".

### Test Scenario 2: Mike Johnson's Messages
- **Message 1** (mock-9): "@You Quick question about the deployment"
- **Message 2** (mock-10): "@You Should we use the staging environment..." (5 seconds later)

These two messages are **merged** into one card showing "2 messages merged".

### Test Scenario 3: Other Messages
Single messages from other users (Lisa, James, Emily, Alex) remain as individual cards.

## API Response Structure

### New Fields in TeamsMention

When messages are merged, the API response includes:

```typescript
{
  id: string;                      // Unique ID (prefixed with "merged_" if merged)
  message_text: string;            // Combined text
  sender_name: string;             // Sender name
  timestamp: string;               // Original timestamp

  // Merging metadata
  is_merged: boolean;              // True if this is a merged message
  message_count: number;           // Number of messages merged (1 if not merged)
  original_message_ids: string[];  // Array of original message IDs
  timestamp_start: string;         // Start of time range
  timestamp_end: string;           // End of time range
  merged_text: string;             // Combined text (same as message_text)

  // ... other standard fields
}
```

## Implementation Details

### Backend Components

1. **MessageMerger Class** (`app/utils/message_merger.py`)
   - Core logic for grouping and merging
   - Configurable behavior
   - Reusable across different message sources

2. **MessageMergerConfig**
   - Configuration object with validation
   - Time window, enable/disable, chat filtering options

3. **TeamsService Integration**
   - Automatically applies merging to all fetched mentions
   - Uses configuration from settings
   - Logs merge statistics

### Frontend Components

1. **TypeScript Types** (`types/index.ts`)
   - Extended `TeamsMention` interface with merge fields
   - Type-safe handling of merged messages

2. **TeamsMentionsModal** (`TeamsMentionsModal.tsx`)
   - Displays merged message indicator
   - Shows message count and time range
   - Proper formatting of merged text

3. **CSS Styling** (`globals.css`)
   - `.merged-indicator`: Container styling
   - `.merged-badge`: Purple gradient badge
   - `.merged-time-range`: Time range display

## Use Cases

### When Message Merging is Helpful

1. **Rapid-fire Messages**: Users who send multiple short messages quickly
2. **Multi-part Questions**: Questions split across several messages
3. **Corrections/Additions**: Follow-up messages that add context
4. **Group Chats**: Active discussions with quick exchanges

### When to Disable Merging

1. **Threaded Conversations**: When message separation is important
2. **Formal Communications**: When each message has distinct context
3. **Time-sensitive Updates**: When timing of each message matters
4. **Debugging**: When you need to see exact message sequence

## Testing the Feature

### Using Demo Mode

1. Open the app and click "Teams" button
2. Click "Use Demo Data" instead of authenticating
3. Observe that Sarah Chen's messages show as "3 messages merged"
4. Mike Johnson's messages show as "2 messages merged"
5. Other messages remain individual

### Testing Configuration Changes

1. Update time window to 5 seconds: Messages beyond 5 seconds apart won't merge
2. Disable merging: All messages appear individually
3. Disable same-chat-only: Messages from different chats can merge (if same sender)

### API Testing with curl

```bash
# Get current config
curl http://localhost:8000/teams/merge-config

# Disable merging
curl -X POST http://localhost:8000/teams/merge-config \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'

# Change time window to 5 seconds
curl -X POST http://localhost:8000/teams/merge-config \
  -H "Content-Type: application/json" \
  -d '{"time_window_seconds": 5}'

# Re-enable with all defaults
curl -X POST http://localhost:8000/teams/merge-config \
  -H "Content-Type: application/json" \
  -d '{"enabled": true, "time_window_seconds": 10, "merge_same_chat_only": true}'
```

## Performance Considerations

- **Sorting**: Messages are sorted by timestamp before merging (O(n log n))
- **Sequential Scan**: One pass through messages to group (O(n))
- **Memory**: Minimal overhead, only stores merged metadata
- **Caching**: Merger configuration is cached, not recomputed per request

## Future Enhancements

Potential improvements for this feature:

1. **User Preferences**: Allow individual users to customize merge settings
2. **Smart Merging**: Use AI to determine if messages should merge based on content
3. **Undo Merge**: Allow users to expand merged messages to see originals
4. **Merge Indicators**: Show mini-previews of each merged message
5. **Export Support**: When exporting, optionally unmerge messages
6. **Analytics**: Track merge statistics for optimization

## Troubleshooting

### Messages Not Merging

**Problem**: Messages from the same user aren't merging.

**Possible Causes**:
1. Time window too small - messages are more than X seconds apart
2. Messages from different chats - `merge_same_chat_only` is enabled
3. Merging disabled - Check `MESSAGE_MERGE_ENABLED` setting
4. System events or attachments - These are excluded from merging

**Solution**:
- Check configuration with `GET /teams/merge-config`
- Increase time window: `POST /teams/merge-config {"time_window_seconds": 30}`
- Disable same-chat restriction: `POST /teams/merge-config {"merge_same_chat_only": false}`

### Too Many Messages Merged

**Problem**: Messages that shouldn't be together are merged.

**Possible Causes**:
1. Time window too large
2. Same-chat restriction disabled

**Solution**:
- Decrease time window: `POST /teams/merge-config {"time_window_seconds": 5}`
- Enable same-chat restriction: `POST /teams/merge-config {"merge_same_chat_only": true}`

### UI Not Showing Merge Indicator

**Problem**: Merged messages don't show the indicator.

**Possible Causes**:
1. Frontend not updated
2. CSS not loaded
3. TypeScript type mismatch

**Solution**:
- Hard refresh browser (Ctrl+F5)
- Check browser console for errors
- Verify `is_merged` field in API response

## Summary

The Message Merger feature provides:

✓ Automatic grouping of rapid-fire messages
✓ Cleaner UI with less clutter
✓ Configurable time window (1-300 seconds)
✓ Runtime configuration updates
✓ Preserved metadata and message IDs
✓ Visual indicators for merged messages
✓ Demo data for testing
✓ Type-safe TypeScript implementation
✓ RESTful configuration API

**Default Settings**: Enabled, 10-second window, same-chat-only

**Configuration API**: `GET/POST /teams/merge-config`

**UI Location**: Teams mentions modal, below message text
