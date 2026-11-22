import React from 'react';
import PageLink from './PageLink';
import { ArrowLeft } from 'lucide-react';

/**
 * Page title with an optional back link and description. Replaces the
 * hand-rolled "← Back to Discover" markup repeated across the sub-pages.
 */
export default function PageHeader({ title, icon: Icon, description, backTo, backLabel = 'Back' }) {
  return (
    <header className="page-header">
      {backTo && (
        <PageLink to={backTo} className="page-header-back">
          <ArrowLeft size={20} aria-hidden="true" /> {backLabel}
        </PageLink>
      )}
      <h1 className="page-header-title">
        {Icon && <Icon size={24} aria-hidden="true" />}
        {title}
      </h1>
      {description && <p className="page-header-description">{description}</p>}
    </header>
  );
}
