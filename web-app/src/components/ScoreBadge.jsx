import React from 'react';
import { isEligible } from '../lib/points';

export default function ScoreBadge({ points }) {
  const eligible = isEligible(points);

  return (
    <div className={`score-badge ${eligible ? 'eligible' : ''}`}>
      <span className="score-badge-label">{eligible ? 'Eligible score' : 'Current score'}</span>
      <span className="score-badge-value">
        {points}
        <span className="score-badge-unit"> pts</span>
      </span>
    </div>
  );
}
