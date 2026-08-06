import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Newspaper, FileText, Wrench } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { totalPointsFromProfileRow } from '../lib/points';
import { NEWS_ITEMS } from '../lib/news';
import FormCard from '../components/FormCard';
import NewsCard from '../components/NewsCard';
import ToolCard from '../components/ToolCard';
import { SkeletonPage } from '../components/ui/Skeleton';

export default function Discover({ session }) {
  const [loading, setLoading] = useState(true);
  const [totalPoints, setTotalPoints] = useState(0);

  useEffect(() => {
    let ignore = false;

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

        if (!ignore && profileData) {
          setTotalPoints(totalPointsFromProfileRow(profileData, basicData));
        }
      } catch (error) {
        console.error('Error in fetching profile:', error);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    getProfile();
    return () => { ignore = true; };
  }, [session]);

  if (loading) return <SkeletonPage lines={2} label="Loading your dashboard" />;

  return (
    <>
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">
            <FileText size={20} aria-hidden="true" /> Forms
          </h2>
          <Link to="/forms" className="link-button">View All</Link>
        </div>

        <div className="card-rail">
          <FormCard totalPoints={totalPoints} />
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">
            <Newspaper size={20} aria-hidden="true" /> News
          </h2>
          <Link to="/news" className="link-button">View All</Link>
        </div>

        <div className="card-rail">
          {NEWS_ITEMS.map((news) => (
            <NewsCard key={news.id} news={news} />
          ))}
        </div>
      </section>
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">
            <Wrench size={20} aria-hidden="true" /> Tools
          </h2>
        </div>

        <div className="card-rail">
          <ToolCard 
            title="ANZSCO Code Finder" 
            description="Search and find the correct ANZSCO code for your occupation to check your visa eligibility."
            to="/tools/anzsco" 
          />
          <ToolCard 
            title="University Finder" 
            description="Search and find recognized universities to check eligibility for visas or claiming points."
            to="/tools/university" 
          />
        </div>
      </section>
    </>
  );
}
