import type { CalendarEvent, FreeBusyTimeSlot, ScheduleSuggestion, Task } from '../types';

/**
 * Outlook Calendar MCP Service
 *
 * This service provides an abstraction layer for Outlook Calendar operations.
 * Currently uses mock data for development. Replace with actual MCP calls when ready.
 *
 * MCP Integration Points:
 * - getEvents: Use outlook_calendar.list_events MCP tool
 * - createEvent: Use outlook_calendar.create_event MCP tool
 * - getFreeBusy: Use outlook_calendar.get_schedule MCP tool
 * - updateEvent: Use outlook_calendar.update_event MCP tool
 * - deleteEvent: Use outlook_calendar.delete_event MCP tool
 */

class OutlookCalendarService {
  private useMockData = true; // Set to false when MCP is configured

  /**
   * Fetch calendar events for a date range
   * @param startDate ISO datetime string
   * @param endDate ISO datetime string
   * @returns Array of calendar events
   */
  async getEvents(startDate: string, endDate: string): Promise<CalendarEvent[]> {
    if (this.useMockData) {
      return this.getMockEvents(startDate, endDate);
    }

    // TODO: Replace with actual MCP call
    // const response = await mcpClient.call('outlook_calendar.list_events', {
    //   start: startDate,
    //   end: endDate,
    //   select: 'subject,start,end,isAllDay,showAs,type,organizer,location,webLink,body,isCancelled'
    // });
    // return response.value;

    throw new Error('MCP not configured');
  }

  /**
   * Create a calendar event from a task
   * @param task Task to schedule
   * @param start ISO datetime string
   * @param end ISO datetime string
   * @returns Created calendar event
   */
  async createEventFromTask(
    task: Task,
    start: string,
    end: string
  ): Promise<CalendarEvent> {
    if (this.useMockData) {
      return this.getMockEventFromTask(task, start, end);
    }

    // TODO: Replace with actual MCP call
    // const response = await mcpClient.call('outlook_calendar.create_event', {
    //   subject: task.clean_text,
    //   body: {
    //     contentType: 'text',
    //     content: `Task Details:\n` +
    //       `Category: ${task.category}\n` +
    //       `Priority: ${task.priority}\n` +
    //       `Dependencies: ${task.depends_on.join(', ') || 'None'}\n\n` +
    //       `Original: ${task.raw_text}`
    //   },
    //   start: { dateTime: start, timeZone: 'UTC' },
    //   end: { dateTime: end, timeZone: 'UTC' },
    //   showAs: 'busy'
    // });
    // return response;

    throw new Error('MCP not configured');
  }

  /**
   * Get free/busy information for scheduling
   * @param startDate ISO datetime string
   * @param endDate ISO datetime string
   * @returns Array of time slots with availability status
   */
  async getFreeBusy(
    startDate: string,
    endDate: string
  ): Promise<FreeBusyTimeSlot[]> {
    if (this.useMockData) {
      return this.getMockFreeBusy(startDate, endDate);
    }

    // TODO: Replace with actual MCP call
    // const response = await mcpClient.call('outlook_calendar.get_schedule', {
    //   schedules: [userEmail],
    //   startTime: { dateTime: startDate, timeZone: 'UTC' },
    //   endTime: { dateTime: endDate, timeZone: 'UTC' },
    //   availabilityViewInterval: 30
    // });
    // return response.value[0].scheduleItems;

    throw new Error('MCP not configured');
  }

  /**
   * Suggest optimal times for scheduling a task
   * @param task Task to schedule
   * @param durationMinutes Duration in minutes
   * @param preferredStartHour Preferred start hour (9 = 9 AM)
   * @param preferredEndHour Preferred end hour (17 = 5 PM)
   * @returns Array of suggested time slots
   */
  async suggestTimes(
    task: Task,
    durationMinutes: number,
    preferredStartHour: number = 9,
    preferredEndHour: number = 17
  ): Promise<ScheduleSuggestion[]> {
    // Get next 7 days
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 7);

    const freeBusy = await this.getFreeBusy(
      now.toISOString(),
      endDate.toISOString()
    );

    // Find free slots that match duration
    const suggestions: ScheduleSuggestion[] = [];

    // Simple algorithm: find gaps in free/busy and score them
    for (let day = 0; day < 7; day++) {
      const checkDate = new Date(now);
      checkDate.setDate(checkDate.getDate() + day);
      checkDate.setHours(preferredStartHour, 0, 0, 0);

      while (checkDate.getHours() < preferredEndHour) {
        const slotStart = new Date(checkDate);
        const slotEnd = new Date(checkDate);
        slotEnd.setMinutes(slotEnd.getMinutes() + durationMinutes);

        // Check if this slot overlaps with any busy time
        const isFree = !freeBusy.some(slot => {
          const busyStart = new Date(slot.start);
          const busyEnd = new Date(slot.end);
          return (
            slot.status === 'busy' &&
            ((slotStart >= busyStart && slotStart < busyEnd) ||
             (slotEnd > busyStart && slotEnd <= busyEnd))
          );
        });

        if (isFree) {
          // Score based on proximity to task due date, priority, etc.
          let score = 70;

          // Prefer morning slots
          if (checkDate.getHours() >= 9 && checkDate.getHours() < 12) {
            score += 15;
          }

          // Prefer earlier days for high priority
          if (task.priority === 'high' && day < 2) {
            score += 15;
          }

          // Check if near task due date
          if (task.due_at) {
            const dueDate = new Date(task.due_at);
            const daysDiff = Math.abs((dueDate.getTime() - checkDate.getTime()) / (1000 * 60 * 60 * 24));
            if (daysDiff < 2) {
              score += 10;
            }
          }

          suggestions.push({
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),
            score,
            reason: this.getScoreReason(score, day, checkDate.getHours())
          });
        }

        // Move to next 30-min slot
        checkDate.setMinutes(checkDate.getMinutes() + 30);
      }
    }

    // Sort by score and return top 5
    return suggestions.sort((a, b) => b.score - a.score).slice(0, 5);
  }

  /**
   * Update calendar event linked to a task
   * @param eventId Event ID
   * @param updates Partial event updates
   */
  async updateEvent(
    eventId: string,
    updates: Partial<CalendarEvent>
  ): Promise<CalendarEvent> {
    if (this.useMockData) {
      return {
        ...this.getMockEventById(eventId),
        ...updates
      } as CalendarEvent;
    }

    // TODO: Replace with actual MCP call
    throw new Error('MCP not configured');
  }

  /**
   * Delete calendar event
   * @param eventId Event ID
   */
  async deleteEvent(eventId: string): Promise<void> {
    if (this.useMockData) {
      console.log(`Mock: Deleted event ${eventId}`);
      return;
    }

    // TODO: Replace with actual MCP call
    throw new Error('MCP not configured');
  }

  // ============= MOCK DATA METHODS =============

  private getMockEvents(startDate: string, endDate: string): CalendarEvent[] {
    const events: CalendarEvent[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Generate some mock events for each day
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      // Morning standup (9:00-9:30)
      if (d.getDay() !== 0 && d.getDay() !== 6) {
        const standupStart = new Date(d);
        standupStart.setHours(9, 0, 0, 0);
        const standupEnd = new Date(standupStart);
        standupEnd.setMinutes(30);

        events.push({
          id: `mock-${d.toISOString()}-standup`,
          subject: 'Daily Standup',
          start: standupStart.toISOString(),
          end: standupEnd.toISOString(),
          isAllDay: false,
          status: 'busy',
          type: 'singleInstance',
          organizer: 'team@example.com',
          webLink: 'https://teams.microsoft.com/l/meetup/...',
          isCancelled: false
        });
      }

      // Afternoon meeting (2:00-3:00 PM) on some days
      if (Math.random() > 0.5 && d.getDay() !== 0 && d.getDay() !== 6) {
        const meetingStart = new Date(d);
        meetingStart.setHours(14, 0, 0, 0);
        const meetingEnd = new Date(meetingStart);
        meetingEnd.setHours(15, 0, 0, 0);

        events.push({
          id: `mock-${d.toISOString()}-meeting`,
          subject: 'Project Review',
          start: meetingStart.toISOString(),
          end: meetingEnd.toISOString(),
          isAllDay: false,
          status: 'busy',
          type: 'singleInstance',
          organizer: 'manager@example.com',
          webLink: 'https://teams.microsoft.com/l/meetup/...',
          isCancelled: false
        });
      }
    }

    return events;
  }

  private getMockEventFromTask(
    task: Task,
    start: string,
    end: string
  ): CalendarEvent {
    return {
      id: `task-event-${task.id}-${Date.now()}`,
      subject: task.clean_text,
      start,
      end,
      isAllDay: false,
      status: 'busy',
      type: 'singleInstance',
      body: `Task #${task.id} - ${task.category.toUpperCase()}`,
      isCancelled: false,
      taskId: task.id
    };
  }

  private getMockFreeBusy(startDate: string, endDate: string): FreeBusyTimeSlot[] {
    const slots: FreeBusyTimeSlot[] = [];
    const events = this.getMockEvents(startDate, endDate);

    events.forEach(event => {
      slots.push({
        start: event.start,
        end: event.end,
        status: event.status
      });
    });

    return slots;
  }

  private getMockEventById(eventId: string): Partial<CalendarEvent> {
    return {
      id: eventId,
      subject: 'Mock Event',
      start: new Date().toISOString(),
      end: new Date(Date.now() + 3600000).toISOString(),
      isAllDay: false,
      status: 'busy',
      type: 'singleInstance',
      isCancelled: false
    };
  }

  private getScoreReason(score: number, dayOffset: number, hour: number): string {
    const reasons: string[] = [];

    if (score >= 85) {
      reasons.push('Optimal time');
    }
    if (hour >= 9 && hour < 12) {
      reasons.push('morning slot');
    }
    if (dayOffset === 0) {
      reasons.push('today');
    } else if (dayOffset === 1) {
      reasons.push('tomorrow');
    }

    return reasons.join(', ') || 'Available';
  }

  /**
   * Enable/disable mock data mode
   * Call this with false when MCP is properly configured
   */
  public setMockMode(enabled: boolean): void {
    this.useMockData = enabled;
  }

  /**
   * Check if service is using mock data
   */
  public isMockMode(): boolean {
    return this.useMockData;
  }
}

export const outlookCalendarService = new OutlookCalendarService();
