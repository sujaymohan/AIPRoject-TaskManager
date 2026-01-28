import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2, Play, HelpCircle, Sparkles } from 'lucide-react';
import { helpApi } from '../api/client';
import { WalkthroughDock } from './WalkthroughDock';
import type { HelpAgentResponse } from '../types';
import ReactMarkdown from 'react-markdown';

interface HelpAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpAgentModal({ isOpen, onClose }: HelpAgentModalProps) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<HelpAgentResponse | null>(null);
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const quickQuestions = [
    'How do I add tasks?',
    'How do I change task status?',
    'Show me how to connect Teams',
    'How do I view the dependency graph?',
    'How do I set a reminder?',
    'How do I analyze a message?',
  ];

  const handleAsk = async (questionText?: string) => {
    const queryText = questionText || query;
    if (!queryText.trim()) return;

    setIsLoading(true);
    setResponse(null);

    try {
      const result = await helpApi.ask(queryText);
      setResponse(result);
    } catch (error) {
      console.error('Help agent error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunAutomation = () => {
    if (!response || !response.machine_actions.length) {
      console.log('No response or no machine actions');
      return;
    }

    console.log('Starting walkthrough with', response.machine_actions.length, 'steps');
    console.log('Machine actions:', response.machine_actions);

    // Start transition - hide modal first, then show walkthrough after animation
    setIsTransitioning(true);
  };

  // Handle the transition from modal to walkthrough
  useEffect(() => {
    if (isTransitioning) {
      // Wait for modal exit animation to complete (200ms + buffer)
      const timer = setTimeout(() => {
        setShowWalkthrough(true);
        setIsTransitioning(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isTransitioning]);

  const handleWalkthroughClose = () => {
    setShowWalkthrough(false);
    // Also close the modal completely when walkthrough ends
    onClose();
  };

  const handleQuickQuestion = (question: string) => {
    setQuery(question);
    handleAsk(question);
  };

  // Hide modal UI when walkthrough is active or transitioning, but keep component mounted to preserve state
  const showModalUI = isOpen && !showWalkthrough && !isTransitioning;

  return (
    <>
    <AnimatePresence>
      {showModalUI && (
        <>
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="help-agent-modal"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="modal-header">
              <div className="modal-title">
                <Sparkles size={24} className="help-icon" />
                <h2>TaskFlow AI Help Agent</h2>
              </div>
              <button className="close-btn" onClick={onClose}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {!response && !isLoading && (
                <div className="welcome-section">
                  <HelpCircle size={48} className="welcome-icon" />
                  <h3>How can I help you?</h3>
                  <p>
                    I can guide you through any feature of TaskFlow AI with step-by-step
                    instructions and even show you visually!
                  </p>

                  <div className="quick-questions">
                    <p className="quick-questions-label">Quick questions:</p>
                    <div className="quick-questions-grid">
                      {quickQuestions.map((question) => (
                        <button
                          key={question}
                          className="quick-question-btn"
                          onClick={() => handleQuickQuestion(question)}
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {isLoading && (
                <div className="loading-section">
                  <Loader2 className="spinner" size={40} />
                  <p>Thinking...</p>
                </div>
              )}

              {response && (
                <div className="response-section">
                  <div className="human-guide">
                    <h3>Step-by-Step Guide</h3>
                    <div className="guide-content">
                      <ReactMarkdown>{response.human_guide}</ReactMarkdown>
                    </div>
                  </div>

                  {response.machine_actions.length > 0 && (
                    <div className="automation-section">
                      <div className="automation-header">
                        <h3>Visual Walkthrough</h3>
                        <button
                          className="run-automation-btn"
                          onClick={handleRunAutomation}
                        >
                          <Play size={16} />
                          Show Me
                        </button>
                      </div>

                      <div className="actions-list">
                        <p className="actions-label">
                          {response.machine_actions.length} steps
                        </p>
                      </div>
                    </div>
                  )}

                  <button
                    className="ask-another-btn"
                    onClick={() => {
                      setResponse(null);
                      setQuery('');
                    }}
                  >
                    Ask another question
                  </button>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <div className="input-container">
                <input
                  type="text"
                  placeholder="Ask me anything about TaskFlow AI..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAsk();
                    }
                  }}
                  disabled={isLoading}
                />
                <button
                  className="send-btn"
                  onClick={() => handleAsk()}
                  disabled={!query.trim() || isLoading}
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>

    {/* Walkthrough Dock - Rendered via portal, stays visible even when modal UI is hidden */}
    {showWalkthrough && response && response.machine_actions.length > 0 && (
      <WalkthroughDock
        steps={response.machine_actions}
        methodName={query || 'Help Guide'}
        onClose={handleWalkthroughClose}
      />
    )}
    </>
  );
}
