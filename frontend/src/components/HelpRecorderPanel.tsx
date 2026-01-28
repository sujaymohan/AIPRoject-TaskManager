import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Circle, Square, Save, X, ChevronUp, ChevronDown, Play } from 'lucide-react';
import { useHelpRecorderContext } from '../contexts/HelpRecorderContext';
import { helpAutomationApi } from '../api/client';
import { motion, AnimatePresence } from 'framer-motion';

interface SaveDialogProps {
  onSave: (methodName: string, description: string) => void;
  onCancel: () => void;
}

function SaveDialog({ onSave, onCancel }: SaveDialogProps) {
  const [methodName, setMethodName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (methodName.trim()) {
      onSave(methodName.trim(), description.trim());
    }
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100100
      }}
    >
      {/* Backdrop */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
        onClick={onCancel}
      />

      {/* Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{
          position: 'relative',
          background: 'rgba(30, 30, 30, 0.9)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          borderRadius: '20px',
          padding: '24px',
          width: '100%',
          maxWidth: '380px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 0 0 0.5px rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <h3 style={{
          fontSize: '18px',
          fontWeight: 600,
          marginBottom: '20px',
          color: 'white',
          textAlign: 'center'
        }}>
          Save Help Flow
        </h3>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 500,
              marginBottom: '8px',
              color: 'rgba(255, 255, 255, 0.7)'
            }}>
              Method Name <span style={{ color: '#f87171' }}>*</span>
            </label>
            <input
              type="text"
              value={methodName}
              onChange={(e) => setMethodName(e.target.value)}
              placeholder="e.g., how_to_add_tasks"
              autoFocus
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '12px',
                color: 'white',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s, background 0.2s',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                e.target.style.background = 'rgba(255, 255, 255, 0.15)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 500,
              marginBottom: '8px',
              color: 'rgba(255, 255, 255, 0.7)'
            }}>
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what this flow demonstrates"
              rows={2}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '12px',
                color: 'white',
                fontSize: '14px',
                outline: 'none',
                resize: 'none',
                transition: 'border-color 0.2s, background 0.2s',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                e.target.style.background = 'rgba(255, 255, 255, 0.15)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                flex: 1,
                padding: '12px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '12px',
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                flex: 1,
                padding: '12px',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                border: 'none',
                borderRadius: '12px',
                color: 'white',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              <Save size={16} />
              Save
            </button>
          </div>
        </form>
      </motion.div>
    </div>,
    document.body
  );
}

interface HelpRecorderPanelProps {
  onClose?: () => void;
}

export function HelpRecorderPanel({ onClose }: HelpRecorderPanelProps) {
  const {
    isRecording,
    stepCount,
    startRecording,
    stopRecording,
    clearSteps
  } = useHelpRecorderContext();

  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  const handleStartRecording = () => {
    clearSteps();
    setMessage(null);
    startRecording();
  };

  const handleStopRecording = () => {
    const steps = stopRecording();
    if (steps.length === 0) {
      setMessage({ type: 'error', text: 'No steps recorded' });
      return;
    }
    setShowSaveDialog(true);
  };

  const handleSave = async (methodName: string, description: string) => {
    setIsSaving(true);
    setShowSaveDialog(false);

    try {
      const steps = stopRecording();

      await helpAutomationApi.createMethod({
        method_name: methodName,
        description: description || undefined,
        steps: steps,
        created_by: '1'
      });

      setMessage({
        type: 'success',
        text: `"${methodName}" saved!`
      });

      clearSteps();
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error('Failed to save help flow:', error);
      setMessage({
        type: 'error',
        text: 'Failed to save'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelSave = () => {
    setShowSaveDialog(false);
    startRecording();
  };

  return createPortal(
    <>
      <AnimatePresence>
        {!isMinimized ? (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{
              position: 'fixed',
              bottom: '24px',
              left: '24px',
              zIndex: 100000,
            }}
          >
            {/* iOS-style Dock */}
            <div
              style={{
                background: 'rgba(30, 30, 30, 0.75)',
                backdropFilter: 'blur(40px) saturate(180%)',
                WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                borderRadius: '20px',
                padding: '16px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 0 0 0.5px rgba(255, 255, 255, 0.1)',
                minWidth: '280px',
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                  padding: '0 4px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {isRecording && (
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#ef4444',
                        animation: 'pulse 1.5s infinite',
                      }}
                    />
                  )}
                  <span
                    style={{
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontSize: '14px',
                      fontWeight: 600,
                    }}
                  >
                    {isRecording ? 'Recording...' : 'Help Recorder'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={() => setIsMinimized(true)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                    title="Minimize"
                  >
                    <ChevronDown size={14} style={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                  </button>
                  <button
                    onClick={onClose}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 59, 48, 0.3)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                    title="Close"
                  >
                    <X size={14} style={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                  </button>
                </div>
              </div>

              {/* Message */}
              <AnimatePresence>
                {message && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{
                      marginBottom: '12px',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      fontSize: '12px',
                      background: message.type === 'success'
                        ? 'rgba(34, 197, 94, 0.2)'
                        : 'rgba(239, 68, 68, 0.2)',
                      color: message.type === 'success'
                        ? '#86efac'
                        : '#fca5a5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>{message.text}</span>
                    <button
                      onClick={() => setMessage(null)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        opacity: 0.7,
                      }}
                    >
                      <X size={12} style={{ color: 'currentColor' }} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {isRecording ? (
                <>
                  {/* Step Counter */}
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '16px 0',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '48px',
                        fontWeight: 700,
                        color: '#3b82f6',
                        lineHeight: 1,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {stepCount}
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'rgba(255, 255, 255, 0.5)',
                        marginTop: '4px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {stepCount === 1 ? 'Step' : 'Steps'} Recorded
                    </div>
                  </div>

                  {/* Progress indicator */}
                  <div
                    style={{
                      height: '3px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '2px',
                      marginBottom: '16px',
                      overflow: 'hidden',
                    }}
                  >
                    <motion.div
                      animate={{
                        width: stepCount > 0 ? '100%' : '0%',
                        background: ['#3b82f6', '#8b5cf6', '#3b82f6'],
                      }}
                      transition={{
                        width: { duration: 0.3 },
                        background: { duration: 2, repeat: Infinity }
                      }}
                      style={{ height: '100%', borderRadius: '2px' }}
                    />
                  </div>

                  {/* Stop Button */}
                  <button
                    onClick={handleStopRecording}
                    disabled={isSaving}
                    style={{
                      width: '100%',
                      padding: '14px',
                      background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                      border: 'none',
                      borderRadius: '12px',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: isSaving ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'opacity 0.2s, transform 0.1s',
                      opacity: isSaving ? 0.7 : 1,
                    }}
                    onMouseEnter={e => !isSaving && (e.currentTarget.style.opacity = '0.9')}
                    onMouseLeave={e => !isSaving && (e.currentTarget.style.opacity = '1')}
                    onMouseDown={e => !isSaving && (e.currentTarget.style.transform = 'scale(0.98)')}
                    onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <Square size={16} fill="currentColor" />
                    Stop & Save
                  </button>
                </>
              ) : (
                <>
                  {/* Idle state - Start Recording */}
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '8px 0 16px',
                    }}
                  >
                    <p
                      style={{
                        fontSize: '12px',
                        color: 'rgba(255, 255, 255, 0.5)',
                        margin: 0,
                      }}
                    >
                      Record interactions to create guides
                    </p>
                  </div>

                  {/* Control Buttons */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={handleStartRecording}
                      style={{
                        flex: 1,
                        padding: '14px',
                        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                        border: 'none',
                        borderRadius: '12px',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'opacity 0.2s, transform 0.1s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                      onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
                      onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <Circle size={16} />
                      Record
                    </button>
                  </div>

                  {/* Action Icons Row */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      gap: '16px',
                      marginTop: '16px',
                      paddingTop: '12px',
                      borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    {/* Record Button */}
                    <button
                      onClick={handleStartRecording}
                      style={{
                        textAlign: 'center',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        transition: 'transform 0.2s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                      title="Start Recording"
                    >
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          background: 'rgba(59, 130, 246, 0.2)',
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 6px',
                          transition: 'background 0.2s',
                        }}
                      >
                        <Circle size={20} style={{ color: '#60a5fa' }} />
                      </div>
                      <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)' }}>Record</span>
                    </button>

                    {/* Save Button - disabled when no steps */}
                    <button
                      onClick={() => setMessage({ type: 'error', text: 'Record steps first' })}
                      disabled={true}
                      style={{
                        textAlign: 'center',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'not-allowed',
                        padding: '4px',
                        opacity: 0.5,
                      }}
                      title="Save (record steps first)"
                    >
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          background: 'rgba(139, 92, 246, 0.2)',
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 6px',
                        }}
                      >
                        <Save size={20} style={{ color: '#a78bfa' }} />
                      </div>
                      <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)' }}>Save</span>
                    </button>

                    {/* Replay Button - opens help modal */}
                    <button
                      onClick={() => {
                        // Close recorder and trigger help modal
                        if (onClose) onClose();
                        // Find and click the help button to open help modal
                        const helpBtn = document.querySelector('#help-fab') as HTMLElement;
                        if (helpBtn) helpBtn.click();
                      }}
                      style={{
                        textAlign: 'center',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        transition: 'transform 0.2s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                      title="Open Help to replay saved flows"
                    >
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          background: 'rgba(34, 197, 94, 0.2)',
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 6px',
                          transition: 'background 0.2s',
                        }}
                      >
                        <Play size={20} style={{ color: '#4ade80' }} fill="#4ade80" />
                      </div>
                      <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)' }}>Replay</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        ) : (
          /* Minimized pill */
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onClick={() => setIsMinimized(false)}
            style={{
              position: 'fixed',
              bottom: '24px',
              left: '24px',
              zIndex: 100000,
              background: 'rgba(30, 30, 30, 0.8)',
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              border: 'none',
              borderRadius: '24px',
              padding: '12px 20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3), inset 0 0 0 0.5px rgba(255, 255, 255, 0.1)',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: isRecording ? '#ef4444' : '#3b82f6',
                animation: isRecording ? 'pulse 1.5s infinite' : 'none',
              }}
            />
            <span style={{ color: 'white', fontSize: '13px', fontWeight: 500 }}>
              {isRecording ? `Recording (${stepCount})` : 'Recorder'}
            </span>
            <ChevronUp size={14} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Keyframe animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }
      `}</style>

      {showSaveDialog && (
        <SaveDialog
          onSave={handleSave}
          onCancel={handleCancelSave}
        />
      )}
    </>,
    document.body
  );
}
