import React from 'react';
import { Target, Award, Star } from 'lucide-react';

export default function ScoreHero({ name, basePoints, eligibleCount }) {
  return (
    <section style={{
      background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-foreground) 100%)',
      borderRadius: 'var(--radius-xl)',
      padding: 'var(--spacing-2xl) var(--spacing-lg)',
      color: 'white',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 10px 30px rgba(30, 58, 138, 0.25)',
      marginBottom: 'var(--spacing-xl)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center'
    }}>
      {/* Decorative background elements */}
      <div style={{ position: 'absolute', top: '-10%', right: '-10%', opacity: 0.1, transform: 'rotate(15deg)' }}>
        <Target size={180} />
      </div>
      
      <p style={{ fontSize: '1.1rem', fontWeight: 500, marginBottom: 'var(--spacing-md)', opacity: 0.9, zIndex: 1 }}>
        Hi {name}, your base score is
      </p>

      <div style={{ 
        display: 'inline-flex', 
        alignItems: 'baseline', 
        justifyContent: 'center',
        background: 'rgba(255, 255, 255, 0.1)',
        padding: '1rem 2.5rem',
        borderRadius: 'var(--radius-full)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        marginBottom: 'var(--spacing-lg)',
        zIndex: 1
      }}>
        <span style={{ fontSize: '4.5rem', fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1 }}>
          {basePoints}
        </span>
        <span style={{ fontSize: '1.25rem', fontWeight: 600, marginLeft: '0.5rem', opacity: 0.9 }}>
          pts
        </span>
      </div>

      <div style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '0.5rem', 
        backgroundColor: eligibleCount > 0 ? 'rgba(74, 222, 128, 0.2)' : 'rgba(255, 255, 255, 0.15)',
        color: eligibleCount > 0 ? '#bbf7d0' : 'white',
        padding: '0.5rem 1rem',
        borderRadius: 'var(--radius-full)',
        fontSize: '0.95rem',
        fontWeight: 600,
        border: `1px solid ${eligibleCount > 0 ? 'rgba(74, 222, 128, 0.3)' : 'rgba(255, 255, 255, 0.2)'}`,
        zIndex: 1
      }}>
        {eligibleCount > 0 ? (
          <>
            <Award size={18} />
            That opens {eligibleCount} {eligibleCount === 1 ? 'pathway' : 'pathways'} to Australia
          </>
        ) : (
          <>
            <Star size={18} />
            Your Australia skilled migration score
          </>
        )}
      </div>
    </section>
  );
}
