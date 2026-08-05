import React from 'react';
import { TrendingUp } from 'lucide-react';

/**
 * Ranked ways to add points. Useful whether or not someone already qualifies —
 * a higher score improves invitation odds even once past the threshold.
 */
export default function Opportunities({ items }) {
  if (items.length === 0) return null;

  return (
    <ul className="opportunity-list">
      {items.map((item) => (
        <li key={item.id} className="opportunity">
          <span className="opportunity-icon">
            <TrendingUp size={18} aria-hidden="true" />
          </span>
          <span className="opportunity-body">
            <span className="opportunity-label">{item.label}</span>
            <span className="opportunity-detail">{item.detail}</span>
          </span>
          <span className="opportunity-gain">+{item.gain}</span>
        </li>
      ))}
    </ul>
  );
}
