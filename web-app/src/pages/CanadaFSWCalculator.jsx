import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useProfile } from '../lib/ProfileContext';
import { Calculator } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import ScoreDisplay from '../components/ScoreDisplay';
import { SkeletonPage } from '../components/ui/Skeleton';

export default function CanadaFSWCalculator({ session }) {
  const { fswRow, loading, error, refetch } = useProfile();
  if (loading) return <SkeletonPage lines={3} label="Loading the calculator" />;
  if (error) return <button className="btn-secondary" onClick={() => refetch()}>Retry loading your profile</button>;
  return <FswEstimate key={session?.user.id ?? 'guest'} session={session} fswRow={fswRow} refetch={refetch} />;
}

function FswEstimate({ session, fswRow, refetch }) {
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  // Form State
  const [experience, setExperience] = useState(fswRow?.experience_points ?? null);
  const [age, setAge] = useState(fswRow?.age_points ?? null);
  const [education, setEducation] = useState(fswRow?.education_points ?? null);
  
  const [reading, setReading] = useState(fswRow?.language_reading_points ?? null);
  const [writing, setWriting] = useState(fswRow?.language_writing_points ?? null);
  const [listening, setListening] = useState(fswRow?.language_listening_points ?? null);
  const [speaking, setSpeaking] = useState(fswRow?.language_speaking_points ?? null);
  
  const [arrangedEmp, setArrangedEmp] = useState(fswRow?.arranged_employment_points ?? null);
  
  const [adaptSpouseLang, setAdaptSpouseLang] = useState((fswRow?.adaptability_spouse_lang ?? 0) > 0);
  const [adaptPastStudy, setAdaptPastStudy] = useState((fswRow?.adaptability_past_study ?? 0) > 0);
  const [adaptSpouseStudy, setAdaptSpouseStudy] = useState((fswRow?.adaptability_spouse_study ?? 0) > 0);
  const [adaptPastWork, setAdaptPastWork] = useState((fswRow?.adaptability_past_work ?? 0) > 0);
  const [adaptSpouseWork, setAdaptSpouseWork] = useState((fswRow?.adaptability_spouse_work ?? 0) > 0);
  const [adaptArrangedEmp, setAdaptArrangedEmp] = useState((fswRow?.adaptability_arranged_emp ?? 0) > 0);
  const [adaptRelative, setAdaptRelative] = useState((fswRow?.adaptability_relative ?? 0) > 0);

  // Derive points during render
  let adaptTotal = 0;
  if (adaptSpouseLang) adaptTotal += 5;
  if (adaptPastStudy) adaptTotal += 5;
  if (adaptSpouseStudy) adaptTotal += 5;
  if (adaptPastWork) adaptTotal += 10;
  if (adaptSpouseWork) adaptTotal += 5;
  if (adaptArrangedEmp) adaptTotal += 5;
  if (adaptRelative) adaptTotal += 5;
  
  const finalAdapt = Math.min(10, adaptTotal);

  const rows = [
    { label: 'Experience', points: experience }, { label: 'Age', points: age },
    { label: 'Education', points: education }, { label: 'Reading', points: reading },
    { label: 'Writing', points: writing }, { label: 'Listening', points: listening },
    { label: 'Speaking', points: speaking }, { label: 'Arranged employment', points: arrangedEmp },
    { label: 'Adaptability', points: finalAdapt },
  ];
  const totalPoints = rows.reduce((total, row) => total + (row.points ?? 0), 0);
  const isEligible = totalPoints >= 67;
  const missing = rows.filter(row => row.points == null).map(row => row.label);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!session?.user?.id || missing.length) return;
    setSaving(true);
    setMessage('');

    const payload = {
      user_id: session.user.id,
      experience_points: experience,
      age_points: age,
      education_points: education,
      language_reading_points: reading,
      language_writing_points: writing,
      language_listening_points: listening,
      language_speaking_points: speaking,
      arranged_employment_points: arrangedEmp,
      adaptability_spouse_lang: adaptSpouseLang ? 5 : 0,
      adaptability_past_study: adaptPastStudy ? 5 : 0,
      adaptability_spouse_study: adaptSpouseStudy ? 5 : 0,
      adaptability_past_work: adaptPastWork ? 10 : 0,
      adaptability_spouse_work: adaptSpouseWork ? 5 : 0,
      adaptability_arranged_emp: adaptArrangedEmp ? 5 : 0,
      adaptability_relative: adaptRelative ? 5 : 0,
      total_points: totalPoints,
      is_eligible: isEligible,
      updated_at: new Date().toISOString()
    };

    try {
      const { error } = await supabase.from('point_fsw67').upsert({
        ...payload,
        id: fswRow?.id ?? session.user.id,
      });
      if (error) throw error;
      setMessage('Estimate saved to your profile.');
      refetch();
    } catch (error) {
      console.error('Error saving FSW points:', error);
      setMessage('Could not save. Your answers are here. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Canada Federal Skilled Worker points" icon={Calculator} backTo="/forms" backLabel="All calculators"
        description="Estimate your selection points using your first official language. Check the program’s minimum requirements and any second-language points with IRCC." />
      <div className="estimate-layout">
        <ScoreDisplay country="Canada" title="FSW selection points" score={totalPoints} unit="/ 100" rows={rows} missing={missing}
          started={missing.length < rows.length - 1 || finalAdapt > 0}
          prompt="Choose your work experience to start." threshold={67}
          guidance="Check official FSW requirements"
          source="https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/who-can-apply/federal-skilled-workers.html" />
        <div className="estimate-fields">
          <form onSubmit={handleSave} onChange={() => setMessage('')} className="fsw-form">
            {/* Experience Section */}
            <div className="form-group fsw-section">
              <label htmlFor="fsw-experience">Experience</label>
              <select className="input" id="fsw-experience" value={experience ?? ''} onChange={(e) => setExperience(Number(e.target.value))}>
                    <option value="" disabled>Select an answer</option>
                <option value="0">Less than 1 year (0 pts)</option>
                <option value="9">1 year (9 pts)</option>
                <option value="11">2-3 years (11 pts)</option>
                <option value="13">4-5 years (13 pts)</option>
                <option value="15">6 or more years (15 pts)</option>
              </select>
            </div>

            {/* Age Section */}
            <div className="form-group fsw-section">
              <label htmlFor="fsw-age">Age</label>
              <select className="input" id="fsw-age" value={age ?? ''} onChange={(e) => setAge(Number(e.target.value))}>
                    <option value="" disabled>Select an answer</option>
                <option value="0">Under 18 or 47 and older (0 pts)</option>
                <option value="12">18-35 (12 pts)</option>
                <option value="11">36 (11 pts)</option>
                <option value="10">37 (10 pts)</option>
                <option value="9">38 (9 pts)</option>
                <option value="8">39 (8 pts)</option>
                <option value="7">40 (7 pts)</option>
                <option value="6">41 (6 pts)</option>
                <option value="5">42 (5 pts)</option>
                <option value="4">43 (4 pts)</option>
                <option value="3">44 (3 pts)</option>
                <option value="2">45 (2 pts)</option>
                <option value="1">46 (1 pts)</option>
              </select>
            </div>

            {/* Education Section */}
            <div className="form-group fsw-section">
              <label htmlFor="fsw-education">Education</label>
              <select className="input" id="fsw-education" value={education ?? ''} onChange={(e) => setEducation(Number(e.target.value))}>
                    <option value="" disabled>Select an answer</option>
                <option value="0">None of the listed qualifications (0 pts)</option>
                <option value="25">University degree at Doctoral (PhD) level (25 pts)</option>
                <option value="23">Master’s level or qualifying professional degree (23 pts)</option>
                <option value="22">Two or more Canadian post-secondary degrees/diplomas (22 pts)</option>
                <option value="21">Bachelor's degree (3 or more years) (21 pts)</option>
                <option value="19">Canadian post-secondary degree/diploma for 2-year program (19 pts)</option>
                <option value="15">Canadian post-secondary degree/diploma for 1-year program (15 pts)</option>
                <option value="5">Canadian high school diploma (5 pts)</option>
              </select>
            </div>

            {/* Language Section */}
            <div className="form-group fsw-section">
              <h3 style={{ color: 'var(--color-primary)', marginBottom: '1rem' }}>First Official Language (IELTS)</h3>
              <div className="language-fields">
                <div>
                  <label htmlFor="fsw-reading">Reading</label>
                  <select className="input" id="fsw-reading" value={reading ?? ''} onChange={(e) => setReading(Number(e.target.value))}>
                    <option value="" disabled>Select an answer</option>
                    <option value="0">Less than 6.0 (0 pts)</option>
                    <option value="4">6.0 - 6.5 (4 pts)</option>
                    <option value="5">7.0 - 7.5 (5 pts)</option>
                    <option value="6">8.0 - 9.0 (6 pts)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="fsw-writing">Writing</label>
                  <select className="input" id="fsw-writing" value={writing ?? ''} onChange={(e) => setWriting(Number(e.target.value))}>
                    <option value="" disabled>Select an answer</option>
                    <option value="0">Less than 6.5 (0 pts)</option>
                    <option value="4">6.5 (4 pts)</option>
                    <option value="5">7.0 (5 pts)</option>
                    <option value="6">7.5 - 9.0 (6 pts)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="fsw-listening">Listening</label>
                  <select className="input" id="fsw-listening" value={listening ?? ''} onChange={(e) => setListening(Number(e.target.value))}>
                    <option value="" disabled>Select an answer</option>
                    <option value="0">Less than 7.5 (0 pts)</option>
                    <option value="4">7.5 (4 pts)</option>
                    <option value="5">8.0 (5 pts)</option>
                    <option value="6">8.5 - 9.0 (6 pts)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="fsw-speaking">Speaking</label>
                  <select className="input" id="fsw-speaking" value={speaking ?? ''} onChange={(e) => setSpeaking(Number(e.target.value))}>
                    <option value="" disabled>Select an answer</option>
                    <option value="0">Less than 6.5 (0 pts)</option>
                    <option value="4">6.5 (4 pts)</option>
                    <option value="5">7.0 (5 pts)</option>
                    <option value="6">7.5 - 9.0 (6 pts)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Arranged Employment */}
            <div className="form-group fsw-section">
              <h3 style={{ color: 'var(--color-primary)', marginBottom: '1rem' }}>Arranged Employment in Canada</h3>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="radio" name="arranged_emp" checked={arrangedEmp === 10} onChange={() => setArrangedEmp(10)} />
                  Yes (10 pts)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="radio" name="arranged_emp" checked={arrangedEmp === 0} onChange={() => setArrangedEmp(0)} />
                  No (0 pts)
                </label>
              </div>
            </div>

            {/* Adaptability */}
            <div className="form-group mb-4 pb-4">
              <h3 style={{ color: 'var(--color-primary)', marginBottom: '1rem' }}>Adaptability (Max 10 Points)</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', fontSize: '0.95rem' }}>
                  <input type="checkbox" checked={adaptSpouseLang} onChange={(e) => setAdaptSpouseLang(e.target.checked)} style={{ marginTop: '0.25rem' }} />
                  Your spouse or common-law partner has a language level in English/French at CLB 4 level or higher. (5 pts)
                </label>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', fontSize: '0.95rem' }}>
                  <input type="checkbox" checked={adaptPastStudy} onChange={(e) => setAdaptPastStudy(e.target.checked)} style={{ marginTop: '0.25rem' }} />
                  You completed at least 2 academic years of full-time study at a secondary or post-secondary school in Canada. (5 pts)
                </label>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', fontSize: '0.95rem' }}>
                  <input type="checkbox" checked={adaptSpouseStudy} onChange={(e) => setAdaptSpouseStudy(e.target.checked)} style={{ marginTop: '0.25rem' }} />
                  Your spouse/partner completed at least 2 academic years of full-time study in Canada. (5 pts)
                </label>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', fontSize: '0.95rem' }}>
                  <input type="checkbox" checked={adaptPastWork} onChange={(e) => setAdaptPastWork(e.target.checked)} style={{ marginTop: '0.25rem' }} />
                  You did at least 1 year of full-time work in Canada (Skill Type 0, A, or B). (10 pts)
                </label>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', fontSize: '0.95rem' }}>
                  <input type="checkbox" checked={adaptSpouseWork} onChange={(e) => setAdaptSpouseWork(e.target.checked)} style={{ marginTop: '0.25rem' }} />
                  Your spouse/partner did at least 1 year of full-time work in Canada on a valid work permit. (5 pts)
                </label>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', fontSize: '0.95rem' }}>
                  <input type="checkbox" checked={adaptArrangedEmp} onChange={(e) => setAdaptArrangedEmp(e.target.checked)} style={{ marginTop: '0.25rem' }} />
                  You have Arranged employment in Canada. (5 pts)
                </label>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', fontSize: '0.95rem' }}>
                  <input type="checkbox" checked={adaptRelative} onChange={(e) => setAdaptRelative(e.target.checked)} style={{ marginTop: '0.25rem' }} />
                  You, or your spouse, have a relative who is living in Canada, 18+ and a Canadian citizen/PR. (5 pts)
                </label>
              </div>
            </div>

            {session && (
              <div className="estimate-save">
                <button type="submit" className="btn-primary" disabled={saving || missing.length > 0}>
                  {saving ? 'Saving…' : 'Save to profile'}
                </button>
                <p role="status">{message || (missing.length ? 'Answer the remaining questions to save.' : '')}</p>
              </div>
            )}
          </form>
          <a className="estimate-jump" href="#estimate">Review your estimate</a>
        </div>
      </div>
    </>
  );
}
