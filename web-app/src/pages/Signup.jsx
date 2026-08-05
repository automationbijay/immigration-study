import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Carried from Landing's "Upload CV" CTA; Profile opens the upload modal.
  const wantsCvUpload = searchParams.get('intent') === 'upload_cv';
  const loginPath = wantsCvUpload ? '/login?intent=upload_cv' : '/login';

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage('Signup successful! You can now log in.');
      setTimeout(() => navigate(loginPath), 2000);
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-panel">
        <h2>Create Account</h2>
        <p className="text-muted">
          {wantsCvUpload
            ? 'Create an account to upload your CV'
            : 'Start tracking your visa eligibility'}
        </p>
        
        {error && <div className="error-message">{error}</div>}
        {message && <div className="success-message">{message}</div>}
        
        <form onSubmit={handleSignup} className="auth-form">
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
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        
        <div className="text-center text-sm text-muted">
          Already have an account? <Link to={loginPath} style={{color: 'var(--color-primary)', fontWeight: 600}}>Log in</Link>
        </div>
      </div>
    </div>
  );
}
