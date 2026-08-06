import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
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
  countryCode, 
  colorBg = 'var(--color-primary-light)', 
  colorText = 'var(--color-primary)' 
}) {
  return (
    <Card as={Link} to={to} interactive className="form-card">
      <div className="form-card-head">
        <span className="icon-tile" style={{ backgroundColor: colorBg, color: colorText, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {countryCode && (
            <img 
              src={`https://flagcdn.com/${countryCode.toLowerCase()}.svg`} 
              alt={`${countryCode} flag`} 
              style={{ width: '24px', height: 'auto', borderRadius: '2px' }} 
            />
          )}
        </span>
        <h3 className="form-card-title">{title}</h3>
        <ChevronRight size={20} className="form-card-chevron" aria-hidden="true" />
      </div>

      <p className="form-card-body">
        {description}
      </p>

      {score > 0 && <ScoreBadge points={score} />}
    </Card>
  );
}
