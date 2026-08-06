import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Wrench } from 'lucide-react';
import { useProfile } from '../lib/ProfileContext';
import FormCard from '../components/FormCard';
import ToolCard from '../components/ToolCard';
import { SkeletonPage } from '../components/ui/Skeleton';

export default function Discover({ session }) {
  const { totalPoints, loading } = useProfile();

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
