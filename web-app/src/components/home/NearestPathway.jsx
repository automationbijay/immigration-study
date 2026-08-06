import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, LockOpen, CheckCircle2 } from 'lucide-react';
import { ELIGIBILITY_THRESHOLD } from '../../lib/points';

export default function NearestPathway({ match, unlocks }) {
  const { visa, points, gap } = match;
  const progress = Math.min(100, Math.round((points / ELIGIBILITY_THRESHOLD) * 100));

  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-xl)',
      padding: 'var(--spacing-xl)',
      boxShadow: 'var(--shadow-md)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Accent strip at top */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'var(--color-accent)' }} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-md)' }}>
        <div>
          <span style={{ 
            display: 'inline-block', 
            background: 'var(--color-muted)', 
            color: 'var(--color-primary)', 
            padding: '4px 10px', 
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.8rem',
            fontWeight: 700,
            marginBottom: '0.5rem'
          }}>
            Subclass {visa.subclass}
          </span>
          <h3 style={{ fontSize: '1.4rem', color: 'var(--color-primary)', marginBottom: '0.25rem' }}>{visa.name}</h3>
          <p style={{ color: 'var(--color-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>{visa.kind}</p>
        </div>
      </div>

      <p style={{ color: 'var(--color-text)', fontSize: '1rem', lineHeight: 1.5, marginBottom: 'var(--spacing-lg)' }}>
        {visa.tagline}
      </p>

      {/* Progress Section */}
      <div style={{ background: 'var(--color-background)', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--spacing-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>
          <span style={{ color: 'var(--color-primary)' }}>{points} / {ELIGIBILITY_THRESHOLD} points</span>
          <span style={{ color: 'var(--color-secondary)' }}>{gap} to go</span>
        </div>
        <div style={{ height: '10px', background: 'var(--color-border)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'var(--color-accent)', borderRadius: 'var(--radius-full)', transition: 'width 1s ease-out' }} />
        </div>
      </div>

      {unlocks.length > 0 && (
        <div style={{ marginBottom: 'var(--spacing-xl)' }}>
          <h4 style={{ fontSize: '1rem', color: 'var(--color-primary)', marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LockOpen size={18} color="var(--color-secondary)" /> Open it with any one of these
          </h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            {unlocks.map((unlock) => (
              <li key={unlock.id} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: 'var(--spacing-sm) var(--spacing-md)',
                background: 'var(--color-background)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <CheckCircle2 size={20} color="var(--color-success)" />
                  <div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-primary)' }}>{unlock.label}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-secondary)' }}>{unlock.detail}</div>
                  </div>
                </div>
                <div style={{ 
                  background: 'var(--color-success-bg)', 
                  color: 'var(--color-success-strong)', 
                  padding: '4px 10px', 
                  borderRadius: 'var(--radius-full)', 
                  fontWeight: 700, 
                  fontSize: '0.9rem' 
                }}>
                  +{unlock.gain}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Link to="/australia-point-calculator" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
        Try these in the calculator
        <ArrowUpRight size={18} aria-hidden="true" />
      </Link>
    </div>
  );
}
