import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useProfile } from '../lib/ProfileContext';
import { FileText, Save, Calculator } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import FloatingScoreCard from '../components/FloatingScoreCard';

export default function CanadaFSWCalculator({ session }) {
  const { profile, refetch } = useProfile();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [experience, setExperience] = useState(0);
  const [age, setAge] = useState(0);
  const [education, setEducation] = useState(0);
  
  const [reading, setReading] = useState(0);
  const [writing, setWriting] = useState(0);
  const [listening, setListening] = useState(0);
  const [speaking, setSpeaking] = useState(0);
  
  const [arrangedEmp, setArrangedEmp] = useState(0);
  
  const [adaptSpouseLang, setAdaptSpouseLang] = useState(false);
  const [adaptPastStudy, setAdaptPastStudy] = useState(false);
  const [adaptSpouseStudy, setAdaptSpouseStudy] = useState(false);
  const [adaptPastWork, setAdaptPastWork] = useState(false);
  const [adaptSpouseWork, setAdaptSpouseWork] = useState(false);
  const [adaptArrangedEmp, setAdaptArrangedEmp] = useState(false);
  const [adaptRelative, setAdaptRelative] = useState(false);

  const [totalPoints, setTotalPoints] = useState(0);
  const [isEligible, setIsEligible] = useState(false);

  useEffect(() => {
    // Calculate total points whenever a dependency changes
    const langTotal = reading + writing + listening + speaking;
    
    let adaptTotal = 0;
    if (adaptSpouseLang) adaptTotal += 5;
    if (adaptPastStudy) adaptTotal += 5;
    if (adaptSpouseStudy) adaptTotal += 5;
    if (adaptPastWork) adaptTotal += 10;
    if (adaptSpouseWork) adaptTotal += 5;
    if (adaptArrangedEmp) adaptTotal += 5;
    if (adaptRelative) adaptTotal += 5;
    
    // Adaptability is capped at 10 points
    const finalAdapt = Math.min(10, adaptTotal);

    const calculatedTotal = experience + age + education + langTotal + arrangedEmp + finalAdapt;
    setTotalPoints(calculatedTotal);
    setIsEligible(calculatedTotal >= 67);
  }, [experience, age, education, reading, writing, listening, speaking, arrangedEmp, adaptSpouseLang, adaptPastStudy, adaptSpouseStudy, adaptPastWork, adaptSpouseWork, adaptArrangedEmp, adaptRelative]);

  useEffect(() => {
    // Load existing data if any
    const loadData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('point_fsw67')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (data) {
        setExperience(data.experience_points || 0);
        setAge(data.age_points || 0);
        setEducation(data.education_points || 0);
        setReading(data.language_reading_points || 0);
        setWriting(data.language_writing_points || 0);
        setListening(data.language_listening_points || 0);
        setSpeaking(data.language_speaking_points || 0);
        setArrangedEmp(data.arranged_employment_points || 0);
        setAdaptSpouseLang(data.adaptability_spouse_lang > 0);
        setAdaptPastStudy(data.adaptability_past_study > 0);
        setAdaptSpouseStudy(data.adaptability_spouse_study > 0);
        setAdaptPastWork(data.adaptability_past_work > 0);
        setAdaptSpouseWork(data.adaptability_spouse_work > 0);
        setAdaptArrangedEmp(data.adaptability_arranged_emp > 0);
        setAdaptRelative(data.adaptability_relative > 0);
      }
      setLoading(false);
    };

    if (session?.user?.id) {
      loadData();
    }
  }, [session]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

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
      // Check if exists
      const { data: existing } = await supabase
        .from('point_fsw67')
        .select('id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (existing) {
        await supabase.from('point_fsw67').update(payload).eq('id', existing.id);
      } else {
        await supabase.from('point_fsw67').insert([payload]);
      }
      
      if (refetch) refetch();
      alert('Your points have been saved successfully!');
    } catch (error) {
      console.error('Error saving FSW points:', error);
      alert('Error saving data.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Loading your data...</div>;
  }

  return (
    <>
      <PageHeader title="Canada FSW 67 Calculator" icon={Calculator} backTo="/forms" backLabel="Back to Forms" />
      
      <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '100px' }}>
        <p className="subtitle" style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2rem' }}>
          Calculate your eligibility for the Federal Skilled Worker Program
        </p>

        <form onSubmit={handleSave} className="card p-4">
          {/* Experience Section */}
          <div className="form-group mb-4 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ color: 'var(--color-primary)', marginBottom: '1rem' }}>Experience</h3>
            <select className="input" value={experience} onChange={(e) => setExperience(Number(e.target.value))}>
              <option value="0">Select Experience (0 pts)</option>
              <option value="9">1 year (9 pts)</option>
              <option value="11">2-3 years (11 pts)</option>
              <option value="13">4-5 years (13 pts)</option>
              <option value="15">6 or more years (15 pts)</option>
            </select>
          </div>

          {/* Age Section */}
          <div className="form-group mb-4 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ color: 'var(--color-primary)', marginBottom: '1rem' }}>Age</h3>
            <select className="input" value={age} onChange={(e) => setAge(Number(e.target.value))}>
              <option value="0">Select Age (0 pts)</option>
              <option value="0">Under 18 (0 pts)</option>
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
              <option value="0">47 and Older (0 pts)</option>
            </select>
          </div>

          {/* Education Section */}
          <div className="form-group mb-4 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ color: 'var(--color-primary)', marginBottom: '1rem' }}>Education</h3>
            <select className="input" value={education} onChange={(e) => setEducation(Number(e.target.value))}>
              <option value="0">Select Education (0 pts)</option>
              <option value="25">University degree at Doctoral (PhD) level (25 pts)</option>
              <option value="23">University degree at Master's level (23 pts)</option>
              <option value="23">Professional degree needed to practice licensed profession (23 pts)</option>
              <option value="22">Two or more Canadian post-secondary degrees/diplomas (22 pts)</option>
              <option value="21">Bachelor's degree (3 or more years) (21 pts)</option>
              <option value="19">Canadian post-secondary degree/diploma for 2-year program (19 pts)</option>
              <option value="15">Canadian post-secondary degree/diploma for 1-year program (15 pts)</option>
              <option value="5">Canadian high school diploma (5 pts)</option>
            </select>
          </div>

          {/* Language Section */}
          <div className="form-group mb-4 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ color: 'var(--color-primary)', marginBottom: '1rem' }}>First Official Language (IELTS)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Reading</label>
                <select className="input" value={reading} onChange={(e) => setReading(Number(e.target.value))}>
                  <option value="0">Less than 6.0 (0 pts)</option>
                  <option value="4">6.0 - 6.5 (4 pts)</option>
                  <option value="5">7.0 - 7.5 (5 pts)</option>
                  <option value="6">8.0 - 9.0 (6 pts)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Writing</label>
                <select className="input" value={writing} onChange={(e) => setWriting(Number(e.target.value))}>
                  <option value="0">Less than 6.5 (0 pts)</option>
                  <option value="4">6.5 (4 pts)</option>
                  <option value="5">7.0 (5 pts)</option>
                  <option value="6">7.5 - 9.0 (6 pts)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Listening</label>
                <select className="input" value={listening} onChange={(e) => setListening(Number(e.target.value))}>
                  <option value="0">Less than 7.5 (0 pts)</option>
                  <option value="4">7.5 (4 pts)</option>
                  <option value="5">8.0 (5 pts)</option>
                  <option value="6">8.5 - 9.0 (6 pts)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Speaking</label>
                <select className="input" value={speaking} onChange={(e) => setSpeaking(Number(e.target.value))}>
                  <option value="0">Less than 6.5 (0 pts)</option>
                  <option value="4">6.5 (4 pts)</option>
                  <option value="5">7.0 (5 pts)</option>
                  <option value="6">7.5 - 9.0 (6 pts)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Arranged Employment */}
          <div className="form-group mb-4 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save FSW Details'}
            </button>
          </div>
        </form>

        <FloatingScoreCard
            title="Total Points"
            subtitle={isEligible ? "Eligible (67 or higher)" : "Not Eligible (Below 67)"}
            subtitleColor={isEligible ? '#4ade80' : '#fde047'}
            score={`${totalPoints} / 100`}
            maxWidth="800px"
        />
      </div>
    </>
  );
}
