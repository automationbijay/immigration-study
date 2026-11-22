import PageLink from '../components/ui/PageLink';
import React, { useState } from 'react';
import UniversitySearch from '../components/UniversitySearch';
import { GraduationCap } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';

export default function UniversityTool() {
  const [selectedUniversity, setSelectedUniversity] = useState(null);

  return (
    <>
      <PageHeader
        title="University directory"
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
            Search the Hipolabs university directory by institution name. For migration requirements, check your visa and the relevant assessing authority.
          </p>
          <p className="text-muted" style={{ lineHeight: '1.6', marginTop: '1rem' }}>
            <PageLink href="https://immi.homeaffairs.gov.au/visas/working-in-australia/skills-assessment">Read the Home Affairs guidance on skills assessments</PageLink>.
          </p>
        </div>

        <UniversitySearch
          label="Search for your University"
          value={selectedUniversity}
          onChange={setSelectedUniversity}
        />
      </div>
    </>
  );
}
