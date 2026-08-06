import React from 'react';
import { FileText } from 'lucide-react';
import { useProfile } from '../lib/ProfileContext';
import PageHeader from '../components/ui/PageHeader';
import VisaFormCard from '../components/VisaFormCard';
import { SkeletonPage } from '../components/ui/Skeleton';

export default function FormsHub({ session }) {
  const { totalPoints, fswRow, crsRow, loading } = useProfile();

  return (
    <>
      <PageHeader title="All Forms" icon={FileText} backTo="/discover" backLabel="Back to Discover" />

      {loading ? (
        <SkeletonPage lines={1} label="Loading forms" />
      ) : (
        <div className="card-grid">
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
            title="Canada FSW 67-Point Calculator"
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
      )}
    </>
  );
}
