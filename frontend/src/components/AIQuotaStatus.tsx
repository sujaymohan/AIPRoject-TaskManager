import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, AlertCircle, CheckCircle2, Clock, TrendingUp, X, Activity } from 'lucide-react';

interface AIQuotaInfo {
  provider: string;
  model: string;
  status: 'available' | 'limited' | 'unavailable';
  requestsToday: number;
  dailyLimit: number;
  remaining: number;
  usagePercent: number;
  successCount: number;
  errorCount: number;
  avgResponseTime: number;
  lastUsed?: string;
  nextResetTime?: string;
}

export function AIQuotaStatus() {
  const [quotaInfo, setQuotaInfo] = useState<AIQuotaInfo[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch quota info from backend
  useEffect(() => {
    const fetchQuotaInfo = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/ai-quota/status');
        if (!response.ok) {
          throw new Error('Failed to fetch quota status');
        }
        const data = await response.json();
        if (data.quotas && Array.isArray(data.quotas)) {
          setQuotaInfo(data.quotas);
        }
      } catch (err) {
        console.error('Failed to fetch quota info:', err);
        // Keep using mock data on error
      } finally {
        setIsLoading(false);
      }
    };

    // Fetch on mount and every 5 minutes
    fetchQuotaInfo();
    const interval = setInterval(fetchQuotaInfo, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'available':
        return 'var(--success)';
      case 'limited':
        return 'var(--warning)';
      case 'unavailable':
        return 'var(--error)';
      default:
        return 'var(--text-tertiary)';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle2 size={16} />;
      case 'limited':
        return <AlertCircle size={16} />;
      case 'unavailable':
        return <AlertCircle size={16} />;
      default:
        return <Clock size={16} />;
    }
  };

  const getTotalUsagePercent = (): number => {
    const totalRequests = quotaInfo.reduce((sum, q) => sum + q.requestsToday, 0);
    const totalLimit = quotaInfo.reduce((sum, q) => sum + q.dailyLimit, 0);
    return Math.round((totalRequests / totalLimit) * 100);
  };

  return (
    <>
      {/* Compact Button to Open Modal */}
      <motion.button
        className="quota-header"
        onClick={() => setIsModalOpen(true)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        title="AI Service Quotas - Click to view details"
      >
        <div className="quota-header-left">
          <div className="quota-icon">
            <Zap size={16} />
          </div>
          <div className="quota-info-compact">
            <span className="quota-label">AI Services</span>
            {quotaInfo.length > 0 && (
              <span className="quota-usage">
                {getTotalUsagePercent()}% used
              </span>
            )}
          </div>
        </div>

        <div className="quota-header-right">
          <div className="quota-indicator">
            {isLoading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                style={{ display: 'flex' }}
              >
                <Clock size={14} />
              </motion.div>
            ) : (
              <TrendingUp size={14} />
            )}
          </div>
        </div>
      </motion.button>

      {/* Full-Size Modal Popup - Rendered via Portal to document.body */}
      {createPortal(
        <AnimatePresence>
          {isModalOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                className="quota-modal-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsModalOpen(false)}
              />

              {/* Modal Content */}
              <motion.div
                className="quota-modal"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
              >
                {/* Modal Header */}
                <div className="quota-modal-header">
                  <div className="quota-modal-title">
                    <Activity size={24} />
                    <h2>AI Service Quotas</h2>
                  </div>
                  <button
                    className="quota-modal-close"
                    onClick={() => setIsModalOpen(false)}
                    aria-label="Close"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Modal Body with Scrollable Content */}
                <div className="quota-modal-body">
                  {quotaInfo.length === 0 ? (
                    <div className="quota-loading">
                      <Clock size={32} />
                      <p>Loading quota information...</p>
                    </div>
                  ) : (
                    <div className="quota-grid">
                      {quotaInfo.map((quota, index) => (
                        <motion.div
                          key={`${quota.provider}-${index}`}
                          className="quota-card"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          {/* Card Header */}
                          <div className="quota-card-header">
                            <div className="quota-provider">
                              <div
                                className="quota-status-dot"
                                style={{ backgroundColor: getStatusColor(quota.status) }}
                              />
                              <div className="provider-info">
                                <h3 className="provider-name">{quota.provider}</h3>
                                <span className="model-name">{quota.model}</span>
                              </div>
                            </div>
                            <div className="status-badge" style={{
                              color: getStatusColor(quota.status),
                              borderColor: getStatusColor(quota.status)
                            }}>
                              {getStatusIcon(quota.status)}
                              <span>{quota.status}</span>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="quota-progress-section">
                            <div className="quota-progress-header">
                              <span className="progress-label">Daily Usage</span>
                              <span className="progress-percent">{quota.usagePercent.toFixed(1)}%</span>
                            </div>
                            <div className="quota-progress-bar">
                              <motion.div
                                className="quota-progress-fill"
                                initial={{ width: 0 }}
                                animate={{ width: `${quota.usagePercent}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                                style={{
                                  backgroundColor:
                                    quota.usagePercent > 80
                                      ? 'var(--error)'
                                      : quota.usagePercent > 50
                                        ? 'var(--warning)'
                                        : 'var(--success)',
                                }}
                              />
                            </div>
                          </div>

                          {/* Stats Grid */}
                          <div className="quota-stats-grid">
                            <div className="quota-stat-item">
                              <span className="stat-label">Used</span>
                              <span className="stat-value">{quota.requestsToday}</span>
                            </div>
                            <div className="quota-stat-item">
                              <span className="stat-label">Limit</span>
                              <span className="stat-value">{quota.dailyLimit}</span>
                            </div>
                            <div className="quota-stat-item">
                              <span className="stat-label">Remaining</span>
                              <span className="stat-value highlight">{quota.remaining}</span>
                            </div>
                          </div>

                          {/* Performance Metrics */}
                          <div className="quota-metrics">
                            <div className="metric-row">
                              <span className="metric-label">Success Rate</span>
                              <span className="metric-value success">
                                {quota.requestsToday > 0
                                  ? ((quota.successCount / quota.requestsToday) * 100).toFixed(1)
                                  : 0}%
                              </span>
                            </div>
                            <div className="metric-row">
                              <span className="metric-label">Errors</span>
                              <span className="metric-value error">{quota.errorCount}</span>
                            </div>
                            <div className="metric-row">
                              <span className="metric-label">Avg Response</span>
                              <span className="metric-value">{quota.avgResponseTime.toFixed(0)}ms</span>
                            </div>
                          </div>

                          {/* Timestamps */}
                          <div className="quota-card-footer">
                            {quota.lastUsed && (
                              <div className="footer-item">
                                <Clock size={12} />
                                <span>Last used: {quota.lastUsed}</span>
                              </div>
                            )}
                            {quota.nextResetTime && (
                              <div className="footer-item reset">
                                <span>Reset at {quota.nextResetTime}</span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="quota-modal-footer">
                  <span className="footer-info">
                    Last updated: {new Date().toLocaleTimeString()}
                  </span>
                  <button
                    className="btn-refresh"
                    onClick={() => {
                      setIsLoading(true);
                      fetch('/ai-quota/status')
                        .then(res => res.json())
                        .then(data => {
                          if (data.quotas) setQuotaInfo(data.quotas);
                        })
                        .finally(() => setIsLoading(false));
                    }}
                  >
                    <TrendingUp size={14} />
                    Refresh
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
