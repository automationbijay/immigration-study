import React from 'react';
import UniversitySearch from '../components/UniversitySearch';
import { GraduationCap } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';

export default function UniversityTool() {
  return (
    <>
      <PageHeader 
        title="University Finder" 
        backTo="/discover" 
      />
      <div className="section">
        <div className="panel" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <span className="icon-badge" style={{ backgroundColor: 'var(--primary-subtle)', color: 'var(--primary)' }}>
              <GraduationCap size={24} aria-hidden="true" />
            </span>
            <h2 className="section-title" style={{ margin: 0 }}>Find Your University</h2>
          </div>
          <p className="text-muted" style={{ lineHeight: '1.6' }}>
            Finding a recognized university can be important for assessing your eligibility for certain visas or claiming points (e.g., Australian Study Requirement or Specialist Educational Qualifications).
          </p>
          <p className="text-muted" style={{ lineHeight: '1.6', marginTop: '1rem' }}>
            Use the search tool below to find your university in our database.
          </p>
        </div>

        <UniversitySearch label="Search for your University" />
      </div>
    </>
  );
}
