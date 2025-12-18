import { useState } from 'react';
import { motion } from 'framer-motion';
import { format, parseISO, startOfWeek, addDays, addWeeks, isSameDay, getHours, getMinutes } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CalendarEvent, Task } from '../../types';

interface WeekViewProps {
  events: CalendarEvent[];
  tasks: Task[];
  onRefresh: () => void;
  onTaskUpdated: () => void;
}

export function WeekView({ events, tasks, onRefresh, onTaskUpdated }: WeekViewProps) {
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date()));

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const days = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));

  const getEventsForDayAndHour = (day: Date, hour: number) => {
    return events.filter((event) => {
      const eventStart = parseISO(event.start);
      return isSameDay(eventStart, day) && getHours(eventStart) === hour;
    });
  };

  const goToPreviousWeek = () => {
    setCurrentWeek(addWeeks(currentWeek, -1));
  };

  const goToNextWeek = () => {
    setCurrentWeek(addWeeks(currentWeek, 1));
  };

  const goToToday = () => {
    setCurrentWeek(startOfWeek(new Date()));
  };

  return (
    <div className="week-view">
      {/* Week Navigation */}
      <div className="week-view-header">
        <button onClick={goToPreviousWeek} title="Previous week">
          <ChevronLeft size={18} />
        </button>
        <div className="week-range">
          <h2>{format(currentWeek, 'MMMM yyyy')}</h2>
          <p>
            {format(currentWeek, 'MMM d')} - {format(addDays(currentWeek, 6), 'MMM d, yyyy')}
          </p>
        </div>
        <button onClick={goToToday} className="today-btn">
          Today
        </button>
        <button onClick={goToNextWeek} title="Next week">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Week Grid */}
      <div className="week-grid-container">
        <div className="week-grid">
          {/* Day Headers */}
          <div className="week-grid-header">
            <div className="time-gutter">Time</div>
            {days.map((day) => (
              <div
                key={day.toISOString()}
                className={`day-header ${isSameDay(day, new Date()) ? 'today' : ''}`}
              >
                <span className="day-name">{format(day, 'EEE')}</span>
                <span className="day-date">{format(day, 'd')}</span>
              </div>
            ))}
          </div>

          {/* Time Grid */}
          <div className="week-grid-body">
            {hours.map((hour) => (
              <div key={hour} className="time-row">
                <div className="time-label">
                  {format(new Date().setHours(hour, 0), 'h a')}
                </div>
                {days.map((day) => {
                  const cellEvents = getEventsForDayAndHour(day, hour);

                  return (
                    <div
                      key={`${day.toISOString()}-${hour}`}
                      className="time-cell"
                    >
                      {cellEvents.map((event) => (
                        <motion.div
                          key={event.id}
                          className={`week-event ${event.status}`}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          whileHover={{ scale: 1.02, zIndex: 10 }}
                          title={event.subject}
                        >
                          <div className="event-time">
                            {format(parseISO(event.start), 'h:mm a')}
                          </div>
                          <div className="event-title">{event.subject}</div>
                        </motion.div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
