import React from 'react';
import { Newspaper } from 'lucide-react';
import { NEWS_ITEMS } from '../lib/news';
import PageHeader from '../components/ui/PageHeader';
import NewsCard from '../components/NewsCard';

export default function NewsHub() {
  return (
    <>
      <PageHeader title="Latest News" icon={Newspaper} backTo="/discover" backLabel="Back to Discover" />

      <div className="card-grid">
        {NEWS_ITEMS.map((news) => (
          <NewsCard key={news.id} news={news} showSummary to={null} />
        ))}
      </div>
    </>
  );
}
