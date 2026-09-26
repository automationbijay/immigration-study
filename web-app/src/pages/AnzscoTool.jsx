import React, { useState, useEffect } from 'react';
import OccupationSearch from '../components/OccupationSearch';
import ProfessionDetails from '../components/ProfessionDetails';
import { Briefcase, CheckCircle2, Save } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal';
import { supabase } from '../lib/supabase';
import Toast from '../components/ui/Toast';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../lib/ProfileContext';

export default function AnzscoTool() {
  const [selectedOccupation, setSelectedOccupation] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const navigate = useNavigate();
  const { refetch } = useProfile();

  useEffect(() => {
    async function loadSaved() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data } = await supabase
        .from('profile_job_classification')
        .select('anzsco_code, anzsco_title')
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (data) {
        setSelectedOccupation({
          occupation_code: data.anzsco_code,
          job_name: data.anzsco_title
        });
      }
    }
    loadSaved();
  }, []);

  const handleSave = async () => {
    if (!selectedOccupation) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      // Update the unified point_australia table since experienceAnzsco lives there in this app
      // profile_job_classification is available as an audit log or separate table if you prefer,
      // but let's update point_australia to keep the profile context intact.
      const { error: paError } = await supabase.from('point_australia').upsert({
        id: user.id,
        experienceAnzsco: selectedOccupation.occupation_code
      });
      
      // Also save to the new table
      await supabase.from('profile_job_classification').delete().eq('user_id', user.id);
      const { error: insertError } = await supabase.from('profile_job_classification').insert({
        user_id: user.id,
        anzsco_code: selectedOccupation.occupation_code,
        anzsco_title: selectedOccupation.job_name
      });

      if (paError || insertError) throw (insertError || paError);
      
      setMessage('Occupation saved successfully!');
      refetch(); // This causes the ProfileContext to reload the profile data globally!
      setTimeout(() => {
        setMessage('');
        navigate('/profile');
      }, 1000);
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
        title="Profession Classification" 
        backTo="/discover" 
      />
      <Toast message={message} />
      <div className="section">
        <OccupationSearch 
          label="Find your Profession Classification" 
          value={selectedOccupation}
          onChange={setSelectedOccupation}
          onHelpClick={() => setIsHelpOpen(true)}
        />
        {selectedOccupation && (
          <ProfessionDetails 
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
