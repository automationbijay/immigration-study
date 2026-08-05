import React, { useState, useEffect } from 'react';
import PointsForm from '../components/PointsForm';
import ScoreDisplay from '../components/ScoreDisplay';
import { supabase } from '../lib/supabase';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Calculator({ session }) {
  const [loading, setLoading] = useState(true);
  
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
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching profile:', error);
        }

        if (data) {
          setFormData(prev => ({
            ...prev,
            age: data.age || 0,
            english: data.english || 0,
            overseasExp: data.overseasExp || 0,
            ausExp: data.ausExp || 0,
            education: data.education || 0,
            specialistEdu: data.specialistEdu || false,
            ausStudy: data.ausStudy || false,
            professionalYear: data.professionalYear || false,
            ccl: data.ccl || false,
            regionalStudy: data.regionalStudy || false,
            partnerSkills: data.partnerSkills || 0,
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

  if (loading) {
    return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', color: 'var(--color-primary)'}}>Loading...</div>;
  }

  return (
    <div className="discover-container" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '100px' }}>
      <Link to="/discover" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)', textDecoration: 'none', marginBottom: '1.5rem' }}>
        <ArrowLeft size={20} /> Back to Discover
      </Link>
      
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: 'var(--color-text)' }}>Eligibility Calculator</h2>
      <p style={{ color: 'var(--color-muted)', marginBottom: '2rem' }}>
        This form is pre-populated with data from your profile. You can tweak the values here to see how it affects your total points.
      </p>
      
      <ScoreDisplay targetScore={totalPoints} />
      
      <div style={{ marginTop: '2rem' }}>
        <PointsForm formData={formData} handleInputChange={handleInputChange} />
      </div>
    </div>
  );
}
