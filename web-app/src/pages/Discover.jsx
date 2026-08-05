import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Newspaper, FileText, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Discover({ session }) {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
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
          let points = 0;
          points += Number(data.age || 0);
          points += Number(data.english || 0);
          points += Number(data.education || 0);
          points += Number(data.partnerSkills || 0);

          if (data.specialistEdu) points += 10;
          if (data.ausStudy) points += 5;
          if (data.professionalYear) points += 5;
          if (data.ccl) points += 5;
          if (data.regionalStudy) points += 5;
          
          // Assuming state nomination is basically true for 190 simulator
          points += 5;

          let workExperience = Number(data.overseasExp || 0) + Number(data.ausExp || 0);
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

  if (loading) {
    return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', color: 'var(--color-primary)'}}>Loading...</div>;
  }

  // Dummy News Data
  const newsItems = [
    {
      id: 1,
      title: 'New Visa Quotas Announced for 2026',
      date: 'Aug 4, 2026',
      summary: 'The government has released the latest allocation limits for skilled migration visas for the upcoming financial year.',
      image: 'https://images.unsplash.com/photo-1524850011238-e3d235c7d4c9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 2,
      title: 'Changes to English Language Requirements',
      date: 'Aug 1, 2026',
      summary: 'Recent adjustments have been made regarding the accepted validity period for IELTS and PTE test results.',
      image: 'https://images.unsplash.com/photo-1546422904-90eab23c3d7e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 3,
      title: 'Regional Migration Updates',
      date: 'Jul 28, 2026',
      summary: 'New regional postcodes have been added to the eligible list for Subclass 491 and Subclass 190 state nominations.',
      image: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
    }
  ];

  return (
    <div className="discover-container" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '100px' }}>
      
      {/* Forms Section */}
      <div style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <FileText size={20} /> Forms
          </h2>
          <button 
            onClick={() => navigate('/forms')}
            style={{ background: 'none', border: 'none', color: 'var(--color-accent)', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer' }}
          >
            View All
          </button>
        </div>
        
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          overflowX: 'auto', 
          paddingBottom: '1rem',
          scrollbarWidth: 'none', // Hide scrollbar Firefox
          msOverflowStyle: 'none', // Hide scrollbar IE/Edge
          scrollSnapType: 'x mandatory',
          marginRight: '-2rem', // Bleed edge
          paddingRight: '2rem'
        }} className="hide-scroll">
          
          <div 
            className="glass-panel hover-card" 
            onClick={() => navigate('/calculator')}
            style={{ 
              padding: '1.5rem', 
              cursor: 'pointer', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '1rem', 
              position: 'relative',
              background: 'linear-gradient(to bottom right, var(--color-surface), #f8fafc)',
              border: '1px solid var(--color-border)',
              borderRadius: '1rem',
              minWidth: '280px',
              maxWidth: '320px',
              flexShrink: 0,
              scrollSnapAlign: 'start'
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
      </div>

      {/* News Section */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <Newspaper size={20} /> News
          </h2>
          <button 
            onClick={() => navigate('/news')}
            style={{ background: 'none', border: 'none', color: 'var(--color-accent)', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer' }}
          >
            View All
          </button>
        </div>

        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          overflowX: 'auto', 
          paddingBottom: '1rem',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          scrollSnapType: 'x mandatory',
          marginRight: '-2rem',
          paddingRight: '2rem'
        }} className="hide-scroll">
          {newsItems.map(news => (
            <div 
              key={news.id} 
              className="glass-panel hover-card" 
              onClick={() => navigate('/news')}
              style={{ 
                display: 'flex', 
                flexDirection: 'column',
                gap: '1rem', 
                padding: '1rem', 
                overflow: 'hidden', 
                cursor: 'pointer', 
                minWidth: '260px',
                maxWidth: '280px',
                flexShrink: 0,
                scrollSnapAlign: 'start'
              }}
            >
              <img 
                src={news.image} 
                alt={news.title} 
                style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '8px' }} 
              />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', display: 'block', marginBottom: '0.25rem' }}>{news.date}</span>
                <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem', color: 'var(--color-primary)', lineHeight: '1.3', flex: 1 }}>{news.title}</h3>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
