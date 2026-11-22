import React, { useState, useCallback } from 'react';
import PointsForm from '../components/PointsForm';
import ScoreDisplay from '../components/ScoreDisplay';
import { supabase } from '../lib/supabase';
import { useProfile } from '../lib/ProfileContext';
import { Calculator as CalculatorIcon } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { SkeletonPage } from '../components/ui/Skeleton';
import {
  AGE_BANDS,
  ENGLISH_BANDS,
  EDUCATION_BANDS,
  PARTNER_SKILLS_BANDS,
  formFromProfileRow,
  pointsBreakdown,
  ELIGIBILITY_THRESHOLD,
  pointsForBandId,
  totalPointsFromForm,
} from '../lib/points';

export default function Calculator({ session }) {
  const { profileRow, basicRow, loading, error, refetch } = useProfile();
  if (loading) return <SkeletonPage lines={3} label="Loading the calculator" />;
  if (error) return <button className="btn-secondary" onClick={() => refetch()}>Retry loading your profile</button>;
  return <AustralianEstimate key={session?.user.id ?? 'guest'} session={session} profileRow={profileRow} basicRow={basicRow} refetch={refetch} />;
}

const coreFields = {
  ageBand: 'Age',
  englishBand: 'English',
  overseasExpYears: 'Overseas employment',
  ausExpYears: 'Australian employment',
  educationBand: 'Education',
  partnerSkillsBand: 'Partner skills',
};

function AustralianEstimate({ session, profileRow, basicRow, refetch }) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState(() => {
    const form = formFromProfileRow(profileRow, basicRow);
    if (profileRow?.english == null) form.englishBand = '';
    if (profileRow?.overseasExp == null) form.overseasExpYears = null;
    if (profileRow?.ausExp == null) form.ausExpYears = null;
    if (profileRow?.education == null) form.educationBand = '';
    if (profileRow?.partnerSkills == null) form.partnerSkillsBand = '';
    return form;
  });
  const missing = Object.entries(coreFields)
    .filter(([key]) => formData[key] == null || formData[key] === '' || formData[key] === 'unset')
    .map(([, label]) => label);
  const rows = pointsBreakdown(formData).map(row => {
    const unknown = missing.includes(row.label) || (row.label === 'Work experience'
      && formData.overseasExpYears == null && formData.ausExpYears == null);
    return { ...row, points: unknown ? null : row.points };
  });
  const totalPoints = totalPointsFromForm(formData);

  const handleChange = useCallback((name, value) => {
    setMessage('');
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSave = async () => {
    if (!session?.user?.id || missing.length) return;
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
      refetch();
    } catch (error) {
      console.error('Error saving profile:', error);
      setMessage('Could not save. Your answers are here. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Australian skilled migration points" icon={CalculatorIcon} backTo="/discover"
        backLabel="Discover pathways" description="Estimate your base points before nomination or sponsorship." />
      <div className="estimate-layout">
        <ScoreDisplay country="Australia" title="Australian base points" score={totalPoints} unit="points" rows={rows} missing={missing}
          started={missing.length < Object.keys(coreFields).length || totalPoints > 0}
          prompt="Choose your age group to start." threshold={ELIGIBILITY_THRESHOLD}
          guidance="Home Affairs points table" source="https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-independent-189/points-table" />
        <div className="estimate-fields">
          <PointsForm formData={formData} onChange={handleChange} />
          {session && (
            <div className="estimate-save">
              <button onClick={handleSave} className="btn-primary" disabled={saving || missing.length > 0}>
                {saving ? 'Saving…' : 'Save to profile'}
              </button>
              <p role="status">{message || (missing.length ? 'Answer the remaining questions to save.' : '')}</p>
            </div>
          )}
          <a className="estimate-jump" href="#estimate">Review your estimate</a>
        </div>
      </div>
    </>
  );
}
