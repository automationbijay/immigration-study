import React from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * A pathway the person actually qualifies for. Expands to explain what the
 * visa is and what happens next — <details> so it works without JS and stays
 * keyboard-operable.
 */
export default function PathwayCard({ match }) {
  const { visa, points } = match;

  return (
    <details className="pathway-card">
      <summary className="pathway-card-summary">
        <div className="pathway-card-head">
          <span className="pathway-card-badge">Subclass {visa.subclass}</span>
          <span className="pathway-card-kind">{visa.kind}</span>
        </div>

        <h3 className="pathway-card-name">{visa.name}</h3>
        <p className="pathway-card-tagline">{visa.tagline}</p>

        <div className="pathway-card-footer">
          {visa.pointsTested ? (
            <span className="pathway-card-score">
              <strong>{points}</strong> points with this pathway
              {visa.nominationPoints > 0 && (
                <span className="pathway-card-bonus">includes +{visa.nominationPoints} nomination</span>
              )}
            </span>
          ) : (
            <span className="pathway-card-score">No points test</span>
          )}
          <span className="pathway-card-toggle">
            Details <ChevronDown size={16} className="accordion-icon" aria-hidden="true" />
          </span>
        </div>
      </summary>

      <div className="pathway-card-body">
        <h4>What this visa gives you</h4>
        <ul className="pathway-list">
          {visa.highlights.map((item) => (
            <li key={item}>
              <Check size={16} aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <h4>How you apply</h4>
        <ol className="pathway-steps">
          {visa.nextSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
    </details>
  );
}
