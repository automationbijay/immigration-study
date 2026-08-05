import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { ELIGIBILITY_THRESHOLD } from '../../lib/points';

/**
 * Shown when nothing qualifies yet. Frames the closest visa as a goal with the
 * specific actions that would open it, so the screen still answers "what is
 * possible" rather than listing what is not.
 */
export default function NearestPathway({ match, unlocks }) {
  const { visa, points, gap } = match;
  const progress = Math.min(100, Math.round((points / ELIGIBILITY_THRESHOLD) * 100));

  return (
    <div className="nearest-card">
      <div className="nearest-head">
        <span className="pathway-card-badge">Subclass {visa.subclass}</span>
        <span className="pathway-card-kind">{visa.kind}</span>
      </div>

      <h3 className="pathway-card-name">{visa.name}</h3>
      <p className="pathway-card-tagline">{visa.tagline}</p>

      <div className="nearest-progress">
        <div className="nearest-progress-track">
          <div className="nearest-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <p className="nearest-progress-label">
          <strong>{points}</strong> of {ELIGIBILITY_THRESHOLD} points &middot; {gap} to go
        </p>
      </div>

      {unlocks.length > 0 && (
        <div className="nearest-unlocks">
          <h4>Open it with any one of these</h4>
          <ul>
            {unlocks.map((unlock) => (
              <li key={unlock.id}>
                <span className="nearest-unlock-body">
                  <span className="nearest-unlock-label">{unlock.label}</span>
                  <span className="nearest-unlock-detail">{unlock.detail}</span>
                </span>
                <span className="nearest-unlock-gain">+{unlock.gain}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Link to="/australia-point-calculator" className="btn-primary nearest-action">
        Try these in the calculator
        <ArrowUpRight size={18} aria-hidden="true" />
      </Link>
    </div>
  );
}
