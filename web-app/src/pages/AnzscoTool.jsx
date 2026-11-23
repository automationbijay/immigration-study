import React, { useState } from 'react';
import OccupationSearch from '../components/OccupationSearch';
import ProfessionDetails from '../components/ProfessionDetails';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal';
import { supabase } from '../lib/supabase';
import Toast from '../components/ui/Toast';
import PageLink from '../components/ui/PageLink';
import { useProfile } from '../lib/ProfileContext';
import { useSavedOccupation } from '../lib/profileCompletion';

export default function AnzscoTool({ session }) {
  const [draftOccupation, setDraftOccupation] = useState();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const { profileRow, refetch } = useProfile();
  const saved = useSavedOccupation(session?.user?.id, profileRow);
  const selectedOccupation = draftOccupation === undefined ? saved.occupation : draftOccupation;

  const handleSave = async () => {
    if (!selectedOccupation) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      const { error: pointsError } = await supabase.from('point_australia').upsert({
        id: user.id,
        experienceAnzsco: selectedOccupation.occupation_code,
      });
      if (pointsError) throw pointsError;

      const { error: deleteError } = await supabase.from('profile_job_classification').delete().eq('user_id', user.id);
      let classificationError = deleteError;
      if (!classificationError) {
        const { error } = await supabase.from('profile_job_classification').insert({
          user_id: user.id,
          anzsco_code: selectedOccupation.occupation_code,
          anzsco_title: selectedOccupation.job_name,
        });
        classificationError = error;
      }

      await Promise.all([refetch(), saved.refetch()]);
      setMessage(classificationError
        ? 'Occupation code saved. The profile title could not be updated. Save again to retry.'
        : 'Occupation saved successfully!');

    } catch (err) {
      console.error(err);
      setMessage(err.message || 'Error saving occupation');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Australia Occupation Explorer"
        description="Explore ANZSCO codes, assessing authorities, skilled visa pathways, and past SkillSelect invitation cutoffs."
        backTo="/discover"
      />
      <Toast message={message} />
      {message === 'Occupation saved successfully!' && (
        <PageLink to="/profile" className="anz-saved-link">View saved profile →</PageLink>
      )}
      <div className="section">
        <OccupationSearch
          label="Find your occupation classification"
          value={selectedOccupation}
          onChange={value => { setDraftOccupation(value); setMessage(''); }}
          onHelpClick={() => setIsHelpOpen(true)}
        />
        {selectedOccupation && (
          <ProfessionDetails
            key={selectedOccupation.occupation_code}
            anzscoCode={selectedOccupation.occupation_code}
            jobName={selectedOccupation.job_name}
            onSave={handleSave}
            saving={saving}
          />
        )}
      </div>

      <Modal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} title="What is ANZSCO?">
        <p className="text-muted" style={{ lineHeight: '1.6' }}>
          The Australian and New Zealand Standard Classification of Occupations (ANZSCO) is a system that collects, publishes, and analyzes occupation statistics across Australia and New Zealand.
        </p>
        <p className="text-muted" style={{ lineHeight: '1.6', marginTop: '1rem' }}>
          For Australian visa applications, your nominated occupation must be on the relevant skilled occupation list and have a corresponding ANZSCO code. Finding your correct ANZSCO code is a critical first step in determining your eligibility for skilled migration.
        </p>
      </Modal>
    </>
  );
}
