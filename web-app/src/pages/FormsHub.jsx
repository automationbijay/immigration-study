import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Calculator, ChevronRight } from 'lucide-react';
import { useProfile } from '../lib/ProfileContext';
import PageHeader from '../components/ui/PageHeader';
import FormCard from '../components/FormCard';
import Card from '../components/ui/Card';
import { SkeletonPage } from '../components/ui/Skeleton';
import ScoreBadge from '../components/ScoreBadge';

export default function FormsHub({ session }) {
  const { totalPoints, fswRow, crsRow, loading } = useProfile();

  return (
    <>
      <PageHeader title="All Forms" icon={FileText} backTo="/discover" backLabel="Back to Discover" />

      {loading ? (
        <SkeletonPage lines={1} label="Loading forms" />
      ) : (
        <div className="card-grid">
          <FormCard totalPoints={totalPoints} />
          
          <Card as={Link} to="/forms/canada-fsw" interactive className="form-card">
            <div className="form-card-head">
              <span className="icon-tile" style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                <Calculator size={20} aria-hidden="true" />
              </span>
              <h3 className="form-card-title">Canada FSW 67-Point Calculator</h3>
              <ChevronRight size={20} className="form-card-chevron" aria-hidden="true" />
            </div>

            <p className="form-card-body">
              Calculate your eligibility for the Canadian Federal Skilled Worker Program.
            </p>

            {fswRow?.total_points > 0 && <ScoreBadge points={fswRow.total_points} />}
          </Card>

          <Card as={Link} to="/forms/canada-crs" interactive className="form-card">
            <div className="form-card-head">
              <span className="icon-tile" style={{ backgroundColor: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}>
                <Calculator size={20} aria-hidden="true" />
              </span>
              <h3 className="form-card-title">Canada CRS Tool</h3>
              <ChevronRight size={20} className="form-card-chevron" aria-hidden="true" />
            </div>

            <p className="form-card-body">
              Calculate your Express Entry Comprehensive Ranking System (CRS) score.
            </p>

            {crsRow?.total_points > 0 && <ScoreBadge points={crsRow.total_points} />}
          </Card>
        </div>
      )}
    </>
  );
}
