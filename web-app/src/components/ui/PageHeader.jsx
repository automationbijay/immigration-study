import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * Page title with an optional back link and description. Replaces the
 * hand-rolled "← Back to Discover" markup repeated across the sub-pages.
 */
export default function PageHeader({ title, icon: Icon, description, backTo, backLabel = 'Back' }) {
  return (
    <header className="page-header">
      {backTo && (
        <Link to={backTo} className="page-header-back">
          <ArrowLeft size={20} aria-hidden="true" /> {backLabel}
        </Link>
      )}
      <h2 className="page-header-title">
        {Icon && <Icon size={24} aria-hidden="true" />}
        {title}
      </h2>
      {description && <p className="page-header-description">{description}</p>}
    </header>
  );
}
