import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, formatDistanceToNow } from 'date-fns';
import { Bell, ChevronDown, AlertTriangle, Calendar, X, Loader2, Clock, AlertCircle } from 'lucide-react';
import { reminderApi } from '../api/client';
import type { Reminder } from '../types';

interface ReminderPanelProps {
  refreshTrigger: number;
}

export function ReminderPanel({ refreshTrigger }: ReminderPanelProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [notifications, setNotifications] = useState<Reminder[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [snoozing, setSnoozing] = useState<Set<number>>(new Set());
  const notifiedIds = useRef<Set<number>>(new Set());
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          setNotificationPermission(permission);
        });
      }
    }
  }, []);

  const showBrowserNotification = useCallback((reminder: Reminder) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      // Check if we've already notified for this reminder
      if (notifiedIds.current.has(reminder.id)) {
        return;
      }

      const notification = new Notification('TaskFlow Reminder', {
        body: reminder.task_text || 'You have a task reminder',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `reminder-${reminder.id}`,
        requireInteraction: true,
        vibrate: [200, 100, 200],
      });

      notification.onclick = () => {
        window.focus();
        setExpanded(true);
        notification.close();
      };

      // Mark as notified
      notifiedIds.current.add(reminder.id);

      // Auto-close after 10 seconds if user doesn't interact
      setTimeout(() => {
        notification.close();
      }, 10000);
    }
  }, []);

  const fetchReminders = useCallback(async () => {
    setLoading(true);
    try {
      const [pending, notifs] = await Promise.all([
        reminderApi.getPending(),
        reminderApi.getNotifications(),
      ]);

      setReminders(pending);

      // Check for new notifications and trigger browser notifications
      setNotifications(prev => {
        if (notifs.length > 0) {
          notifs.forEach(notif => {
            if (!prev.find(n => n.id === notif.id)) {
              // New notification appeared, show browser notification
              showBrowserNotification(notif);
            }
          });
        }
        return notifs;
      });
    } catch (err) {
      console.error('Failed to fetch reminders:', err);
    } finally {
      setLoading(false);
    }
  }, [showBrowserNotification]);

  useEffect(() => {
    // Clear any existing interval to prevent stacking
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    fetchReminders();

    // Poll for notifications every 60 seconds (balanced between responsiveness and server load)
    pollingIntervalRef.current = setInterval(fetchReminders, 60000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [refreshTrigger]); // Removed fetchReminders from dependencies to prevent interval stacking

  const handleDismiss = async (id: number) => {
    try {
      await reminderApi.delete(id);
      // Remove from notified set so it can be notified again if recreated
      notifiedIds.current.delete(id);
      fetchReminders();
    } catch (err) {
      console.error('Failed to dismiss reminder:', err);
    }
  };

  const handleSnooze = async (id: number, minutes: number) => {
    setSnoozing(prev => new Set(prev).add(id));
    try {
      await reminderApi.snooze(id, minutes);
      // Remove from notified set so it can be notified again
      notifiedIds.current.delete(id);
      fetchReminders();
    } catch (err) {
      console.error('Failed to snooze reminder:', err);
      alert('Failed to snooze reminder. Please try again.');
    } finally {
      setSnoozing(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const upcomingReminders = reminders.filter(r => !notifications.find(n => n.id === r.id));

  return (
    <motion.div
      className={`reminder-panel ${expanded ? 'expanded' : ''}`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="reminder-header"
        onClick={() => setExpanded(!expanded)}
        whileHover={{ backgroundColor: 'var(--bg-hover)' }}
        whileTap={{ scale: 0.995 }}
      >
        <span className="bell-icon">
          <Bell size={18} />
          <AnimatePresence>
            {notifications.length > 0 && (
              <motion.span
                className="notification-badge"
                initial={{ scale: 0 }}
                animate={{ scale: [1, 1.2, 1] }}
                exit={{ scale: 0 }}
                transition={{
                  scale: { duration: 0.5, repeat: Infinity, repeatDelay: 2 },
                  type: 'spring',
                  stiffness: 500,
                  damping: 25
                }}
              >
                {notifications.length}
              </motion.span>
            )}
          </AnimatePresence>
        </span>
        <span className="reminder-title">
          Reminders
          <span className="count">({reminders.length})</span>
        </span>
        <motion.span
          className="expand-icon"
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={18} />
        </motion.span>
      </motion.div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            className="reminder-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {loading && (
              <motion.div
                className="loading-small"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  style={{ display: 'flex' }}
                >
                  <Loader2 size={16} />
                </motion.span>
                Loading...
              </motion.div>
            )}

            {/* Notification permission warning */}
            {notificationPermission !== 'granted' && (
              <motion.div
                className="notification-warning"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <AlertCircle size={14} />
                <span>Enable notifications for reminders</span>
                <motion.button
                  className="enable-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if ('Notification' in window) {
                      Notification.requestPermission().then(permission => {
                        setNotificationPermission(permission);
                      });
                    }
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Enable
                </motion.button>
              </motion.div>
            )}

            <AnimatePresence>
              {notifications.length > 0 && (
                <motion.div
                  className="notifications-section"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="section-title">
                    <AlertTriangle size={14} />
                    <h4>Needs attention ({notifications.length})</h4>
                  </div>
                  {notifications.map((notif, idx) => (
                    <motion.div
                      key={notif.id}
                      className="notification-item"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <div className="notification-content">
                        <p>{notif.task_text}</p>
                        <span className="due-time overdue">
                          <Clock size={12} />
                          {formatDistanceToNow(new Date(notif.remind_at), { addSuffix: true })}
                        </span>
                      </div>
                      <div className="notification-actions">
                        <motion.button
                          className="snooze-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSnooze(notif.id, 10);
                          }}
                          disabled={snoozing.has(notif.id)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          title="Snooze for 10 minutes"
                        >
                          {snoozing.has(notif.id) ? <Loader2 size={12} className="spinning" /> : '10m'}
                        </motion.button>
                        <motion.button
                          className="snooze-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSnooze(notif.id, 30);
                          }}
                          disabled={snoozing.has(notif.id)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          title="Snooze for 30 minutes"
                        >
                          {snoozing.has(notif.id) ? <Loader2 size={12} className="spinning" /> : '30m'}
                        </motion.button>
                        <motion.button
                          className="dismiss-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDismiss(notif.id);
                          }}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          title="Dismiss reminder"
                        >
                          <X size={14} />
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              className="upcoming-section"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <div className="section-title">
                <Calendar size={14} />
                <h4>Coming up ({upcomingReminders.length})</h4>
              </div>
              {upcomingReminders.length === 0 ? (
                <motion.p
                  className="no-reminders"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  No upcoming reminders
                </motion.p>
              ) : (
                upcomingReminders.map((reminder, idx) => (
                  <motion.div
                    key={reminder.id}
                    className="reminder-item"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <div className="reminder-content">
                      <p>{reminder.task_text}</p>
                      <span className="remind-time">
                        <Calendar size={12} />
                        {formatDistanceToNow(new Date(reminder.remind_at), { addSuffix: true })}
                      </span>
                    </div>
                    <motion.button
                      className="dismiss-btn small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDismiss(reminder.id);
                      }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      title="Delete reminder"
                    >
                      <X size={12} />
                    </motion.button>
                  </motion.div>
                ))
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
