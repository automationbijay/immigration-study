import React, { useState, useEffect } from 'react';
import { ArrowLeft, FileText, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function FormsHub({ session }) {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
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
          let agePoints = 0;
          if (basicData?.dob) {
              const birthDate = new Date(basicData.dob);
              const today = new Date();
              let age = today.getFullYear() - birthDate.getFullYear();
              const m = today.getMonth() - birthDate.getMonth();
              if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
              if (age >= 18 && age <= 24) agePoints = 25;
              else if (age >= 25 && age <= 32) agePoints = 30;
              else if (age >= 33 && age <= 39) agePoints = 25;
              else if (age >= 40 && age <= 44) agePoints = 15;
          } else if (profileData?.age) {
              agePoints = Number(profileData.age);
          }

          let osExp = Number(profileData?.overseasExp || 0);
          let osExpPoints = 0;
          if (osExp >= 8) osExpPoints = 15;
          else if (osExp >= 5) osExpPoints = 10;
          else if (osExp >= 3) osExpPoints = 5;
          else if (osExp > 15) osExpPoints = osExp; // If they already saved points

          let auExp = Number(profileData?.ausExp || 0);
          let auExpPoints = 0;
          if (auExp >= 8) auExpPoints = 20;
          else if (auExp >= 5) auExpPoints = 15;
          else if (auExp >= 3) auExpPoints = 10;
          else if (auExp >= 1) auExpPoints = 5;
          else if (auExp > 20) auExpPoints = auExp; // If they already saved points

          let points = 0;
          points += agePoints;
          points += Number(profileData.english || 0);
          points += Number(profileData.education || 0);
          points += Number(profileData.partnerSkills || 0);

          if (profileData.specialistEdu) points += 10;
          if (profileData.ausStudy) points += 5;
          if (profileData.professionalYear) points += 5;
          if (profileData.ccl) points += 5;
          if (profileData.regionalStudy) points += 5;
          points += 5; // state nomination

          let workExperience = osExpPoints + auExpPoints;
          if (workExperience > 20) workExperience = 20;
          points += workExperience;

          setTotalPoints(points);
        }
      } catch (error) {
        console.error('Error in fetching profile:', error);
      } finally {
        setLoading(false);
      }
    }

    getProfile();
  }, [session]);

  return (
    <div className="discover-container" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '100px' }}>
      <Link to="/discover" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)', textDecoration: 'none', marginBottom: '1.5rem' }}>
        <ArrowLeft size={20} /> Back to Discover
      </Link>
      
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <FileText size={24} /> All Forms
      </h2>
      
      {loading ? (
        <div style={{ color: 'var(--color-secondary)' }}>Loading forms...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {/* Form Card */}
          <div 
            className="glass-panel hover-card" 
            onClick={() => navigate('/australia-point-calculator')}
            style={{ 
              padding: '1.5rem', 
              cursor: 'pointer', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '1rem', 
              position: 'relative',
              background: 'linear-gradient(to bottom right, var(--color-surface), #f8fafc)',
              border: '1px solid var(--color-border)',
              borderRadius: '1rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ background: 'rgba(161, 98, 7, 0.1)', padding: '0.5rem', borderRadius: '0.5rem', color: 'var(--color-accent)' }}>
                  <FileText size={20} />
                </div>
                <h3 style={{ fontSize: '1.125rem', color: 'var(--color-primary)', fontWeight: 'bold', margin: 0 }}>Australia Point Estimation</h3>
              </div>
              <ChevronRight size={20} color="var(--color-secondary)" style={{ opacity: 0.5 }} />
            </div>
            
            <p style={{ color: 'var(--color-secondary)', fontSize: '0.875rem', margin: 0, lineHeight: '1.5' }}>
              Calculate and estimate your points for Australian skilled migration visas (Subclass 189, 190, 491).
            </p>
            
            {totalPoints > 0 && (
              <div style={{ 
                marginTop: '0.5rem',
                background: totalPoints >= 65 ? 'rgba(22, 163, 74, 0.1)' : 'rgba(220, 38, 38, 0.1)', 
                padding: '0.5rem 1rem', 
                borderRadius: '0.5rem',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: totalPoints >= 65 ? '1px solid rgba(22, 163, 74, 0.2)' : '1px solid rgba(220, 38, 38, 0.2)',
              }}>
                <span style={{ fontSize: '0.8125rem', color: totalPoints >= 65 ? '#16a34a' : '#dc2626', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {totalPoints >= 65 ? 'Eligible Score' : 'Current Score'}
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: '800', color: totalPoints >= 65 ? '#15803d' : '#b91c1c' }}>{totalPoints}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: '600', color: totalPoints >= 65 ? '#16a34a' : '#dc2626', opacity: 0.8 }}>pts</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
