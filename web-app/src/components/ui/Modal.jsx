import React from 'react';
import { X } from 'lucide-react';

/**
 * The single modal implementation: a bottom sheet on mobile, centred on
 * desktop. `size="sm"` keeps narrow dialogs (like the CV uploader) centred at
 * every width.
 *
 * Accessibility hardening — focus trap, Escape, focus restore, scroll lock —
 * lands in the Phase 3 pass; this component exists so there is one place to
 * add it rather than two divergent copies.
 */
export default function Modal({ isOpen, onClose, title, size = 'md', children }) {
  if (!isOpen) return null;

  return (
    <div className={`modal-overlay modal-overlay-${size}`} onClick={onClose}>
      <div
        className={`modal-content modal-content-${size}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close dialog">
            <X size={24} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
