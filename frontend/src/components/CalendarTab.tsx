import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, List, Grid, Loader2, Info } from 'lucide-react';
import { outlookCalendarService } from '../services/outlookCalendarService';
import { AgendaView } from './calendar/AgendaView';
import { WeekView } from './calendar/WeekView';
import { TaskSchedulingPanel } from './calendar/TaskSchedulingPanel';
import type { Task, CalendarEvent } from '../types';

type CalendarSubView = 'agenda' | 'week';

interface CalendarTabProps {
  tasks: Task[];
  refreshTrigger: number;
  onTaskUpdated: () => void;
  onTaskDeleted: () => void;
}

export function CalendarTab({
  tasks,
  refreshTrigger,
  onTaskUpdated,
  onTaskDeleted
}: CalendarTabProps) {
  const [subView, setSubView] = useState<CalendarSubView>('agenda');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSchedulingPanel, setShowSchedulingPanel] = useState(true);

  useEffect(() => {
    loadCalendarEvents();
  }, [refreshTrigger]);

  const loadCalendarEvents = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + 14); // Next 2 weeks

      const fetchedEvents = await outlookCalendarService.getEvents(
        now.toISOString(),
        endDate.toISOString()
      );
      setEvents(fetchedEvents);
    } catch (err) {
      console.error('Failed to load calendar events:', err);
    } finally {
      setLoading(false);
    }
  };

  const unscheduledTasks = tasks.filter(
    (t) => !t.calendar_event_id && (t.due_at || t.reminders.length > 0)
  );

  if (loading) {
    return (
      <div className="calendar-loading">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 size={32} />
        </motion.div>
        <p>Loading calendar...</p>
      </div>
    );
  }

  return (
    <div className="calendar-tab">
      {/* Mock Data Notice */}
      {outlookCalendarService.isMockMode() && (
        <motion.div
          className="mock-data-notice"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Info size={16} />
          <span>Using mock calendar data. Connect MCP server for real Outlook integration.</span>
        </motion.div>
      )}

      {/* Sub-view Toggle */}
      <div className="calendar-header">
        <div className="calendar-view-toggle">
          <button
            className={subView === 'agenda' ? 'active' : ''}
            onClick={() => setSubView('agenda')}
            title="Agenda view"
          >
            <List size={16} />
            <span>Agenda</span>
          </button>
          <button
            className={subView === 'week' ? 'active' : ''}
            onClick={() => setSubView('week')}
            title="Week view"
          >
            <Grid size={16} />
            <span>Week</span>
          </button>
        </div>

        <button
          className="toggle-scheduling-panel"
          onClick={() => setShowSchedulingPanel(!showSchedulingPanel)}
          title={showSchedulingPanel ? 'Hide scheduling panel' : 'Show scheduling panel'}
        >
          <Calendar size={16} />
          {showSchedulingPanel ? 'Hide Tasks' : 'Show Tasks'}
        </button>
      </div>

      {/* Main Content */}
      <div className="calendar-content">
        <div className="calendar-main-view">
          <AnimatePresence mode="wait">
            {subView === 'agenda' ? (
              <motion.div
                key="agenda"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                style={{ height: '100%' }}
              >
                <AgendaView
                  events={events}
                  tasks={tasks}
                  onRefresh={loadCalendarEvents}
                  onTaskUpdated={onTaskUpdated}
                />
              </motion.div>
            ) : (
              <motion.div
                key="week"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                style={{ height: '100%' }}
              >
                <WeekView
                  events={events}
                  tasks={tasks}
                  onRefresh={loadCalendarEvents}
                  onTaskUpdated={onTaskUpdated}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Scheduling Panel */}
        <AnimatePresence>
          {showSchedulingPanel && (
            <motion.div
              className="calendar-scheduling-panel"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.2 }}
            >
              <TaskSchedulingPanel
                tasks={unscheduledTasks}
                onTaskScheduled={() => {
                  loadCalendarEvents();
                  onTaskUpdated();
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
