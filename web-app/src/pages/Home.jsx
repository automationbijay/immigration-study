import { useMemo } from 'react';
import PageLink from '../components/ui/PageLink';
import { useProfile } from '../lib/ProfileContext';
import { useProfileCompletion } from '../lib/profileCompletion';
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
  const { profileRow, basicRow, fswRow, cvRow, loading, error, refetch } = useProfile();

  const completion = useProfileCompletion(session?.user?.id, basicRow, profileRow);

  const email = session?.user?.email || '';
  const fallbackName = email ? email.split('@')[0] : 'there';
  const insights = useMemo(() => {
    const form = formFromProfileRow(profileRow, basicRow);
    const ctx = buildContext(form, profileRow, basicRow);
    const eligible = eligiblePathways(form, ctx).filter(({ visa }) => visa.pointsTested);
    const nearest = eligible.length === 0 ? nearestPathway(form, ctx) : null;

    return {
      basePoints: basePointsFromForm(form),
      eligible,
      nearest,
      unlocks: nearest ? unlockOptions(form, nearest.gap) : [],
    };
  }, [profileRow, basicRow]);

  if (loading) return <SkeletonPage lines={3} label="Preparing your points estimates" />;

  if (error) return <button className="btn-secondary" onClick={() => refetch()}>Retry loading your dashboard</button>;

  const name = basicRow?.name?.split(' ')[0] || fallbackName;
  const { basePoints, eligible, nearest, unlocks } = insights;
  const gaps = completion.entries && !completion.loading && !completion.error ? profileGaps(completion) : [];
  const percent = gaps.length ? completeness(gaps) : null;

  // On a sparse profile the score is not yet meaningful, so asking for the
  // missing facts outranks showing a gap the person may already have closed.
  const profileFirst = percent !== null && percent < 50;

  const nextGap = gaps.find(gap => !gap.done);

  return (
    <div className="dashboard-page">
      <h1>{name}’s dashboard</h1>
      {completion.error && (
        <button className="btn-secondary" onClick={completion.retry}>Retry loading your profile checklist</button>
      )}
      {nextGap && (
        <section className="next-task">
          <h2>Continue your profile</h2>
          <PageLink to={nextGap.to} className="btn-primary">{nextGap.label}</PageLink>
          {!cvRow && <PageLink to="/profile?intent=upload_cv">Import from CV</PageLink>}
        </section>
      )}
      <ScoreHero basePoints={profileRow ? basePoints : null} fswRow={fswRow} />
      {percent !== null && percent < 100 && <ProfileChecklist gaps={gaps} percent={percent} />}
      {!profileFirst && (
        <>
          {eligible.length > 0 ? (
            <section className="section" style={{ marginBottom: 'var(--spacing-xl)' }}>
              <h2 className="section-title" style={{ fontSize: '1.5rem', marginBottom: 'var(--spacing-md)' }}>
                A pathway to explore
              </h2>
              <div className="pathway-list-stack">
                <PathwayCard match={eligible[0]} />
              </div>
            </section>
          ) : nearest ? (
            <section className="section" style={{ marginBottom: 'var(--spacing-xl)' }}>
              <h2 className="section-title" style={{ fontSize: '1.5rem', marginBottom: 'var(--spacing-md)' }}>
                Closest to the points threshold
              </h2>
              <NearestPathway match={nearest} unlocks={unlocks} />
            </section>
          ) : (
            <section className="section" style={{ marginBottom: 'var(--spacing-xl)' }}>
              <div className="roadmap-note" style={{ padding: 'var(--spacing-xl)', textAlign: 'center', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: 'var(--spacing-sm)' }}>Review your skilled immigration options</h3>
                <p style={{ color: 'var(--color-secondary)' }}>
                  Check your profile details and review the official requirements for the pathways you’re considering.
                </p>
              </div>
            </section>
          )}

          <PageLink to="/discover">Explore points-tested pathways</PageLink>
        </>
      )}
    </div>
  );
}
