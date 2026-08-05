import React from 'react';

/**
 * The answer to "where do I stand?" — the profile's own score, before any
 * nomination bonus, since each pathway adds a different amount on top.
 */
export default function ScoreHero({ name, basePoints, eligibleCount }) {
  return (
    <section className="score-hero">
      <p className="score-hero-greeting">Hi {name}</p>

      <div className="score-hero-figure">
        <span className="score-hero-points">{basePoints}</span>
        <span className="score-hero-unit">points</span>
      </div>

      <p className="score-hero-caption">
        {eligibleCount > 0 ? (
          <>
            That opens <strong>{eligibleCount}</strong>{' '}
            {eligibleCount === 1 ? 'pathway' : 'pathways'} to Australia
          </>
        ) : (
          'Your Australia skilled migration score'
        )}
      </p>
    </section>
  );
}
