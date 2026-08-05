import React from 'react';
import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export default function NotFound({ session }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      minHeight: '60vh',
      gap: '1rem',
    }}>
      <Compass size={48} className="text-muted" aria-hidden="true" />
      <h2 style={{ margin: 0 }}>Page not found</h2>
      <p className="text-muted" style={{ margin: 0, maxWidth: '32ch' }}>
        The page you were looking for doesn&apos;t exist or has moved.
      </p>
      <Link
        to={session ? '/home' : '/'}
        className="btn-primary"
        style={{ width: 'auto', padding: '0.875rem 2rem', textDecoration: 'none', marginTop: '0.5rem' }}
      >
        {session ? 'Back to Home' : 'Back to Start'}
      </Link>
    </div>
  );
}
