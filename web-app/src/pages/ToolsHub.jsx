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
    </>
  );
}
