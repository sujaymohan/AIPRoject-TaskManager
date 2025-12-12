"""
Message Merger Utility

This module handles grouping and merging of multiple sequential messages
from the same user within a configurable time window.
"""
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel


class MergedMessage(BaseModel):
    """Represents a merged message from multiple consecutive messages."""
    sender_id: str
    sender_name: str
    sender_email: Optional[str] = None
    timestamp_start: datetime
    timestamp_end: datetime
    merged_text: str
    message_count: int
    original_message_ids: List[str]
    # Preserve other metadata from first message
    chat_name: Optional[str] = None
    channel_name: Optional[str] = None
    team_name: Optional[str] = None
    web_url: Optional[str] = None
    is_from_channel: bool = False
    chat_type: Optional[str] = None
    chat_id: Optional[str] = None
    requested_by: Optional[str] = None
    requested_at: Optional[datetime] = None
    graph_metadata: Optional[dict] = None
    status: Optional[str] = "Open"


class MessageMergerConfig(BaseModel):
    """Configuration for message merging behavior."""
    time_window_seconds: int = 10  # Messages within 10 seconds are candidates for merging
    enable_merging: bool = True
    merge_same_chat_only: bool = True  # Only merge messages from same chat/channel
    preserve_line_breaks: bool = True  # Add line breaks between merged messages


class MessageMerger:
    """
    Utility class for grouping and merging sequential messages from the same user.
    """

    def __init__(self, config: Optional[MessageMergerConfig] = None):
        """
        Initialize the message merger with optional configuration.

        Args:
            config: Configuration for merging behavior. Uses defaults if not provided.
        """
        self.config = config or MessageMergerConfig()

    def should_merge(
        self,
        msg1: dict,
        msg2: dict,
        time_window: Optional[timedelta] = None
    ) -> bool:
        """
        Determine if two messages should be merged.

        Args:
            msg1: First message (earlier timestamp)
            msg2: Second message (later timestamp)
            time_window: Optional custom time window. Uses config default if not provided.

        Returns:
            True if messages should be merged, False otherwise
        """
        if not self.config.enable_merging:
            print(f"[MERGER] Merging disabled")
            return False

        # Must be from same sender
        sender_id_1 = msg1.get("sender_id") or msg1.get("sender_email")
        sender_id_2 = msg2.get("sender_id") or msg2.get("sender_email")

        if sender_id_1 != sender_id_2:
            print(f"[MERGER] Different senders: {sender_id_1} != {sender_id_2}")
            return False

        # Check time window
        window = time_window or timedelta(seconds=self.config.time_window_seconds)
        timestamp1 = msg1.get("timestamp")
        timestamp2 = msg2.get("timestamp")

        if not timestamp1 or not timestamp2:
            print(f"[MERGER] Missing timestamps")
            return False

        # Ensure timestamps are datetime objects
        if isinstance(timestamp1, str):
            timestamp1 = datetime.fromisoformat(timestamp1.replace("Z", "+00:00"))
        if isinstance(timestamp2, str):
            timestamp2 = datetime.fromisoformat(timestamp2.replace("Z", "+00:00"))

        time_diff = abs((timestamp2 - timestamp1).total_seconds())
        if time_diff > window.total_seconds():
            print(f"[MERGER] Time diff too large: {time_diff}s > {window.total_seconds()}s")
            return False

        # If configured, check if messages are from same chat/channel
        if self.config.merge_same_chat_only:
            chat_id_1 = msg1.get("chat_id")
            chat_id_2 = msg2.get("chat_id")

            # Both must have chat_id and they must match
            if chat_id_1 and chat_id_2 and chat_id_1 != chat_id_2:
                print(f"[MERGER] Different chats: {chat_id_1} != {chat_id_2}")
                return False

        # Don't merge if messages contain attachments (would require special handling)
        if msg1.get("has_attachments") or msg2.get("has_attachments"):
            print(f"[MERGER] Has attachments")
            return False

        # Don't merge system events
        if msg1.get("is_system_event") or msg2.get("is_system_event"):
            print(f"[MERGER] Is system event")
            return False

        print(f"[MERGER] ✓ Merging messages from {sender_id_1}, time_diff={time_diff}s")
        return True

    def merge_messages(self, messages: List[dict]) -> List[dict]:
        """
        Group and merge sequential messages from the same user.

        Args:
            messages: List of message dictionaries (should be sorted by timestamp)

        Returns:
            List of merged message dictionaries with sequential messages combined
        """
        if not messages or not self.config.enable_merging:
            return messages

        # Sort messages by timestamp to ensure correct order
        sorted_messages = sorted(
            messages,
            key=lambda m: m.get("timestamp") or datetime.min
        )

        merged_results = []
        current_group = [sorted_messages[0]]

        for i in range(1, len(sorted_messages)):
            current_msg = sorted_messages[i]
            previous_msg = current_group[-1]

            # Check if current message should be merged with the group
            if self.should_merge(previous_msg, current_msg):
                current_group.append(current_msg)
            else:
                # Finalize current group and start new one
                merged_results.append(self._create_merged_message(current_group))
                current_group = [current_msg]

        # Don't forget the last group
        if current_group:
            merged_results.append(self._create_merged_message(current_group))

        return merged_results

    def _create_merged_message(self, message_group: List[dict]) -> dict:
        """
        Create a single merged message from a group of messages.

        Args:
            message_group: List of messages to merge (all from same sender, sequential)

        Returns:
            Dictionary representing the merged message
        """
        if len(message_group) == 1:
            # No merging needed, return original with message_count = 1
            msg = message_group[0].copy()
            msg["message_count"] = 1
            msg["original_message_ids"] = [msg.get("id", "")]
            msg["timestamp_start"] = msg.get("timestamp")
            msg["timestamp_end"] = msg.get("timestamp")
            msg["merged_text"] = msg.get("message_text", "")
            return msg

        # Merge multiple messages
        first_msg = message_group[0]
        last_msg = message_group[-1]

        # Combine message texts
        separator = "\n\n" if self.config.preserve_line_breaks else " "
        merged_text = separator.join(
            msg.get("message_text", "").strip()
            for msg in message_group
            if msg.get("message_text", "").strip()
        )

        # Collect all message IDs
        original_ids = [msg.get("id", "") for msg in message_group if msg.get("id")]

        # Create merged message using first message as template
        merged = first_msg.copy()
        merged.update({
            "message_text": merged_text,
            "merged_text": merged_text,
            "message_count": len(message_group),
            "original_message_ids": original_ids,
            "timestamp_start": first_msg.get("timestamp"),
            "timestamp_end": last_msg.get("timestamp"),
            "id": f"merged_{first_msg.get('id', '')}",  # Create unique ID for merged message
            "is_merged": True,  # Flag to indicate this is a merged message
        })

        return merged

    def merge_teams_mentions(self, mentions: List[dict]) -> List[dict]:
        """
        Convenience method specifically for Teams mentions.

        Handles the specific structure of TeamsMention objects.

        Args:
            mentions: List of TeamsMention dictionaries

        Returns:
            List of merged mention dictionaries
        """
        # Convert mentions to standard format for processing
        standardized = []
        for mention in mentions:
            # Ensure timestamp is datetime
            timestamp = mention.get("timestamp")
            if isinstance(timestamp, str):
                timestamp = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))

            standardized.append({
                "id": mention.get("id"),
                "message_text": mention.get("message_text"),
                "sender_id": mention.get("sender_email") or mention.get("sender_name"),
                "sender_name": mention.get("sender_name"),
                "sender_email": mention.get("sender_email"),
                "timestamp": timestamp,
                "chat_id": mention.get("chat_id"),
                "chat_name": mention.get("chat_name"),
                "channel_name": mention.get("channel_name"),
                "team_name": mention.get("team_name"),
                "web_url": mention.get("web_url"),
                "is_from_channel": mention.get("is_from_channel", False),
                "chat_type": mention.get("chat_type"),
                "requested_by": mention.get("requested_by"),
                "requested_at": mention.get("requested_at"),
                "graph_metadata": mention.get("graph_metadata"),
                "status": mention.get("status", "Open"),
                "has_attachments": mention.get("has_attachments", False),
                "is_system_event": mention.get("is_system_event", False),
            })

        # Merge the messages
        merged = self.merge_messages(standardized)

        return merged


# Default merger instance with standard configuration
default_merger = MessageMerger()


def merge_graph_messages(
    messages: List[dict],
    time_window_seconds: int = 10,
    enable_merging: bool = True
) -> List[dict]:
    """
    Convenience function to merge messages with custom settings.

    Args:
        messages: List of message dictionaries
        time_window_seconds: Time window for grouping messages (default: 10 seconds)
        enable_merging: Whether to enable merging (default: True)

    Returns:
        List of merged message dictionaries

    Example:
        ```python
        raw_messages = fetch_teams_messages()
        merged = merge_graph_messages(raw_messages, time_window_seconds=5)
        ```
    """
    config = MessageMergerConfig(
        time_window_seconds=time_window_seconds,
        enable_merging=enable_merging
    )
    merger = MessageMerger(config)
    return merger.merge_messages(messages)
