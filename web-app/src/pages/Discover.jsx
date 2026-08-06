import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Wrench } from 'lucide-react';
import { useProfile } from '../lib/ProfileContext';
import VisaFormCard from '../components/VisaFormCard';
import ToolCard from '../components/ToolCard';
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
          <VisaFormCard 
            title="Australia Point Estimation"
            description="Calculate and estimate your points for Australian skilled migration visas (Subclass 189, 190, 491)."
            score={totalPoints}
            to="/australia-point-calculator"
            countryCode="au"
            colorBg="var(--color-surface)"
            colorText="var(--color-primary)"
          />
          
          <VisaFormCard 
            title="Canada FSW 67-Point"
            description="Calculate your eligibility for the Canadian Federal Skilled Worker Program."
            score={fswRow?.total_points}
            to="/forms/canada-fsw"
            countryCode="ca"
            colorBg="var(--color-primary-light)"
            colorText="var(--color-primary)"
          />

          <VisaFormCard 
            title="Canada CRS Tool"
            description="Calculate your Express Entry Comprehensive Ranking System (CRS) score."
            score={crsRow?.total_points}
            to="/forms/canada-crs"
            countryCode="ca"
            colorBg="var(--color-accent-subtle)"
            colorText="var(--color-accent)"
          />
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
