import React, { useState, useEffect } from 'react';
import PointsForm from '../components/PointsForm';
import ScoreDisplay from '../components/ScoreDisplay';
import { supabase } from '../lib/supabase';
import { Calculator as CalculatorIcon, CheckCircle2 } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Toast from '../components/ui/Toast';
import { SkeletonPage } from '../components/ui/Skeleton';
import {
  AGE_BANDS,
  ENGLISH_BANDS,
  EDUCATION_BANDS,
  PARTNER_SKILLS_BANDS,
  STATE_NOMINATION_POINTS,
  formFromProfileRow,
  pointsForBandId,
  totalPointsFromForm,
} from '../lib/points';

export default function Calculator({ session }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Band ids for everything scored from a fixed table; raw years for the two
  // experience fields, because that is the unit `point_australia` stores.
  const [formData, setFormData] = useState({
    ageBand: 'unset',
    englishBand: 'competent',
    overseasExpYears: 0,
    ausExpYears: 0,
    educationBand: 'none',
    specialistEdu: false,
    ausStudy: false,
    professionalYear: false,
    ccl: false,
    regionalStudy: false,
    partnerSkillsBand: 'none',
    stateNomination: true,
  });

  const [totalPoints, setTotalPoints] = useState(0);

  useEffect(() => {
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

        if (profileData) {
          setFormData(formFromProfileRow(profileData, basicData));
        }
      } catch (error) {
        console.error('Error in fetching profile:', error);
      } finally {
        setLoading(false);
      }
    }

    getProfile();
  }, [session]);

  useEffect(() => {
    setTotalPoints(totalPointsFromForm(formData));
  }, [formData]);

  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!session?.user?.id) return;
    setSaving(true);
    setMessage('');
    try {
      const { error } = await supabase
        .from('point_australia')
        .upsert({
          id: session.user.id,
          age: pointsForBandId(AGE_BANDS, formData.ageBand),
          english: pointsForBandId(ENGLISH_BANDS, formData.englishBand),
          // Years, not points — Profile and Discover both read these as years.
          overseasExp: formData.overseasExpYears,
          ausExp: formData.ausExpYears,
          education: pointsForBandId(EDUCATION_BANDS, formData.educationBand),
          specialistEdu: formData.specialistEdu,
          ausStudy: formData.ausStudy,
          professionalYear: formData.professionalYear,
          ccl: formData.ccl,
          regionalStudy: formData.regionalStudy,
          partnerSkills: pointsForBandId(PARTNER_SKILLS_BANDS, formData.partnerSkillsBand),
        });

      if (error) throw error;
      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
      setMessage('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <SkeletonPage lines={3} label="Loading the calculator" />;

  return (
    <>
      <Toast message={message} />

      <PageHeader
        title="Eligibility Calculator"
        icon={CalculatorIcon}
        backTo="/discover"
        backLabel="Back to Discover"
        description="This form is pre-populated with data from your profile. You can tweak the values here to see how it affects your total points."
      />

      <div style={{ paddingBottom: '120px' }}>
        <ScoreDisplay targetScore={totalPoints} />

        <div className="nomination-note">
          <span className="nomination-note-icon">
            <CheckCircle2 size={20} aria-hidden="true" />
          </span>
          <div className="nomination-note-body">
            <h4>State Nomination (190)</h4>
            <p>Automatically included in your total score</p>
          </div>
          <span className="nomination-note-points">+{STATE_NOMINATION_POINTS} Points</span>
        </div>

        <div className="calculator-form">
          <PointsForm formData={formData} onChange={handleChange} />
        </div>

        <button onClick={handleSave} className="btn-primary" disabled={saving}>
          {saving ? 'Saving...' : 'Save to Profile'}
        </button>
      </div>
    </>
  );
}
