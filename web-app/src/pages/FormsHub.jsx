import React from 'react';
import { FileText } from 'lucide-react';
import { useProfile } from '../lib/ProfileContext';
import PageHeader from '../components/ui/PageHeader';
import FormCard from '../components/FormCard';
import { SkeletonPage } from '../components/ui/Skeleton';

export default function FormsHub({ session }) {
  const { totalPoints, loading } = useProfile();

  return (
    <>
      <PageHeader title="All Forms" icon={FileText} backTo="/discover" backLabel="Back to Discover" />

      {loading ? (
        <SkeletonPage lines={1} label="Loading forms" />
      ) : (
        <div className="card-grid">
          <FormCard totalPoints={totalPoints} />
        </div>
      )}
    </>
  );
}
