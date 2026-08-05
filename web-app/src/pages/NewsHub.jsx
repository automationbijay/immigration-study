import React from 'react';
import { ArrowLeft, Newspaper } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function NewsHub() {
  const navigate = useNavigate();

  // Dummy News Data (mirrored from Discover.jsx)
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
      <Link to="/discover" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)', textDecoration: 'none', marginBottom: '1.5rem' }}>
        <ArrowLeft size={20} /> Back to Discover
      </Link>
      
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Newspaper size={24} /> Latest News
      </h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {newsItems.map(news => (
          <div 
            key={news.id} 
            className="glass-panel hover-card" 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              overflow: 'hidden', 
              cursor: 'pointer',
              padding: 0
            }}
          >
            <img 
              src={news.image} 
              alt={news.title} 
              style={{ width: '100%', height: '160px', objectFit: 'cover' }} 
            />
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', display: 'block', marginBottom: '0.5rem', fontWeight: '600', textTransform: 'uppercase' }}>
                {news.date}
              </span>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', color: 'var(--color-primary)', lineHeight: '1.3' }}>
                {news.title}
              </h3>
              <p style={{ color: 'var(--color-secondary)', fontSize: '0.875rem', lineHeight: '1.5', margin: 0 }}>
                {news.summary}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
