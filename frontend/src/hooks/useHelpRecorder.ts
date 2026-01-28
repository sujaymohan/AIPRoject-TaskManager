import { useState, useCallback, useRef } from 'react';

export type RecordedActionType =
  | 'BUTTON_CLICK'
  | 'TAB_OPEN'
  | 'TAB_CLOSE'
  | 'VIEW_CHANGE'
  | 'MODAL_OPEN'
  | 'MODAL_CLOSE'
  | 'FORM_SUBMIT'
  | 'ROUTE_CHANGE';

export interface RecordedStep {
  step_order: number;
  action_type: RecordedActionType;
  target: string;
  metadata?: Record<string, any>;
}

export interface RecorderState {
  isRecording: boolean;
  steps: RecordedStep[];
  stepCount: number;
}

export function useHelpRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [stepCount, setStepCount] = useState(0);
  const stepsRef = useRef<RecordedStep[]>([]);
  const isRecordingRef = useRef(false);

  const startRecording = useCallback(() => {
    stepsRef.current = [];
    setStepCount(0);
    isRecordingRef.current = true;
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    isRecordingRef.current = false;
    setIsRecording(false);
    return stepsRef.current;
  }, []);

  const recordStep = useCallback((
    action_type: RecordedActionType,
    target: string,
    metadata?: Record<string, any>
  ) => {
    if (!isRecordingRef.current) return;

    const newStep: RecordedStep = {
      step_order: stepsRef.current.length,
      action_type,
      target,
      metadata: metadata || {}
    };

    stepsRef.current.push(newStep);
    setStepCount(stepsRef.current.length);

    console.log('[useHelpRecorder] Recorded step:', action_type, target, 'Total steps:', stepsRef.current.length);
  }, []);

  const recordButtonClick = useCallback((buttonLabel: string, metadata?: Record<string, any>) => {
    recordStep('BUTTON_CLICK', buttonLabel, metadata);
  }, [recordStep]);

  const recordTabOpen = useCallback((tabName: string, metadata?: Record<string, any>) => {
    recordStep('TAB_OPEN', tabName, metadata);
  }, [recordStep]);

  const recordTabClose = useCallback((tabName: string, metadata?: Record<string, any>) => {
    recordStep('TAB_CLOSE', tabName, metadata);
  }, [recordStep]);

  const recordViewChange = useCallback((viewName: string, metadata?: Record<string, any>) => {
    recordStep('VIEW_CHANGE', viewName, metadata);
  }, [recordStep]);

  const recordModalOpen = useCallback((modalName: string, metadata?: Record<string, any>) => {
    recordStep('MODAL_OPEN', modalName, metadata);
  }, [recordStep]);

  const recordModalClose = useCallback((modalName: string, metadata?: Record<string, any>) => {
    recordStep('MODAL_CLOSE', modalName, metadata);
  }, [recordStep]);

  const recordFormSubmit = useCallback((formName: string, metadata?: Record<string, any>) => {
    recordStep('FORM_SUBMIT', formName, metadata);
  }, [recordStep]);

  const recordRouteChange = useCallback((route: string, metadata?: Record<string, any>) => {
    recordStep('ROUTE_CHANGE', route, metadata);
  }, [recordStep]);

  const clearSteps = useCallback(() => {
    stepsRef.current = [];
    setStepCount(0);
  }, []);

  const getState = useCallback((): RecorderState => {
    return {
      isRecording,
      steps: stepsRef.current,
      stepCount: stepsRef.current.length
    };
  }, [isRecording]);

  return {
    isRecording,
    startRecording,
    stopRecording,
    recordStep,
    recordButtonClick,
    recordTabOpen,
    recordTabClose,
    recordViewChange,
    recordModalOpen,
    recordModalClose,
    recordFormSubmit,
    recordRouteChange,
    clearSteps,
    getState,
    stepCount
  };
}
