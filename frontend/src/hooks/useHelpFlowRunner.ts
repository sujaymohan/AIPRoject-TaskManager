import { useState, useCallback, useRef } from 'react';
import { uiAutomation, type AutomationState } from '../utils/uiAutomation';
import type { MachineAction } from '../types';

export interface HelpFlowState {
  isRunning: boolean;
  currentStep: number;
  totalSteps: number;
  currentMessage?: string;
  error?: string;
}

export function useHelpFlowRunner() {
  const [flowState, setFlowState] = useState<HelpFlowState>({
    isRunning: false,
    currentStep: 0,
    totalSteps: 0,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const runFlow = useCallback(async (actions: MachineAction[]) => {
    if (uiAutomation.isFlowRunning()) {
      console.warn('A help flow is already running');
      return;
    }

    abortControllerRef.current = new AbortController();

    setFlowState({
      isRunning: true,
      currentStep: 0,
      totalSteps: actions.length,
    });

    try {
      await uiAutomation.runHelpFlow(actions, (state: AutomationState) => {
        setFlowState({
          isRunning: state.isRunning,
          currentStep: state.currentStep,
          totalSteps: state.totalSteps,
          currentMessage: state.currentMessage,
        });
      });

      setFlowState({
        isRunning: false,
        currentStep: actions.length,
        totalSteps: actions.length,
      });
    } catch (error) {
      setFlowState({
        isRunning: false,
        currentStep: 0,
        totalSteps: actions.length,
        error: error instanceof Error ? error.message : 'Flow execution failed',
      });
    }
  }, []);

  const stopFlow = useCallback(() => {
    uiAutomation.stop();
    abortControllerRef.current?.abort();
    setFlowState({
      isRunning: false,
      currentStep: 0,
      totalSteps: 0,
    });
  }, []);

  const resetFlow = useCallback(() => {
    setFlowState({
      isRunning: false,
      currentStep: 0,
      totalSteps: 0,
    });
  }, []);

  return {
    flowState,
    runFlow,
    stopFlow,
    resetFlow,
  };
}
