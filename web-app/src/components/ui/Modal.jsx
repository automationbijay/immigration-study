import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * The single modal implementation: a bottom sheet on mobile, centred on
 * desktop. `size="sm"` keeps narrow dialogs (like the CV uploader) centred at
 * every width.
 *
 * Handles the four things a dialog owes a keyboard user — focus moves in on
 * open, Tab cannot leave, Escape closes, focus returns to whatever opened it —
 * plus a body scroll lock so the page behind does not scroll away.
 */

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'summary',
  '[tabindex]:not([tabindex^="-"])',
].join(',');

// Profile opens the CV uploader on top of an already-open section sheet, so
// modals genuinely stack. Only the top of the stack traps focus and answers
// Escape, and the body stays locked until the last one closes.
const stack = [];
let restoreBodyStyle = null;

function lockBodyScroll() {
  // Removing the scrollbar would otherwise shift the whole page sideways.
  const gap = window.innerWidth - document.documentElement.clientWidth;
  restoreBodyStyle = {
    overflow: document.body.style.overflow,
    paddingRight: document.body.style.paddingRight,
  };
  document.body.style.overflow = 'hidden';
  if (gap > 0) document.body.style.paddingRight = `${gap}px`;
}

function unlockBodyScroll() {
  if (!restoreBodyStyle) return;
  document.body.style.overflow = restoreBodyStyle.overflow;
  document.body.style.paddingRight = restoreBodyStyle.paddingRight;
  restoreBodyStyle = null;
}

/** Focusable descendants that are actually rendered, in tab order. */
function focusableWithin(root) {
  return Array.from(root.querySelectorAll(FOCUSABLE)).filter(
    (el) => el.getClientRects().length > 0,
  );
}

export default function Modal({ isOpen, onClose, title, size = 'md', children }) {
  const titleId = useId();
  const contentRef = useRef(null);
  const restoreFocusRef = useRef(null);
  // Stable per-instance identity, so this modal can find itself in the stack.
  const tokenRef = useRef({});
  // Guards against a text selection that starts inside the dialog and ends on
  // the overlay: that fires a click on the overlay and would discard the form.
  const pressedOverlayRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return undefined;

    const token = tokenRef.current;
    stack.push(token);
    if (stack.length === 1) lockBodyScroll();

    restoreFocusRef.current = document.activeElement;

    // Focus the dialog itself rather than its first control, so a screen
    // reader announces the title before reading out "Close, button".
    contentRef.current?.focus();

    return () => {
      const index = stack.indexOf(token);
      if (index !== -1) stack.splice(index, 1);
      if (stack.length === 0) unlockBodyScroll();

      const target = restoreFocusRef.current;
      restoreFocusRef.current = null;
      // The opener can be gone by now (a modal opened from another modal's
      // content), in which case there is nothing sensible to restore to.
      if (target?.isConnected && typeof target.focus === 'function') {
        target.focus();
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const token = tokenRef.current;

    function handleKeyDown(event) {
      // Only the topmost dialog reacts, so Escape closes one layer at a time.
      if (stack[stack.length - 1] !== token) return;

      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose?.();
        return;
      }

      if (event.key !== 'Tab') return;

      const content = contentRef.current;
      if (!content) return;

      const items = focusableWithin(content);
      if (items.length === 0) {
        event.preventDefault();
        content.focus();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      // The dialog container counts as outside: Shift+Tab from it would
      // otherwise walk backwards into the page behind.
      const outside = active === content || !content.contains(active);

      if (event.shiftKey && (active === first || outside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || outside)) {
        event.preventDefault();
        first.focus();
      }
    }

    // Bubble phase, not capture: a control inside the dialog that opens its own
    // popup (the occupation combobox) needs first refusal on Escape, so one
    // press closes its dropdown rather than the whole dialog.
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Rendered at the document root so no ancestor's transform or overflow can
  // clip a position: fixed overlay.
  return createPortal(
    <div
      className={`modal-overlay modal-overlay-${size}`}
      onMouseDown={(e) => {
        pressedOverlayRef.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && pressedOverlayRef.current) onClose?.();
      }}
    >
      <div
        ref={contentRef}
        className={`modal-content modal-content-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="modal-header">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close dialog">
            <X size={24} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
