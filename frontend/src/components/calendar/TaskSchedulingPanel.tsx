import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Calendar, Zap, Loader2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { outlookCalendarService } from '../../services/outlookCalendarService';
import type { Task, ScheduleSuggestion } from '../../types';

interface TaskSchedulingPanelProps {
  tasks: Task[];
  onTaskScheduled: () => void;
}

export function TaskSchedulingPanel({ tasks, onTaskScheduled }: TaskSchedulingPanelProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [duration, setDuration] = useState(30);
  const [suggestions, setSuggestions] = useState<ScheduleSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [scheduling, setScheduling] = useState(false);

  const handleGetSuggestions = async (task: Task) => {
    setSelectedTask(task);
    setLoading(true);
    try {
      const suggested = await outlookCalendarService.suggestTimes(task, duration);
      setSuggestions(suggested);
    } catch (err) {
      console.error('Failed to get suggestions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSchedule = async (suggestion: ScheduleSuggestion) => {
    if (!selectedTask) return;

    setScheduling(true);
    try {
      await outlookCalendarService.createEventFromTask(
        selectedTask,
        suggestion.start,
        suggestion.end
      );
      onTaskScheduled();
      setSelectedTask(null);
      setSuggestions([]);
    } catch (err) {
      console.error('Failed to schedule task:', err);
    } finally {
      setScheduling(false);
    }
  };

  return (
    <div className="task-scheduling-panel">
      <div className="panel-header">
        <h3>Schedule Tasks</h3>
        <p>{tasks.length} tasks need scheduling</p>
      </div>

      {/* Unscheduled Tasks */}
      <div className="unscheduled-tasks">
        {tasks.length === 0 ? (
          <div className="empty-state">
            <Calendar size={32} />
            <p>All tasks are scheduled!</p>
          </div>
        ) : (
          tasks.map((task) => (
            <motion.div
              key={task.id}
              className={`scheduling-task ${task.priority}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="task-info">
                <h4>{task.clean_text}</h4>
                <div className="task-meta">
                  <span className="category">{task.category}</span>
                  <span className="priority">{task.priority}</span>
                </div>
                {task.due_at && (
                  <div className="task-due">
                    <Clock size={12} />
                    Due: {format(new Date(task.due_at), 'MMM d, h:mm a')}
                  </div>
                )}
              </div>

              <div className="scheduling-controls">
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="duration-select"
                >
                  <option value={15}>15 min</option>
                  <option value={30}>30 min</option>
                  <option value={60}>1 hour</option>
                  <option value={120}>2 hours</option>
                </select>

                <button
                  onClick={() => handleGetSuggestions(task)}
                  disabled={loading}
                  className="suggest-btn"
                >
                  <Zap size={14} />
                  Suggest Times
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Suggestions Modal */}
      <AnimatePresence>
        {selectedTask && (
          <motion.div
            className="suggestions-modal"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <div className="modal-header">
              <h3>Schedule: {selectedTask.clean_text}</h3>
              <button onClick={() => setSelectedTask(null)}>×</button>
            </div>

            <div className="modal-body">
              {loading ? (
                <div className="loading">
                  <Loader2 size={24} className="spin" />
                  <p>Finding optimal times...</p>
                </div>
              ) : suggestions.length === 0 ? (
                <div className="no-suggestions">
                  <AlertCircle size={32} />
                  <p>No available time slots found</p>
                </div>
              ) : (
                <div className="suggestions-list">
                  {suggestions.map((suggestion, idx) => (
                    <motion.div
                      key={idx}
                      className="suggestion"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <div className="suggestion-time">
                        <Calendar size={16} />
                        <div>
                          <strong>{format(new Date(suggestion.start), 'EEE, MMM d')}</strong>
                          <span>
                            {format(new Date(suggestion.start), 'h:mm a')} -{' '}
                            {format(new Date(suggestion.end), 'h:mm a')}
                          </span>
                        </div>
                      </div>
                      <div className="suggestion-meta">
                        <span className="score">Score: {suggestion.score}/100</span>
                        <span className="reason">{suggestion.reason}</span>
                      </div>
                      <button
                        onClick={() => handleSchedule(suggestion)}
                        disabled={scheduling}
                        className="schedule-btn"
                      >
                        {scheduling ? 'Scheduling...' : 'Schedule'}
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
