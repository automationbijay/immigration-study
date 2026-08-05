import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileUp, Search, Globe, ArrowRight } from 'lucide-react';

export default function Landing({ session }) {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      <div className="landing-content">
        <div className="landing-hero">
          <div className="badge">
            <Globe className="badge-icon" />
            <span>Global Migration Made Easy</span>
          </div>
          
          <h1 className="landing-title">
            Your Pathway to <br />
            <span className="text-gradient">New Opportunities</span>
          </h1>
          
          <p className="landing-tagline">
            Upload cv and find pr and migration eligibility in developed country
          </p>

          <div className="landing-actions">
            {!session ? (
              <>
                <button className="btn-primary-large" onClick={() => navigate('/signup')}>
                  Get Started <ArrowRight className="inline-icon" />
                </button>
                <button className="btn-secondary-large" onClick={() => navigate('/login')}>
                  Log In
                </button>
              </>
            ) : (
              <button className="btn-primary-large" onClick={() => navigate('/home')}>
                Go to Dashboard <ArrowRight className="inline-icon" />
              </button>
            )}
          </div>
        </div>

        <div className="landing-features">
          <div className="feature-card glass-panel hover-card">
            <div className="feature-icon-wrapper">
              <FileUp className="feature-icon" />
            </div>
            <h3>Smart CV Analysis</h3>
            <p>We analyze your profile against current migration pathways to find the best match for you.</p>
          </div>
          <div className="feature-card glass-panel hover-card">
            <div className="feature-icon-wrapper">
              <Search className="feature-icon" />
            </div>
            <h3>Eligibility Check</h3>
            <p>Instantly calculate your PR points and discover viable immigration routes.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
