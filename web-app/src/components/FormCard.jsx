import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, ChevronRight } from 'lucide-react';
import Card from './ui/Card';
import ScoreBadge from './ScoreBadge';

/**
 * The "Australia Point Estimation" entry card. Discover and FormsHub rendered
 * near-identical copies of this; they now share one.
 */
export default function FormCard({ totalPoints }) {
  return (
    <Card as={Link} to="/australia-point-calculator" interactive className="form-card">
      <div className="form-card-head">
        <span className="icon-tile">
          <FileText size={20} aria-hidden="true" />
        </span>
        <h3 className="form-card-title">Australia Point Estimation</h3>
        <ChevronRight size={20} className="form-card-chevron" aria-hidden="true" />
      </div>

      <p className="form-card-body">
        Calculate and estimate your points for Australian skilled migration visas
        (Subclass 189, 190, 491).
      </p>

      {totalPoints > 0 && <ScoreBadge points={totalPoints} />}
    </Card>
  );
}
