import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  X,
  MousePointer2,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import type { MachineAction } from '../types';

interface WalkthroughDockProps {
  steps: MachineAction[];
  methodName: string;
  onClose: () => void;
  onStepChange?: (stepIndex: number) => void;
}

interface ElementHighlight {
  element: HTMLElement | null;
  rect: DOMRect | null;
}

export function WalkthroughDock({
  steps,
  methodName,
  onClose,
  onStepChange
}: WalkthroughDockProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const [highlight, setHighlight] = useState<ElementHighlight>({ element: null, rect: null });
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const originalStylesRef = useRef<Map<HTMLElement, { position: string; zIndex: string }>>(new Map());

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  // Debug logging
  console.log('[WalkthroughDock] Mounted with', steps.length, 'steps');
  console.log('[WalkthroughDock] Current step:', currentStep, currentStepData);

  // Reset idle timer on interaction
  const resetIdleTimer = useCallback(() => {
    setIsIdle(false);
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = setTimeout(() => {
      if (!isPlaying) {
        setIsIdle(true);
      }
    }, 5000);
  }, [isPlaying]);

  // Execute action on element (click, input, etc.)
  const executeAction = useCallback((element: HTMLElement, step: MachineAction) => {
    console.log('[WalkthroughDock] Executing action:', step.action, 'on', step.selector);

    switch (step.action) {
      case 'click':
        // Delay click slightly so user can see the highlight first
        setTimeout(() => {
          // Try multiple methods to trigger the click
          console.log('[WalkthroughDock] Attempting click on:', element);

          // Method 1: Native click
          element.click();

          // Method 2: Dispatch synthetic mouse events (in case React needs them)
          const mouseDownEvent = new MouseEvent('mousedown', {
            bubbles: true,
            cancelable: true,
            view: window
          });
          const mouseUpEvent = new MouseEvent('mouseup', {
            bubbles: true,
            cancelable: true,
            view: window
          });
          const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
          });

          element.dispatchEvent(mouseDownEvent);
          element.dispatchEvent(mouseUpEvent);
          element.dispatchEvent(clickEvent);

          console.log('[WalkthroughDock] Clicked element:', step.selector);
        }, 500);
        break;

      case 'input':
      case 'type':
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
          element.focus();
          if (step.value) {
            element.value = step.value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
        break;

      case 'scroll':
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        break;

      case 'move':
      case 'tooltip':
        // These are visual-only actions, no execution needed
        break;

      default:
        console.log('[WalkthroughDock] Unknown action type:', step.action);
    }
  }, []);

  // Find and highlight element
  const highlightStep = useCallback((stepIndex: number) => {
    // Restore previous element styles
    originalStylesRef.current.forEach((styles, element) => {
      element.style.position = styles.position;
      element.style.zIndex = styles.zIndex;
    });
    originalStylesRef.current.clear();

    if (stepIndex >= steps.length) {
      setHighlight({ element: null, rect: null });
      return;
    }

    const step = steps[stepIndex];
    console.log('[WalkthroughDock] Highlighting step', stepIndex, 'selector:', step.selector);

    try {
      const element = document.querySelector(step.selector) as HTMLElement;
      console.log('[WalkthroughDock] Found element:', element);
      console.log('[WalkthroughDock] Element visible:', element ? getComputedStyle(element).display !== 'none' : false);

      if (element) {
        // Check if element is actually visible
        const computedStyle = getComputedStyle(element);
        if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
          console.warn('[WalkthroughDock] Element is hidden:', step.selector);
        }
        // Save original styles
        originalStylesRef.current.set(element, {
          position: element.style.position || '',
          zIndex: element.style.zIndex || ''
        });

        // Apply highlight styles
        element.style.position = 'relative';
        element.style.zIndex = '9999';

        // Scroll into view
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center'
        });

        const rect = element.getBoundingClientRect();
        setHighlight({ element, rect });

        // Execute the action (click, input, etc.)
        executeAction(element, step);
      } else {
        console.warn(`Element not found: ${step.selector}`);
        setHighlight({ element: null, rect: null });
      }
    } catch (error) {
      console.warn(`Invalid selector: ${step.selector}`, error);
      setHighlight({ element: null, rect: null });
    }
  }, [steps, executeAction]);

  // Update highlight on step change
  useEffect(() => {
    highlightStep(currentStep);
    onStepChange?.(currentStep);
  }, [currentStep, highlightStep, onStepChange]);

  // Update rect on scroll/resize
  useEffect(() => {
    if (!highlight.element) return;

    const updateRect = () => {
      if (highlight.element) {
        setHighlight(prev => ({
          ...prev,
          rect: highlight.element!.getBoundingClientRect()
        }));
      }
    };

    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);

    return () => {
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
    };
  }, [highlight.element]);

  // Auto-play timer
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isPlaying && currentStep < steps.length - 1) {
      timer = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, 3000);
    } else if (currentStep >= steps.length - 1) {
      setIsPlaying(false);
    }

    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, steps.length]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      originalStylesRef.current.forEach((styles, element) => {
        element.style.position = styles.position;
        element.style.zIndex = styles.zIndex;
      });
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, []);

  // Control handlers
  const handlePlayPause = () => {
    resetIdleTimer();
    if (currentStep >= steps.length - 1 && !isPlaying) {
      setCurrentStep(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleNext = () => {
    resetIdleTimer();
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
      setIsPlaying(false);
    }
  };

  const handlePrevious = () => {
    resetIdleTimer();
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      setIsPlaying(false);
    }
  };

  const handleRestart = () => {
    resetIdleTimer();
    setCurrentStep(0);
    setIsPlaying(true);
  };

  const handleClose = () => {
    // Restore all element styles before closing
    originalStylesRef.current.forEach((styles, element) => {
      element.style.position = styles.position;
      element.style.zIndex = styles.zIndex;
    });
    onClose();
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    resetIdleTimer();
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newStep = Math.floor(percentage * steps.length);
    setCurrentStep(Math.max(0, Math.min(newStep, steps.length - 1)));
    setIsPlaying(false);
  };

  return createPortal(
    <>
      {/* Highlight overlay for current element */}
      <AnimatePresence>
        {highlight.rect && (
          <>
            {/* Highlight border */}
            <motion.div
              key={`highlight-${currentStep}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="walkthrough-highlight"
              style={{
                position: 'fixed',
                top: highlight.rect.top - 4,
                left: highlight.rect.left - 4,
                width: highlight.rect.width + 8,
                height: highlight.rect.height + 8,
                border: '2px solid rgba(59, 130, 246, 0.8)',
                borderRadius: '8px',
                boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.2), 0 0 20px rgba(59, 130, 246, 0.3)',
                pointerEvents: 'none',
                zIndex: 99998,
              }}
            />

            {/* Floating tooltip near element */}
            <motion.div
              key={`tooltip-${currentStep}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2, delay: 0.1 }}
              style={{
                position: 'fixed',
                top: highlight.rect.bottom + 12,
                left: highlight.rect.left + highlight.rect.width / 2,
                transform: 'translateX(-50%)',
                zIndex: 99999,
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.85)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  color: 'white',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 500,
                  maxWidth: '280px',
                  textAlign: 'center',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                }}
              >
                {currentStepData?.message || currentStepData?.selector}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* iOS-style Dock */}
      <AnimatePresence>
        {!isMinimized ? (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{
              opacity: isIdle ? 0.6 : 1,
              y: 0,
              scale: isIdle ? 0.95 : 1
            }}
            exit={{ opacity: 0, y: 100 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30
            }}
            onMouseEnter={resetIdleTimer}
            onMouseMove={resetIdleTimer}
            style={{
              position: 'fixed',
              bottom: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 100000,
            }}
          >
            <div
              style={{
                background: 'rgba(30, 30, 30, 0.75)',
                backdropFilter: 'blur(40px) saturate(180%)',
                WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                borderRadius: '20px',
                padding: '12px 16px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 0 0 0.5px rgba(255, 255, 255, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                minWidth: '320px',
                maxWidth: '400px',
              }}
            >
              {/* Header with step info */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 4px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MousePointer2 size={14} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                  <span
                    style={{
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontSize: '13px',
                      fontWeight: 600,
                      maxWidth: '180px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {methodName}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      color: 'rgba(255, 255, 255, 0.5)',
                      fontSize: '12px',
                      fontWeight: 500,
                    }}
                  >
                    {currentStep + 1} / {steps.length}
                  </span>
                  <button
                    onClick={() => setIsMinimized(true)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px',
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
                    onClick={handleClose}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px',
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

              {/* Progress bar (clickable scrubber) */}
              <div
                onClick={handleProgressClick}
                style={{
                  position: 'relative',
                  height: '4px',
                  background: 'rgba(255, 255, 255, 0.15)',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  overflow: 'hidden',
                }}
              >
                <motion.div
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                    borderRadius: '2px',
                  }}
                />
                {/* Step markers */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'space-between', padding: '0 1px' }}>
                  {steps.map((_, idx) => (
                    <div
                      key={idx}
                      style={{
                        width: '2px',
                        height: '100%',
                        background: idx <= currentStep ? 'transparent' : 'rgba(255, 255, 255, 0.1)',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Media controls */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                }}
              >
                {/* Restart */}
                <button
                  onClick={handleRestart}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  title="Restart"
                >
                  <RotateCcw size={18} style={{ color: 'rgba(255, 255, 255, 0.8)' }} />
                </button>

                {/* Previous */}
                <button
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '10px',
                    cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    opacity: currentStep === 0 ? 0.4 : 1,
                  }}
                  onMouseEnter={e => currentStep !== 0 && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  title="Previous Step"
                >
                  <SkipBack size={20} style={{ color: 'rgba(255, 255, 255, 0.8)' }} />
                </button>

                {/* Play/Pause */}
                <button
                  onClick={handlePlayPause}
                  style={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '48px',
                    height: '48px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    margin: '0 8px',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause size={22} style={{ color: 'white' }} fill="white" />
                  ) : (
                    <Play size={22} style={{ color: 'white', marginLeft: '2px' }} fill="white" />
                  )}
                </button>

                {/* Next */}
                <button
                  onClick={handleNext}
                  disabled={currentStep === steps.length - 1}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '10px',
                    cursor: currentStep === steps.length - 1 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    opacity: currentStep === steps.length - 1 ? 0.4 : 1,
                  }}
                  onMouseEnter={e => currentStep !== steps.length - 1 && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  title="Next Step"
                >
                  <SkipForward size={20} style={{ color: 'rgba(255, 255, 255, 0.8)' }} />
                </button>

                {/* Spacer for symmetry */}
                <div style={{ width: '38px' }} />
              </div>

              {/* Current step description */}
              <div
                style={{
                  padding: '4px 8px',
                  textAlign: 'center',
                }}
              >
                <span
                  style={{
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '12px',
                    lineHeight: 1.4,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {currentStepData?.message || `Click on ${currentStepData?.selector}`}
                </span>
              </div>
            </div>
          </motion.div>
        ) : (
          /* Minimized pill */
          <motion.button
            initial={{ opacity: 0, y: 50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onClick={() => setIsMinimized(false)}
            style={{
              position: 'fixed',
              bottom: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 100000,
              background: 'rgba(30, 30, 30, 0.8)',
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              border: 'none',
              borderRadius: '24px',
              padding: '10px 20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3), inset 0 0 0 0.5px rgba(255, 255, 255, 0.1)',
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: isPlaying ? '#34d399' : '#fbbf24',
                animation: isPlaying ? 'pulse 1.5s infinite' : 'none',
              }}
            />
            <span style={{ color: 'white', fontSize: '13px', fontWeight: 500 }}>
              Step {currentStep + 1}/{steps.length}
            </span>
            <ChevronUp size={16} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
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
    </>,
    document.body
  );
}
