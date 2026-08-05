import React from 'react';
import { Link } from 'react-router-dom';
import { Check, Circle } from 'lucide-react';

/**
 * Completeness meter plus the outstanding items. Matching is only as good as
 * the profile behind it, so unfilled fields are surfaced as the first action.
 */
export default function ProfileChecklist({ gaps, percent }) {
  const remaining = gaps.filter((gap) => !gap.done);

  return (
    <div className="checklist-card">
      <div className="checklist-head">
        <h3>Your profile</h3>
        <span className="checklist-percent">{percent}%</span>
      </div>

      <div className="checklist-track">
        <div className="checklist-fill" style={{ width: `${percent}%` }} />
      </div>

      {remaining.length > 0 ? (
        <>
          <p className="checklist-caption">
            Fill these in for a sharper match:
          </p>
          <ul className="checklist-items">
            {remaining.map((gap) => (
              <li key={gap.id}>
                <Circle size={16} aria-hidden="true" />
                <Link to={gap.to}>{gap.label}</Link>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="checklist-caption checklist-complete">
          <Check size={16} aria-hidden="true" /> Everything we need is filled in.
        </p>
      )}
    </div>
  );
}
