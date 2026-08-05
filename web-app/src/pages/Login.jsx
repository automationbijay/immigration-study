import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Carried from Landing's "Upload CV" CTA; Profile opens the upload modal.
  const wantsCvUpload = searchParams.get('intent') === 'upload_cv';

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      navigate(wantsCvUpload ? '/profile?intent=upload_cv' : '/profile');
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-panel">
        <h2>Migration Assistant</h2>
        <p className="text-muted">Sign in to your account</p>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleLogin} className="auth-form">
          <div className="form-group">
            <label>Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required 
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required 
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary mb-2">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        <div className="text-center text-sm text-muted">
          Don't have an account? <Link to={wantsCvUpload ? '/signup?intent=upload_cv' : '/signup'} style={{color: 'var(--color-primary)', fontWeight: 600}}>Create one</Link>
        </div>
      </div>
    </div>
  );
}
