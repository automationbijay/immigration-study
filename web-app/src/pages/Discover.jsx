import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Wrench, Calculator, ChevronRight } from 'lucide-react';
import { useProfile } from '../lib/ProfileContext';
import FormCard from '../components/FormCard';
import ToolCard from '../components/ToolCard';
import Card from '../components/ui/Card';
import ScoreBadge from '../components/ScoreBadge';
import { SkeletonPage } from '../components/ui/Skeleton';

export default function Discover({ session }) {
  const { totalPoints, fswRow, crsRow, loading } = useProfile();

  if (loading) return <SkeletonPage lines={2} label="Loading your dashboard" />;

  return (
    <>
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">
            <FileText size={20} aria-hidden="true" /> Forms
          </h2>
          <Link to="/forms" className="link-button">View All</Link>
        </div>

        <div className="card-rail">
          <FormCard totalPoints={totalPoints} />
          
          <Card as={Link} to="/forms/canada-fsw" interactive className="form-card">
            <div className="form-card-head">
              <span className="icon-tile" style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                <Calculator size={20} aria-hidden="true" />
              </span>
              <h3 className="form-card-title">Canada FSW 67-Point</h3>
              <ChevronRight size={20} className="form-card-chevron" aria-hidden="true" />
            </div>
            <p className="form-card-body">Calculate eligibility for the Canadian FSW Program.</p>
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
            <p className="form-card-body">Calculate your Express Entry CRS score.</p>
            {crsRow?.total_points > 0 && <ScoreBadge points={crsRow.total_points} />}
          </Card>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">
            <Wrench size={20} aria-hidden="true" /> Tools
          </h2>
          <Link to="/tools" className="link-button">View All</Link>
        </div>

        <div className="card-rail">
          <ToolCard 
            title="ANZSCO Code Finder" 
            description="Search and find the correct ANZSCO code for your occupation to check your visa eligibility."
            to="/tools/anzsco" 
          />
          <ToolCard 
            title="University Finder" 
            description="Search and find recognized universities to check eligibility for visas or claiming points."
            to="/tools/university" 
          />
        </div>
      </section>
    </>
  );
}
