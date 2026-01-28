import React, { ButtonHTMLAttributes } from 'react';
import { useHelpRecorderContext } from '../contexts/HelpRecorderContext';

interface RecordableButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  actionLabel: string;
  metadata?: Record<string, unknown>;
}

/**
 * A wrapper for buttons that automatically records clicks when the Help Recorder is active.
 * Use this for any button that should be part of help flows.
 */
export function RecordableButton({
  actionLabel,
  metadata,
  onClick,
  children,
  ...props
}: RecordableButtonProps) {
  const { recordButtonClick } = useHelpRecorderContext();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    recordButtonClick(actionLabel, metadata);
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button {...props} onClick={handleClick}>
      {children}
    </button>
  );
}
