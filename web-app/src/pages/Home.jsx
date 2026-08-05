import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Compass, TrendingUp, Globe2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formFromProfileRow, basePointsFromForm } from '../lib/points';
import {
  buildContext,
  eligiblePathways,
  nearestPathway,
  unlockOptions,
  opportunities,
  profileGaps,
  completeness,
} from '../lib/visas';
import { SkeletonPage } from '../components/ui/Skeleton';
import ScoreHero from '../components/home/ScoreHero';
import PathwayCard from '../components/home/PathwayCard';
import NearestPathway from '../components/home/NearestPathway';
import Opportunities from '../components/home/Opportunities';
import AssistantCard from '../components/home/AssistantCard';
import CountryRoadmap from '../components/home/CountryRoadmap';
import ProfileChecklist from '../components/home/ProfileChecklist';

export default function Home({ session }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState({ profile: null, basic: null });

  const email = session?.user?.email || '';
  const fallbackName = email ? email.split('@')[0] : 'there';

  useEffect(() => {
    let ignore = false;

    async function load() {
      if (!session?.user?.id) return;
      try {
        const { data: profile, error } = await supabase
          .from('point_australia')
          .select('*')
          .eq('id', session.user.id)
          .single();

        const { data: basic } = await supabase
          .from('profile_basic')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching profile:', error);
        }

        if (!ignore) setRows({ profile, basic });
      } catch (err) {
        console.error('Error in fetching profile:', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => { ignore = true; };
  }, [session]);

  const insights = useMemo(() => {
    const form = formFromProfileRow(rows.profile, rows.basic);
    const ctx = buildContext(form, rows.profile, rows.basic);
    const gaps = profileGaps(form, ctx);
    const eligible = eligiblePathways(form, ctx);
    const nearest = eligible.length === 0 ? nearestPathway(form, ctx) : null;

    return {
      basePoints: basePointsFromForm(form),
      eligible,
      nearest,
      unlocks: nearest ? unlockOptions(form, nearest.gap) : [],
      boosts: opportunities(form),
      gaps,
      percent: completeness(gaps),
    };
  }, [rows]);

  if (loading) return <SkeletonPage lines={3} label="Working out your pathways" />;

  const name = rows.basic?.name?.split(' ')[0] || fallbackName;
  const { basePoints, eligible, nearest, unlocks, boosts, gaps, percent } = insights;

  // On a sparse profile the score is not yet meaningful, so asking for the
  // missing facts outranks showing a gap the person may already have closed.
  const profileFirst = percent < 50;

  const checklistSection = percent < 100 && (
    <section className="section">
      <ProfileChecklist gaps={gaps} percent={percent} />
    </section>
  );

  return (
    <div className="home">
      <ScoreHero name={name} basePoints={basePoints} eligibleCount={eligible.length} />

      {profileFirst && checklistSection}

      {eligible.length > 0 && (
        <section className="section">
          <h2 className="section-title">
            <Compass size={20} aria-hidden="true" /> Your pathways
          </h2>
          <p className="section-caption">
            Based on your profile today. Tap any pathway to see what it gives you and how to apply.
          </p>
          <div className="pathway-list-stack">
            {eligible.map((match) => (
              <PathwayCard key={match.visa.id} match={match} />
            ))}
          </div>
        </section>
      )}

      {nearest && (
        <section className="section">
          <h2 className="section-title">
            <Compass size={20} aria-hidden="true" /> Your closest pathway
          </h2>
          <p className="section-caption">You are not far off. Here is what opens it.</p>
          <NearestPathway match={nearest} unlocks={unlocks} />
        </section>
      )}

      {/* Nothing qualifies and nothing is within reach of more points — say so
          plainly via the profile checklist rather than inventing a goal. */}
      {eligible.length === 0 && !nearest && (
        <section className="section">
          <div className="roadmap-note">
            <h3>We are still expanding what we cover</h3>
            <p>
              Right now we match against Australia&rsquo;s points-tested skilled visas.
              Employer-sponsored and business pathways, plus more countries, are on the way.
            </p>
          </div>
        </section>
      )}

      {!profileFirst && checklistSection}

      {boosts.length > 0 && (
        <section className="section">
          <h2 className="section-title">
            <TrendingUp size={20} aria-hidden="true" /> Ways to score higher
          </h2>
          <p className="section-caption">
            A higher score widens your options and improves your chances of an invitation.
          </p>
          <Opportunities items={boosts} />
          <Link to="/australia-point-calculator" className="btn-secondary home-cta">
            Open the calculator
          </Link>
        </section>
      )}

      <section className="section">
        <AssistantCard />
      </section>

      <section className="section">
        <h2 className="section-title">
          <Globe2 size={20} aria-hidden="true" /> Where you could go next
        </h2>
        <p className="section-caption">
          Australia is live today. More destinations are coming, and your profile carries over.
        </p>
        <CountryRoadmap />
      </section>
    </div>
  );
}
