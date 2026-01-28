import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, X, ChevronRight, ChevronLeft, RotateCcw } from 'lucide-react';
import type { MachineAction } from '../types';

interface VisualWalkthroughProps {
  steps: MachineAction[];
  methodName: string;
  onClose: () => void;
  autoPlay?: boolean;
}

interface ElementRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function VisualWalkthrough({
  steps,
  methodName,
  onClose,
  autoPlay = false
}: VisualWalkthroughProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null);
  const [elementRect, setElementRect] = useState<ElementRect | null>(null);
  const originalStylesRef = useRef<{ position: string; zIndex: string } | null>(null);

  console.log('VisualWalkthrough mounted with', steps.length, 'steps');
  console.log('Steps:', steps);

  const findElement = useCallback((selector: string): HTMLElement | null => {
    try {
      console.log('Finding element with selector:', selector);
      const element = document.querySelector(selector);
      console.log('Found element:', element);
      return element as HTMLElement | null;
    } catch (error) {
      console.warn(`Invalid selector: ${selector}`, error);
      return null;
    }
  }, []);

  const highlightStep = useCallback((stepIndex: number) => {
    if (stepIndex >= steps.length) return;

    // Restore previous element's styles
    if (highlightedElement && originalStylesRef.current) {
      highlightedElement.style.position = originalStylesRef.current.position;
      highlightedElement.style.zIndex = originalStylesRef.current.zIndex;
    }

    const step = steps[stepIndex];
    console.log('Highlighting step:', stepIndex, step);
    const element = findElement(step.selector);

    if (element) {
      // Save original styles
      originalStylesRef.current = {
        position: element.style.position || '',
        zIndex: element.style.zIndex || ''
      };

      setHighlightedElement(element);

      // Get element position and update rect state
      const rect = element.getBoundingClientRect();
      setElementRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      });

      // Scroll element into view smoothly
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      });

      // Set element to appear above the overlay (portal uses z-index 99999+)
      element.style.position = 'relative';
      element.style.zIndex = '100000';
    } else {
      console.warn(`Element not found for selector: ${step.selector}`);
      setHighlightedElement(null);
      setElementRect(null);
    }
  }, [steps, findElement, highlightedElement]);

  useEffect(() => {
    highlightStep(currentStep);
  }, [currentStep, highlightStep]);

  // Update element rect on scroll/resize
  useEffect(() => {
    if (!highlightedElement) return;

    const updateRect = () => {
      const rect = highlightedElement.getBoundingClientRect();
      setElementRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      });
    };

    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);

    return () => {
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
    };
  }, [highlightedElement]);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isPlaying && currentStep < steps.length - 1) {
      timer = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, 2500); // 2.5 seconds per step
    } else if (currentStep >= steps.length - 1) {
      setIsPlaying(false);
    }

    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, steps.length]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (highlightedElement && originalStylesRef.current) {
        highlightedElement.style.position = originalStylesRef.current.position;
        highlightedElement.style.zIndex = originalStylesRef.current.zIndex;
      }
    };
  }, [highlightedElement]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
      setIsPlaying(false);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      setIsPlaying(false);
    }
  };

  const handleRestart = () => {
    setCurrentStep(0);
    setIsPlaying(true);
  };

  const togglePlayPause = () => {
    setIsPlaying(prev => !prev);
  };

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  // Use Portal to render at document body level, outside any modal context
  return createPortal(
    <>
      {/* Overlay with spotlight cutout */}
      <div
        className="fixed inset-0"
        onClick={onClose}
        style={{
          zIndex: 99999,
          background: elementRect
            ? `radial-gradient(ellipse ${elementRect.width + 60}px ${elementRect.height + 60}px at ${elementRect.left + elementRect.width / 2}px ${elementRect.top + elementRect.height / 2}px, transparent 0%, rgba(0,0,0,0.85) 100%)`
            : 'rgba(0,0,0,0.85)'
        }}
      />

      {/* Spotlight border on highlighted element */}
      <AnimatePresence>
        {elementRect && (
          <>
            <motion.div
              key={`highlight-${currentStep}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed pointer-events-none"
              style={{
                zIndex: 100000,
                top: elementRect.top - 8,
                left: elementRect.left - 8,
                width: elementRect.width + 16,
                height: elementRect.height + 16,
                border: '3px solid #3b82f6',
                borderRadius: '8px',
                boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.3), 0 0 40px rgba(59, 130, 246, 0.5), inset 0 0 20px rgba(59, 130, 246, 0.1)',
                animation: 'pulse 2s infinite'
              }}
            />

            {/* Tooltip below element */}
            <motion.div
              key={`tooltip-${currentStep}`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="fixed pointer-events-none"
              style={{
                zIndex: 100001,
                top: elementRect.top + elementRect.height + 20,
                left: elementRect.left + (elementRect.width / 2),
                transform: 'translateX(-50%)'
              }}
            >
              <div className="bg-blue-600 text-white px-4 py-3 rounded-xl shadow-2xl max-w-sm border border-blue-400">
                <div className="text-sm font-bold mb-1">
                  Step {currentStep + 1} of {steps.length}
                </div>
                <div className="text-sm opacity-95">
                  {currentStepData.message || `${currentStepData.action}: ${currentStepData.selector}`}
                </div>
                {/* Arrow pointing up */}
                <div
                  className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-blue-600"
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Fallback message when element not found */}
      {!elementRect && highlightedElement === null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-yellow-600 text-white px-6 py-4 rounded-xl shadow-2xl"
          style={{ zIndex: 100001 }}
        >
          <div className="text-sm font-bold mb-1">Element not found</div>
          <div className="text-xs opacity-90">
            Selector: {currentStepData?.selector || 'unknown'}
          </div>
        </motion.div>
      )}

      {/* Control Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-8 left-1/2 transform -translate-x-1/2"
        style={{ zIndex: 100002 }}
      >
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 min-w-[400px] border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {methodName}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Step {currentStep + 1} of {steps.length}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-blue-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Current Step Info */}
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
              {currentStepData.action.toUpperCase()}
            </div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {currentStepData.message || currentStepData.selector}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleRestart}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Restart"
            >
              <RotateCcw size={20} className="text-gray-700 dark:text-gray-300" />
            </button>

            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Previous"
            >
              <ChevronLeft size={20} className="text-gray-700 dark:text-gray-300" />
            </button>

            <button
              onClick={togglePlayPause}
              className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isPlaying ? (
                <>
                  <Pause size={18} />
                  Pause
                </>
              ) : (
                <>
                  <Play size={18} />
                  {currentStep === steps.length - 1 ? 'Restart' : 'Play'}
                </>
              )}
            </button>

            <button
              onClick={handleNext}
              disabled={currentStep === steps.length - 1}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Next"
            >
              <ChevronRight size={20} className="text-gray-700 dark:text-gray-300" />
            </button>
          </div>
        </div>
      </motion.div>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2), 0 0 30px rgba(59, 130, 246, 0.4);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.1), 0 0 40px rgba(59, 130, 246, 0.6);
          }
        }
      `}</style>
    </>,
    document.body
  );
}
