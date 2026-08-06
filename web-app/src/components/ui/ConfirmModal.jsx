import React from 'react';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import Modal from './Modal';

/**
 * A universal confirmation modal for questioning or warning the user before
 * an action takes place (e.g., deleting an item, discarding changes).
 *
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {function} onClose - Called when the user cancels or dismisses the modal
 * @param {function} onConfirm - Called when the user clicks the confirm button
 * @param {string} title - The title of the modal
 * @param {string} message - Detailed message explaining the action
 * @param {string} confirmText - Text for the confirm button (default: "Confirm")
 * @param {string} cancelText - Text for the cancel button (default: "Cancel")
 * @param {'danger' | 'warning' | 'info'} intent - Visual style/severity of the modal
 */
export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  intent = 'danger'
}) {
  const isDanger = intent === 'danger';
  const isWarning = intent === 'warning';
  const isInfo = intent === 'info';

  const confirmClass = isDanger ? 'btn-danger' : 'btn-primary';

  let Icon = Info;
  let iconColor = 'var(--color-primary)';

  if (isDanger) {
    Icon = AlertTriangle;
    iconColor = 'var(--color-error, #ef4444)';
  } else if (isWarning) {
    Icon = AlertCircle;
    iconColor = 'var(--color-accent, #f59e0b)';
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: 'var(--spacing-md) 0' }}>
        <div style={{ 
          background: isDanger ? 'var(--color-error-bg, rgba(239, 68, 68, 0.1))' : isWarning ? 'rgba(245, 158, 11, 0.1)' : 'rgba(59, 130, 246, 0.1)',
          padding: '1rem',
          borderRadius: '50%',
          marginBottom: 'var(--spacing-lg)'
        }}>
          <Icon size={32} color={iconColor} />
        </div>
        
        <p style={{ 
          color: 'var(--color-text)', 
          fontSize: '1rem', 
          lineHeight: 1.5, 
          marginBottom: 'var(--spacing-xl)',
          padding: '0 var(--spacing-sm)'
        }}>
          {message}
        </p>

        <div style={{ display: 'flex', gap: 'var(--spacing-md)', width: '100%' }}>
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={onClose} 
            style={{ flex: 1 }}
          >
            {cancelText}
          </button>
          <button 
            type="button" 
            className={confirmClass} 
            onClick={() => {
              onConfirm();
              onClose();
            }} 
            style={{ flex: 1 }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
