import React from 'react';
import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export default function NotFound({ session }) {
  return (
    <div className="empty-state not-found">
      <Compass size={48} className="text-muted" aria-hidden="true" />
      <h2>Page not found</h2>
      <p className="text-muted">
        The page you were looking for doesn&apos;t exist or has moved.
      </p>
      <Link to={session ? '/home' : '/'} className="btn-primary not-found-action">
        {session ? 'Back to Home' : 'Back to Start'}
      </Link>
    </div>
  );
}
