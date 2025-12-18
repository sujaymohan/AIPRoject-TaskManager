import { useState } from 'react';
import { motion } from 'framer-motion';
import { format, parseISO, isSameDay, addDays, startOfDay } from 'date-fns';
import { Calendar, Clock, MapPin, ExternalLink, CheckCircle2 } from 'lucide-react';
import type { CalendarEvent, Task } from '../../types';

interface AgendaViewProps {
  events: CalendarEvent[];
  tasks: Task[];
  onRefresh: () => void;
  onTaskUpdated: () => void;
}

export function AgendaView({ events, tasks, onRefresh, onTaskUpdated }: AgendaViewProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Generate next 7 days
  const days = Array.from({ length: 7 }, (_, i) => addDays(startOfDay(new Date()), i));

  // Group events and task reminders by date
  const getItemsForDate = (date: Date) => {
    const dateEvents = events.filter((e) =>
      isSameDay(parseISO(e.start), date)
    );

    const dateTasks = tasks.filter((t) =>
      t.reminders.some((r) => isSameDay(parseISO(r.remind_at), date))
    );

    return { events: dateEvents, tasks: dateTasks };
  };

  return (
    <div className="agenda-view">
      <div className="agenda-header">
        <h2>Upcoming Schedule</h2>
        <p className="agenda-subtitle">Your calendar for the next 7 days</p>
      </div>

      <div className="agenda-timeline">
        {days.map((day, index) => {
          const { events: dayEvents, tasks: dayTasks } = getItemsForDate(day);
          const hasItems = dayEvents.length > 0 || dayTasks.length > 0;

          return (
            <motion.div
              key={day.toISOString()}
              className="agenda-day"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="agenda-day-header">
                <div className="agenda-day-label">
                  <span className="day-name">{format(day, 'EEEE')}</span>
                  <span className="day-date">{format(day, 'MMM d, yyyy')}</span>
                </div>
                {!hasItems && (
                  <span className="no-items-badge">No events</span>
                )}
              </div>

              {hasItems && (
                <div className="agenda-day-items">
                  {/* Calendar Events */}
                  {dayEvents.map((event) => (
                    <motion.div
                      key={event.id}
                      className={`agenda-item event ${event.status}`}
                      whileHover={{ scale: 1.01 }}
                    >
                      <div className="agenda-item-time">
                        <Clock size={14} />
                        <span>
                          {event.isAllDay
                            ? 'All day'
                            : `${format(parseISO(event.start), 'h:mm a')} - ${format(
                                parseISO(event.end),
                                'h:mm a'
                              )}`}
                        </span>
                      </div>
                      <div className="agenda-item-content">
                        <h4 className="agenda-item-title">{event.subject}</h4>
                        {event.location && (
                          <div className="agenda-item-meta">
                            <MapPin size={12} />
                            <span>{event.location}</span>
                          </div>
                        )}
                        {event.organizer && (
                          <div className="agenda-item-meta">
                            <span className="organizer">Organizer: {event.organizer}</span>
                          </div>
                        )}
                        {event.webLink && (
                          <a
                            href={event.webLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="agenda-item-link"
                          >
                            <ExternalLink size={12} />
                            Join meeting
                          </a>
                        )}
                      </div>
                      {event.taskId && (
                        <div className="task-badge">
                          <CheckCircle2 size={12} />
                          Task
                        </div>
                      )}
                    </motion.div>
                  ))}

                  {/* Task Reminders */}
                  {dayTasks.map((task) => {
                    const reminder = task.reminders.find((r) =>
                      isSameDay(parseISO(r.remind_at), day)
                    );
                    if (!reminder) return null;

                    return (
                      <motion.div
                        key={`task-${task.id}`}
                        className={`agenda-item task ${task.category} ${task.priority}`}
                        whileHover={{ scale: 1.01 }}
                      >
                        <div className="agenda-item-time">
                          <Clock size={14} />
                          <span>{format(parseISO(reminder.remind_at), 'h:mm a')}</span>
                        </div>
                        <div className="agenda-item-content">
                          <h4 className="agenda-item-title">{task.clean_text}</h4>
                          <div className="agenda-item-meta">
                            <span className="category-badge">{task.category}</span>
                            <span className="priority-badge">{task.priority}</span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Unscheduled Tasks */}
      <div className="agenda-unscheduled">
        <h3>Tasks Without Calendar Events</h3>
        <p>These tasks have reminders but aren't scheduled on your calendar yet</p>
        {/* Render unscheduled tasks list */}
      </div>
    </div>
  );
}
