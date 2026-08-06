import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Compass, Upload, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useProfile } from '../lib/ProfileContext';
import { formFromProfileRow, basePointsFromForm } from '../lib/points';
import {
  buildContext,
  eligiblePathways,
  nearestPathway,
  unlockOptions,
  profileGaps,
  completeness,
} from '../lib/visas';
import { SkeletonPage } from '../components/ui/Skeleton';
import ScoreHero from '../components/home/ScoreHero';
import PathwayCard from '../components/home/PathwayCard';
import NearestPathway from '../components/home/NearestPathway';
import ProfileChecklist from '../components/home/ProfileChecklist';

export default function Home({ session }) {
  const { profileRow, basicRow, loading: profileLoading } = useProfile();
  const [cvLoading, setCvLoading] = useState(true);
  const [cv, setCv] = useState(null);

  const email = session?.user?.email || '';
  const fallbackName = email ? email.split('@')[0] : 'there';

  // point_australia + profile_basic now come from the shared ProfileContext
  // (fetched once app-wide) instead of being re-fetched here; only the CV
  // pointer is specific to this page.
  useEffect(() => {
    let ignore = false;

    async function loadCv() {
      if (!session?.user?.id) return;
      try {
        const { data: cvData, error: cvError } = await supabase
          .from('cv_metadata')
          .select('file_url')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cvError && cvError.code !== 'PGRST116') {
          console.error('Error fetching CV:', cvError);
        }

        if (!ignore) setCv(cvData ?? null);
      } catch (err) {
        console.error('Error in fetching CV:', err);
      } finally {
        if (!ignore) setCvLoading(false);
      }
    }

    loadCv();
    return () => { ignore = true; };
  }, [session]);

  const loading = profileLoading || cvLoading;
  const insights = useMemo(() => {
    const form = formFromProfileRow(profileRow, basicRow);
    const ctx = buildContext(form, profileRow, basicRow);
    const gaps = profileGaps(form, ctx);
    const eligible = eligiblePathways(form, ctx);
    const nearest = eligible.length === 0 ? nearestPathway(form, ctx) : null;

    return {
      basePoints: basePointsFromForm(form),
      eligible,
      nearest,
      unlocks: nearest ? unlockOptions(form, nearest.gap) : [],
      gaps,
      percent: completeness(gaps),
    };
  }, [profileRow, basicRow]);

  if (loading) return <SkeletonPage lines={3} label="Working out your pathways" />;

  const name = basicRow?.name?.split(' ')[0] || fallbackName;
  const { basePoints, eligible, nearest, unlocks, gaps, percent } = insights;

  // On a sparse profile the score is not yet meaningful, so asking for the
  // missing facts outranks showing a gap the person may already have closed.
  const profileFirst = percent < 50;

  const hasNotAddedCV = !cv?.file_url;
  const needsUploadCvCta = hasNotAddedCV || percent < 50;

  const checklistSection = percent < 100 && (
    <section className="section">
      <ProfileChecklist gaps={gaps} percent={percent} />
    </section>
  );

  const uploadCvSection = needsUploadCvCta && (
    <section className="section">
      <div className="checklist-card" style={{ textAlign: 'center', padding: 'var(--spacing-xl) var(--spacing-lg)' }}>
        <div style={{ marginBottom: 'var(--spacing-md)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--spacing-xs)' }}>
            Complete your profile instantly
          </h2>
          <p style={{ color: 'var(--color-secondary)', fontSize: 'var(--text-sm)', lineHeight: 1.5 }}>
            Upload your CV and we'll automatically fill in your experience, education, and skills.
          </p>
        </div>
        <Link to="/profile?intent=upload_cv" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
          <Upload size={18} />
          Upload CV
        </Link>
      </div>
    </section>
  );

  return (
    <div className="home" style={{ maxWidth: '600px', margin: '0 auto', paddingBottom: 'var(--spacing-2xl)' }}>
      <ScoreHero name={name} basePoints={basePoints} eligibleCount={eligible.length} />

      {profileFirst ? (
        <>
          {uploadCvSection}
          {checklistSection}
        </>
      ) : (
        <>
          {eligible.length > 0 ? (
            <section className="section" style={{ marginBottom: 'var(--spacing-xl)' }}>
              <h2 className="section-title" style={{ fontSize: '1.5rem', marginBottom: 'var(--spacing-md)' }}>
                Your Top Pathway
              </h2>
              <div className="pathway-list-stack">
                <PathwayCard match={eligible[0]} />
              </div>
            </section>
          ) : nearest ? (
            <section className="section" style={{ marginBottom: 'var(--spacing-xl)' }}>
              <h2 className="section-title" style={{ fontSize: '1.5rem', marginBottom: 'var(--spacing-md)' }}>
                Your Closest Pathway
              </h2>
              <NearestPathway match={nearest} unlocks={unlocks} />
            </section>
          ) : (
            <section className="section" style={{ marginBottom: 'var(--spacing-xl)' }}>
              <div className="roadmap-note" style={{ padding: 'var(--spacing-xl)', textAlign: 'center', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: 'var(--spacing-sm)' }}>We are expanding</h3>
                <p style={{ color: 'var(--color-secondary)' }}>
                  Right now we match against Australia's points-tested skilled visas. More pathways are on the way.
                </p>
              </div>
            </section>
          )}

          <section className="section" style={{ marginTop: 'var(--spacing-xl)', textAlign: 'center' }}>
            <Link to="/discover" style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '12px', 
              justifyContent: 'center', 
              padding: '1.25rem', 
              width: '100%',
              background: 'linear-gradient(135deg, var(--color-foreground) 0%, var(--color-primary) 100%)',
              color: 'white',
              borderRadius: 'var(--radius-xl)',
              fontWeight: 700,
              fontSize: '1.1rem',
              textDecoration: 'none',
              boxShadow: '0 8px 20px rgba(30, 58, 138, 0.25)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}>
              Explore all pathways & opportunities <ArrowRight size={22} />
            </Link>
          </section>
        </>
      )}
    </div>
  );
}
