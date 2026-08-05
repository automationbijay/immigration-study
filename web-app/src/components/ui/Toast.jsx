import React from 'react';

/**
 * Fixed-position status message. Sits above the modal overlay so a save result
 * is never hidden behind the dialog that triggered it.
 */
export default function Toast({ message, tone }) {
  if (!message) return null;

  const resolved = tone ?? (/error|failed/i.test(message) ? 'error' : 'success');

  return (
    <div
      className={`toast ${resolved === 'error' ? 'error-message' : 'success-message'}`}
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  );
}
