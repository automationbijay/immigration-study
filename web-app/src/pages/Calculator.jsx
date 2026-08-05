import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Calculator as CalcIcon } from 'lucide-react';
import ScoreDisplay from '../components/ScoreDisplay';

export default function Calculator({ session }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let ignore = false;
    async function getProfile() {
      setLoading(true);
      const { user } = session;

      const { data, error } = await supabase
        .from('profiles')
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

  if (loading) return <div className="loading">Loading calculator data...</div>;

  if (!profile) {
    return (
      <div className="calculator-container">
        <div className="glass-panel">
          <h2>Please complete your profile first.</h2>
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

  return (
    <div className="calculator-container">
      <div className="glass-panel calc-panel">
        <header>
          <h2><CalcIcon className="inline-icon" /> Visa Points Calculator</h2>
          <p>Based on your profile data, here are your estimated points for the Skilled Nominated visa (subclass 190).</p>
        </header>

        <div className="points-breakdown">
          <ul>
            <li><strong>Age:</strong> {profile.age || 0} pts</li>
            <li><strong>English:</strong> {profile.english || 0} pts</li>
            <li><strong>Education:</strong> {profile.education || 0} pts</li>
            <li><strong>Work Experience:</strong> {workExperience} pts (Max 20)</li>
            <li><strong>State Nomination (190):</strong> 5 pts</li>
            {profile.specialistEdu && <li><strong>Specialist Education:</strong> 10 pts</li>}
            {profile.ausStudy && <li><strong>Australian Study:</strong> 5 pts</li>}
            {profile.regionalStudy && <li><strong>Regional Study:</strong> 5 pts</li>}
            {profile.ccl && <li><strong>CCL:</strong> 5 pts</li>}
            {profile.professionalYear && <li><strong>Professional Year:</strong> 5 pts</li>}
            {profile.partnerSkills > 0 && <li><strong>Partner Skills:</strong> {profile.partnerSkills} pts</li>}
          </ul>
        </div>
      </div>

      <ScoreDisplay targetScore={totalPoints} />
    </div>
  );
}
