// Site-wide facts used by the footer and the information pages.
export const SITE_NAME = 'Skilled Migration Assistant';

// Set VITE_CONTACT_EMAIL in the deployment environment. Pages that show it
// fall back gracefully when it is missing.
export const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || '';

// Bump when the Privacy Policy, Terms or Disclaimer text changes.
export const LEGAL_UPDATED = '22 November 2026';
