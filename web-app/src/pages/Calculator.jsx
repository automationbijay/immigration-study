import React, { useState, useEffect } from 'react';
import PointsForm from '../components/PointsForm';
import ScoreDisplay from '../components/ScoreDisplay';
import { supabase } from '../lib/supabase';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  AGE_BANDS,
  ENGLISH_BANDS,
  EDUCATION_BANDS,
  PARTNER_SKILLS_BANDS,
  STATE_NOMINATION_POINTS,
  ageBandIdFromProfile,
  bandIdForPoints,
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
          setFormData(prev => ({
            ...prev,
            ageBand: ageBandIdFromProfile(basicData?.dob, profileData.age),
            englishBand: bandIdForPoints(ENGLISH_BANDS, profileData.english),
            overseasExpYears: Number(profileData.overseasExp) || 0,
            ausExpYears: Number(profileData.ausExp) || 0,
            educationBand: bandIdForPoints(EDUCATION_BANDS, profileData.education),
            specialistEdu: profileData.specialistEdu || false,
            ausStudy: profileData.ausStudy || false,
            professionalYear: profileData.professionalYear || false,
            ccl: profileData.ccl || false,
            regionalStudy: profileData.regionalStudy || false,
            partnerSkillsBand: bandIdForPoints(PARTNER_SKILLS_BANDS, profileData.partnerSkills),
          }));
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

  if (loading) {
    return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', color: 'var(--color-primary)'}}>Loading...</div>;
  }

  return (
    <div className="discover-container" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '100px' }}>
      <Link to="/discover" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)', textDecoration: 'none', marginBottom: '1.5rem' }}>
        <ArrowLeft size={20} /> Back to Discover
      </Link>

      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: 'var(--color-text)' }}>Eligibility Calculator</h2>
      <p style={{ color: 'var(--color-secondary)', marginBottom: '2rem' }}>
        This form is pre-populated with data from your profile. You can tweak the values here to see how it affects your total points.
      </p>

      <ScoreDisplay targetScore={totalPoints} />

      <div style={{
        marginTop: '1.5rem',
        padding: '1rem 1.5rem',
        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.1))',
        border: '1px solid rgba(34, 197, 94, 0.2)',
        borderRadius: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        color: 'var(--color-primary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: 'rgba(34, 197, 94, 0.2)', padding: '0.5rem', borderRadius: '50%' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          </div>
          <div>
            <h4 style={{ margin: 0, fontWeight: 'bold', fontSize: '1rem' }}>State Nomination (190)</h4>
            <p style={{ margin: 0, fontSize: '0.875rem', opacity: 0.8 }}>Automatically included in your total score</p>
          </div>
        </div>
        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
          +{STATE_NOMINATION_POINTS} Points
        </div>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <PointsForm formData={formData} onChange={handleChange} />
      </div>

      <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
        {message && (
          <div className={message.includes('success') ? 'success-message' : 'error-message'} style={{ width: '100%' }}>
            {message}
          </div>
        )}
        <button
          onClick={handleSave}
          className="btn-primary"
          disabled={saving}
          style={{ width: '100%', maxWidth: '300px' }}
        >
          {saving ? 'Saving...' : 'Save to Profile'}
        </button>
      </div>
    </div>
  );
}
