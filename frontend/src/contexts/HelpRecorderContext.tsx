import React, { createContext, useContext, ReactNode } from 'react';
import { useHelpRecorder } from '../hooks/useHelpRecorder';
import type { RecordedActionType, RecordedStep } from '../hooks/useHelpRecorder';

interface HelpRecorderContextType {
  isRecording: boolean;
  stepCount: number;
  startRecording: () => void;
  stopRecording: () => RecordedStep[];
  recordButtonClick: (buttonLabel: string, metadata?: Record<string, any>) => void;
  recordTabOpen: (tabName: string, metadata?: Record<string, any>) => void;
  recordTabClose: (tabName: string, metadata?: Record<string, any>) => void;
  recordViewChange: (viewName: string, metadata?: Record<string, any>) => void;
  recordModalOpen: (modalName: string, metadata?: Record<string, any>) => void;
  recordModalClose: (modalName: string, metadata?: Record<string, any>) => void;
  recordFormSubmit: (formName: string, metadata?: Record<string, any>) => void;
  recordRouteChange: (route: string, metadata?: Record<string, any>) => void;
  recordStep: (action_type: RecordedActionType, target: string, metadata?: Record<string, any>) => void;
  clearSteps: () => void;
}

const HelpRecorderContext = createContext<HelpRecorderContextType | undefined>(undefined);

export function HelpRecorderProvider({ children }: { children: ReactNode }) {
  const recorder = useHelpRecorder();

  return (
    <HelpRecorderContext.Provider value={recorder}>
      {children}
    </HelpRecorderContext.Provider>
  );
}

export function useHelpRecorderContext() {
  const context = useContext(HelpRecorderContext);
  if (context === undefined) {
    throw new Error('useHelpRecorderContext must be used within a HelpRecorderProvider');
  }
  return context;
}
