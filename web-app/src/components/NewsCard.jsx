import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Card from './ui/Card';

export default function NewsCard({ news, showSummary = false, to = '/news' }) {
  const [imageFailed, setImageFailed] = useState(false);

  const body = (
    <>
      {/* Decorative: the headline below carries the meaning. On a load failure
          the tinted block stays, so the card keeps its shape instead of
          showing a broken-image glyph or jumping shorter. */}
      {imageFailed ? (
        <span className="news-card-image" aria-hidden="true" />
      ) : (
        <img
          className="news-card-image"
          src={news.image}
          alt=""
          width="800"
          height="400"
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      )}
      <div className="news-card-body">
        <span className="news-card-date">{news.date}</span>
        <h3 className="news-card-title">{news.title}</h3>
        {showSummary && <p className="news-card-summary">{news.summary}</p>}
      </div>
    </>
  );

  if (!to) {
    return <Card className="news-card">{body}</Card>;
  }

  return (
    <Card as={Link} to={to} interactive className="news-card">
      {body}
    </Card>
  );
}
