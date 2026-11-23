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
          title="Australia Occupation Explorer"
          description="Look up ANZSCO codes, assessing authorities, federal visas, and past invitation cutoffs."
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
