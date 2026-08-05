import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ChevronDown } from 'lucide-react';
import OccupationSearch from '../components/OccupationSearch';

export default function Home({ session }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [occupation, setOccupation] = useState(null);

  useEffect(() => {
    let ignore = false;
    async function getProfile() {
      setLoading(true);
      const { user } = session;

      const { data, error } = await supabase
        .from('point_australia')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!ignore) {
        if (data) setProfile(data);
        setLoading(false);
      }
    }

    getProfile();
    return () => { ignore = true; };
  }, [session]);

  const occupationSection = (
    <OccupationSearch value={occupation} onChange={setOccupation} />
  );

  if (loading) {
    return (
      <div className="calculator-container">
        {occupationSection}
        <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '30vh'}}>Loading calculator...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="calculator-container">
        {occupationSection}
        <div className="panel text-center">
          <h3 className="mb-2">Profile Required</h3>
          <p className="text-muted">Please complete your profile first to calculate your points.</p>
        </div>
      </div>
    );
  }

  let totalPoints = 0;
  
  totalPoints += (profile.age || 0);
  totalPoints += (profile.english || 0);
  totalPoints += (profile.education || 0);
  totalPoints += (profile.partnerSkills || 0);

  if (profile.specialistEdu) totalPoints += 10;
  if (profile.ausStudy) totalPoints += 5;
  if (profile.professionalYear) totalPoints += 5;
  if (profile.ccl) totalPoints += 5;
  if (profile.regionalStudy) totalPoints += 5;
  
  // State nomination for 190
  totalPoints += 5; 

  let workExperience = (profile.overseasExp || 0) + (profile.ausExp || 0);
  if (workExperience > 20) {
    workExperience = 20;
  }
  
  totalPoints += workExperience;
  
  const isEligible = totalPoints >= 65;

  return (
    <div className="calculator-container">

      {occupationSection}

      <div className="score-display">
        <div className="score-number">{totalPoints}</div>
        <div className="text-muted text-sm mt-1">Total Estimated Points</div>
        <div className={`score-status ${isEligible ? 'success' : ''}`}>
           {isEligible ? 'Eligible (65+ Points)' : `Need ${65 - totalPoints} more pts`}
        </div>
      </div>

      <details className="panel mt-4 scorecard-accordion">
        <summary className="scorecard-summary">
          <span style={{display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700', fontSize: '1.1rem'}}>
            View Score Breakdown
          </span>
          <ChevronDown className="accordion-icon text-muted" size={20} />
        </summary>
        
        <div className="points-breakdown mt-4">
          <div className="breakdown-row">
            <span className="breakdown-label">Age</span>
            <span className="breakdown-value">{profile.age || 0}</span>
          </div>
          <div className="breakdown-row">
            <span className="breakdown-label">English</span>
            <span className="breakdown-value">{profile.english || 0}</span>
          </div>
          <div className="breakdown-row">
            <span className="breakdown-label">Education</span>
            <span className="breakdown-value">{profile.education || 0}</span>
          </div>
          <div className="breakdown-row">
            <span className="breakdown-label">Work Experience</span>
            <span className="breakdown-value">{workExperience}</span>
          </div>
          <div className="breakdown-row">
            <span className="breakdown-label">State Nomination (190)</span>
            <span className="breakdown-value">5</span>
          </div>
          
          {profile.specialistEdu && (
            <div className="breakdown-row">
              <span className="breakdown-label">Specialist Education</span>
              <span className="breakdown-value">10</span>
            </div>
          )}
          {profile.ausStudy && (
            <div className="breakdown-row">
              <span className="breakdown-label">Australian Study</span>
              <span className="breakdown-value">5</span>
            </div>
          )}
          {profile.regionalStudy && (
            <div className="breakdown-row">
              <span className="breakdown-label">Regional Study</span>
              <span className="breakdown-value">5</span>
            </div>
          )}
          {profile.ccl && (
            <div className="breakdown-row">
              <span className="breakdown-label">CCL</span>
              <span className="breakdown-value">5</span>
            </div>
          )}
          {profile.professionalYear && (
            <div className="breakdown-row">
              <span className="breakdown-label">Professional Year</span>
              <span className="breakdown-value">5</span>
            </div>
          )}
          {profile.partnerSkills > 0 && (
            <div className="breakdown-row">
              <span className="breakdown-label">Partner Skills</span>
              <span className="breakdown-value">{profile.partnerSkills}</span>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
