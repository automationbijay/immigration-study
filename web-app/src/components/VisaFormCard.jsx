import React from 'react';
import PageLink from './ui/PageLink';
import Card from './ui/Card';
import ScoreBadge from './ScoreBadge';

/**
 * A uniform card component for all visa calculator forms.
 */
export default function VisaFormCard({
  title,
  description,
  score,
  to,
  href,
  countryCode,
  colorBg = 'var(--color-primary-light)',
  colorText = 'var(--color-primary)'
}) {
  return (
    <Card as={PageLink} {...(href ? { href } : { to })} interactive className="form-card">
      <div className="form-card-head">
        <span className="icon-tile" style={{ backgroundColor: colorBg, color: colorText, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {countryCode && (
            <img
              src={`https://flagcdn.com/${countryCode.toLowerCase()}.svg`}
              alt=""
              style={{ width: '24px', height: 'auto', borderRadius: '2px' }}
            />
          )}
        </span>
        <h3 className="form-card-title">{title}</h3>
      </div>

      <p className="form-card-body">
        {description}
      </p>

      {href && <span className="destination-label">{countryCode === 'au' ? 'Home Affairs' : 'Government of Canada'}</span>}
      {score > 0 && <ScoreBadge points={score} />}
    </Card>
  );
}
