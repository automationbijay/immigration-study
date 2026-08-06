import React from 'react';
import { Link } from 'react-router-dom';
import Card from './ui/Card';
import { Briefcase } from 'lucide-react';

export default function ToolCard({ title, description, icon: Icon = Briefcase, to }) {
  const body = (
    <>
      <div className="tool-card-body" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <span className="icon-badge" style={{ backgroundColor: 'var(--primary-subtle)', color: 'var(--primary)', padding: '0.5rem', borderRadius: '50%', display: 'flex' }}>
            <Icon size={24} aria-hidden="true" />
          </span>
          <h3 className="tool-card-title" style={{ margin: 0 }}>{title}</h3>
        </div>
        <p className="tool-card-summary">{description}</p>
      </div>
    </>
  );

  if (!to) {
    return <Card className="tool-card">{body}</Card>;
  }

  return (
    <Card as={Link} to={to} interactive className="tool-card">
      {body}
    </Card>
  );
}
