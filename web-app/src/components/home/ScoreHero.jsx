import React, { useState } from 'react';
import { Target, Award, Star, ChevronLeft, ChevronRight, ArrowRight, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ScoreHero({ name, basePoints, eligibleCount, fswRow, crsRow }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const allScoreSlides = [];

  // Slide 1: Australia
  allScoreSlides.push({
    id: 'aus',
    title: `Hi ${name}, your Australia score is`,
    flagUrl: 'https://flagcdn.com/w40/au.png',
    score: basePoints,
    suffix: 'pts',
    isEligible: eligibleCount > 0,
    footer: eligibleCount > 0 ? (
      <>
        <Award size={18} />
        That opens {eligibleCount} {eligibleCount === 1 ? 'pathway' : 'pathways'}
      </>
    ) : (
      <>
        <Star size={18} />
        Your Australia skilled migration score
      </>
    ),
    footerActive: eligibleCount > 0
  });

  // Slide 2: Canada CRS
  if (crsRow) {
    allScoreSlides.push({
      id: 'crs',
      title: 'Canada CRS Score',
      flagUrl: 'https://flagcdn.com/w40/ca.png',
      score: crsRow.total_points || 0,
      suffix: 'pts',
      isEligible: crsRow.total_points > 400, // Assuming a competitive score
      footer: (
        <>
          <Award size={18} />
          Estimated Comprehensive Ranking Score
        </>
      ),
      footerActive: crsRow.total_points > 0
    });
  }

  // Slide 3: Canada FSW
  if (fswRow) {
    allScoreSlides.push({
      id: 'fsw',
      title: 'Canada FSW 67',
      flagUrl: 'https://flagcdn.com/w40/ca.png',
      score: fswRow.total_points || 0,
      suffix: '/ 100',
      isEligible: fswRow.is_eligible,
      footer: (
        <>
          <Award size={18} />
          {fswRow.is_eligible ? 'Eligible for Federal Skilled Worker' : 'Not Eligible for FSW (Need 67)'}
        </>
      ),
      footerActive: fswRow.is_eligible
    });
  }

  // Sort by eligibility first, then by score descending
  allScoreSlides.sort((a, b) => {
    if (a.isEligible && !b.isEligible) return -1;
    if (!a.isEligible && b.isEligible) return 1;
    return b.score - a.score;
  });

  const slides = [...allScoreSlides];

  // Slide 4: Enticement (if missing forms)
  if (!fswRow || !crsRow) {
    slides.push({
      id: 'enticement',
      isAction: true,
      title: 'Unlock more opportunities',
      description: 'Fill out the Canada assessment to see your eligibility for other countries and visas.',
      actionLink: '/forms',
      actionText: 'Check Eligibility'
    });
  }

  const nextSlide = () => setCurrentSlide((p) => (p + 1) % slides.length);
  const prevSlide = () => setCurrentSlide((p) => (p - 1 + slides.length) % slides.length);

  // Fallback in case currentSlide is out of bounds due to data changes
  const slide = slides[currentSlide] || slides[0];

  return (
    <section style={{
      background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-foreground) 100%)',
      borderRadius: 'var(--radius-xl)',
      padding: 'var(--spacing-2xl) var(--spacing-lg)',
      color: 'white',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 10px 30px rgba(30, 58, 138, 0.25)',
      marginBottom: 'var(--spacing-xl)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      minHeight: '280px',
      justifyContent: 'center'
    }}>
      {/* Decorative background elements */}
      <div style={{ position: 'absolute', top: '-10%', right: '-10%', opacity: 0.1, transform: 'rotate(15deg)', pointerEvents: 'none' }}>
        <Target size={180} />
      </div>

      {slide.isAction ? (
        <div style={{ zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <Globe size={48} style={{ opacity: 0.9, marginBottom: '0.5rem' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'white' }}>{slide.title}</h2>
          <p style={{ opacity: 0.9, maxWidth: '80%', marginBottom: '1rem' }}>{slide.description}</p>
          <Link to={slide.actionLink} style={{
            background: 'white',
            color: 'var(--color-primary)',
            padding: '0.75rem 1.5rem',
            borderRadius: 'var(--radius-full)',
            fontWeight: 700,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            {slide.actionText} <ArrowRight size={18} />
          </Link>
        </div>
      ) : (
        <div style={{ zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <p style={{ fontSize: '1.1rem', fontWeight: 500, marginBottom: 'var(--spacing-md)', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '8px' }}>
            {slide.flagUrl && <img src={slide.flagUrl} alt="flag" style={{ width: '24px', height: 'auto', borderRadius: '2px' }} />}
            {slide.title}
          </p>

          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'baseline', 
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '1rem 2.5rem',
            borderRadius: 'var(--radius-full)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            marginBottom: 'var(--spacing-lg)'
          }}>
            <span style={{ fontSize: '4.5rem', fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1 }}>
              {slide.score}
            </span>
            <span style={{ fontSize: '1.25rem', fontWeight: 600, marginLeft: '0.5rem', opacity: 0.9 }}>
              {slide.suffix}
            </span>
          </div>

          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            backgroundColor: slide.footerActive ? 'rgba(74, 222, 128, 0.2)' : 'rgba(255, 255, 255, 0.15)',
            color: slide.footerActive ? '#bbf7d0' : 'white',
            padding: '0.5rem 1rem',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.95rem',
            fontWeight: 600,
            border: `1px solid ${slide.footerActive ? 'rgba(74, 222, 128, 0.3)' : 'rgba(255, 255, 255, 0.2)'}`
          }}>
            {slide.footer}
          </div>
        </div>
      )}

      {/* Navigation Arrows */}
      {slides.length > 1 && (
        <>
          <button onClick={prevSlide} style={{
            position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
            background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white',
            borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 2
          }}>
            <ChevronLeft size={24} />
          </button>
          <button onClick={nextSlide} style={{
            position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
            background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white',
            borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 2
          }}>
            <ChevronRight size={24} />
          </button>
          
          {/* Dots */}
          <div style={{ position: 'absolute', bottom: '15px', display: 'flex', gap: '8px', zIndex: 2 }}>
            {slides.map((_, idx) => (
              <div key={idx} onClick={() => setCurrentSlide(idx)} style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: idx === currentSlide ? 'white' : 'rgba(255,255,255,0.3)',
                cursor: 'pointer', transition: 'background 0.2s ease'
              }} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
