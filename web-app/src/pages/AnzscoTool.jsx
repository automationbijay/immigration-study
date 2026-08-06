import React from 'react';
import OccupationSearch from '../components/OccupationSearch';
import { Briefcase } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';

export default function AnzscoTool() {
  return (
    <>
      <PageHeader 
        title="ANZSCO Code Finder" 
        backTo="/discover" 
      />
      <div className="section">
        <div className="panel" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <span className="icon-badge" style={{ backgroundColor: 'var(--primary-subtle)', color: 'var(--primary)' }}>
              <Briefcase size={24} aria-hidden="true" />
            </span>
            <h2 className="section-title" style={{ margin: 0 }}>What is ANZSCO?</h2>
          </div>
          <p className="text-muted" style={{ lineHeight: '1.6' }}>
            The Australian and New Zealand Standard Classification of Occupations (ANZSCO) is a system that collects, publishes, and analyzes occupation statistics across Australia and New Zealand.
          </p>
          <p className="text-muted" style={{ lineHeight: '1.6', marginTop: '1rem' }}>
            For Australian visa applications, your nominated occupation must be on the relevant skilled occupation list and have a corresponding ANZSCO code. Finding your correct ANZSCO code is a critical first step in determining your eligibility for skilled migration.
          </p>
        </div>

        <OccupationSearch label="Search for your ANZSCO Code" />
      </div>
    </>
  );
}
