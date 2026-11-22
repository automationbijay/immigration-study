import { useEffect, useRef, useState } from 'react';
import { metrics } from '@sentry/react';
import PageLink from './ui/PageLink';

export default function ScoreDisplay({ country, title, score, unit, rows, missing, started, prompt, threshold, guidance, source }) {
  const complete = missing.length === 0;
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const counted = useRef({ started: false, reviewed: false });

  useEffect(() => {
    if (!import.meta.env.PROD || !import.meta.env.VITE_SENTRY_DSN) return;
    if (started && !counted.current.started) {
      metrics.count('calculator.started', 1, { attributes: { country } });
      counted.current.started = true;
    }
    if (complete && breakdownOpen && !counted.current.reviewed) {
      metrics.count('calculator.reviewed', 1, { attributes: { country } });
      counted.current.reviewed = true;
    }
  }, [country, started, complete, breakdownOpen]);

  return (
    <aside className="estimate-panel" id="estimate" tabIndex={-1} aria-label={title}>
      <h2>{title}</h2>
      <div role="status" className="estimate-status">
        {started ? (
          <>
            <p className="estimate-number">{score} <span>{unit}</span></p>
            <p>{complete
              ? (score >= threshold ? `Meets the ${threshold}-point threshold.` : `${threshold - score} points below the threshold.`)
              : `Partial estimate. Still to answer: ${missing.join(', ')}.`}</p>
          </>
        ) : <p>{prompt}</p>}
      </div>
      {started && (
        <details className="estimate-breakdown" onToggle={event => setBreakdownOpen(event.currentTarget.open)}>
          <summary>View breakdown</summary>
          <dl>
            {rows.map(({ label, points }) => (
              <div key={label}><dt>{label}</dt><dd>{points ?? 'Unanswered'}</dd></div>
            ))}
          </dl>
        </details>
      )}
      <PageLink href={source}>{guidance}</PageLink>
    </aside>
  );
}
