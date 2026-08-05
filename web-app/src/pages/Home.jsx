import React from 'react';

export default function Home({ session }) {
  // Extract a display name from email or fallback to 'User'
  const email = session?.user?.email || '';
  const name = email ? email.split('@')[0] : 'User';

  return (
    <div className="calculator-container" style={{ 
      padding: '4rem 2rem', 
      textAlign: 'center', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      minHeight: '60vh'
    }}>
      <h1 style={{ 
        fontSize: '2.5rem', 
        fontWeight: 'bold', 
        color: 'var(--color-primary)', 
        marginBottom: '1rem' 
      }}>
        Welcome, {name}! 👋
      </h1>
      <p style={{ 
        fontSize: '1.2rem', 
        color: 'var(--color-secondary)',
        maxWidth: '500px',
        lineHeight: '1.6'
      }}>
        We're glad to have you here. Explore the navigation menu to calculate your points, view migration pathways, and manage your profile.
      </p>
    </div>
  );
}
