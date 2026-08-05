import React, { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { totalPointsFromProfileRow } from '../lib/points';
import PageHeader from '../components/ui/PageHeader';
import FormCard from '../components/FormCard';
import { SkeletonPage } from '../components/ui/Skeleton';

export default function FormsHub({ session }) {
  const [loading, setLoading] = useState(true);
  const [totalPoints, setTotalPoints] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function getProfile() {
      if (!session?.user?.id) return;
      try {
        const { data: profileData, error } = await supabase
          .from('point_australia')
          .select('*')
          .eq('id', session.user.id)
          .single();

        const { data: basicData } = await supabase
          .from('profile_basic')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching profile:', error);
        }

        if (!ignore && profileData) {
          setTotalPoints(totalPointsFromProfileRow(profileData, basicData));
        }
      } catch (error) {
        console.error('Error in fetching profile:', error);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    getProfile();
    return () => { ignore = true; };
  }, [session]);

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
