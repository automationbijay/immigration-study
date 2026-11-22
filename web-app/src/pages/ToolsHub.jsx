import React from 'react';
import { Wrench } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import ToolCard from '../components/ToolCard';

export default function ToolsHub() {
  return (
    <>
      <PageHeader title="All Tools" icon={Wrench} backTo="/discover" backLabel="Back to Discover" />

      <div className="card-grid">
        <ToolCard
          title="ANZSCO occupation finder"
          description="Search ANZSCO job titles and codes, then review the relevant occupation lists."
          to="/tools/anzsco"
        />
        <ToolCard
          title="University directory"
          description="Look up an institution by name or country."
          to="/tools/university"
        />
      </div>
    </>
  );
}
