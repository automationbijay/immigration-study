import React from 'react';

export default function FloatingScoreCard({ title, subtitle, score, maxWidth = '900px', subtitleColor }) {
  return (
    <div style={{ 
      position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)', 
      width: '90%', maxWidth, 
      background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-foreground) 100%)',
      color: 'white', padding: '1.5rem', borderRadius: '12px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      boxShadow: '0 10px 25px rgba(30, 58, 138, 0.3)', zIndex: 10
    }}>
      <div>
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>{title}</h2>
        {subtitle && (
          <div style={{ marginTop: '0.5rem', fontWeight: 500, fontSize: '0.9rem', opacity: subtitleColor ? 1 : 0.9, color: subtitleColor || 'white' }}>
            {subtitle}
          </div>
        )}
      </div>
      <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'white', fontFamily: "'Space Grotesk', sans-serif" }}>
        {score}
      </div>
    </div>
  );
}
