import React, { useState, useEffect } from 'react';
import PointsForm from '../components/PointsForm';
import ScoreDisplay from '../components/ScoreDisplay';
import { supabase } from '../lib/supabase';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Calculator({ session }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  const [formData, setFormData] = useState({
    age: 0,
    english: 0,
    overseasExp: 0,
    ausExp: 0,
    education: 0,
    specialistEdu: false,
    ausStudy: false,
    professionalYear: false,
    ccl: false,
    regionalStudy: false,
    partnerSkills: 0,
    stateNomination: true
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

        // Calculate age points based on DOB
        let agePoints = 0;
        if (basicData?.dob) {
            const birthDate = new Date(basicData.dob);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
              age--;
            }
            if (age >= 18 && age <= 24) agePoints = 25;
            else if (age >= 25 && age <= 32) agePoints = 30;
            else if (age >= 33 && age <= 39) agePoints = 25;
            else if (age >= 40 && age <= 44) agePoints = 15;
            else agePoints = 0;
        } else if (profileData?.age) {
            // fallback if age was manually saved as points
            agePoints = profileData.age;
        }

        // Map overseasExp years to points if it looks like years (< 30) and not points (0, 5, 10, 15)
        // Actually Profile saves literal years. Let's map it.
        let osExp = profileData?.overseasExp || 0;
        let osExpPoints = 0;
        if (osExp >= 8) osExpPoints = 15;
        else if (osExp >= 5) osExpPoints = 10;
        else if (osExp >= 3) osExpPoints = 5;

        // Map ausExp years to points
        let auExp = profileData?.ausExp || 0;
        let auExpPoints = 0;
        if (auExp >= 8) auExpPoints = 20;
        else if (auExp >= 5) auExpPoints = 15;
        else if (auExp >= 3) auExpPoints = 10;
        else if (auExp >= 1) auExpPoints = 5;

        if (profileData) {
          setFormData(prev => ({
            ...prev,
            age: agePoints,
            english: profileData.english || 0,
            overseasExp: osExpPoints,
            ausExp: auExpPoints,
            education: profileData.education || 0,
            specialistEdu: profileData.specialistEdu || false,
            ausStudy: profileData.ausStudy || false,
            professionalYear: profileData.professionalYear || false,
            ccl: profileData.ccl || false,
            regionalStudy: profileData.regionalStudy || false,
            partnerSkills: profileData.partnerSkills || 0,
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
    let points = 0;
    points += Number(formData.age);
    points += Number(formData.english);
    points += Number(formData.education);
    points += Number(formData.partnerSkills);

    if (formData.specialistEdu) points += 10;
    if (formData.ausStudy) points += 5;
    if (formData.professionalYear) points += 5;
    if (formData.ccl) points += 5;
    if (formData.regionalStudy) points += 5;
    if (formData.stateNomination) points += 5;

    let workExperience = Number(formData.overseasExp) + Number(formData.ausExp);
    if (workExperience > 20) workExperience = 20;
    points += workExperience;

    setTotalPoints(points);
  }, [formData]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
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
          age: formData.age,
          english: formData.english,
          overseasExp: formData.overseasExp,
          ausExp: formData.ausExp,
          education: formData.education,
          specialistEdu: formData.specialistEdu,
          ausStudy: formData.ausStudy,
          professionalYear: formData.professionalYear,
          ccl: formData.ccl,
          regionalStudy: formData.regionalStudy,
          partnerSkills: formData.partnerSkills,
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
      
      <div style={{ marginTop: '2rem' }}>
        <PointsForm formData={formData} handleInputChange={handleInputChange} />
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
