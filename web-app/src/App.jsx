import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import Calculator from './pages/Calculator';
import { User, Calculator as CalcIcon, LogOut } from 'lucide-react';
import './index.css';

function BottomNav() {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <nav className="bottom-nav">
      <Link to="/profile" className={`nav-item ${currentPath === '/profile' ? 'active' : ''}`}>
        <User className="inline-icon"/> 
        <span>Profile</span>
      </Link>
      <Link to="/calculator" className={`nav-item ${currentPath === '/calculator' ? 'active' : ''}`}>
        <CalcIcon className="inline-icon"/> 
        <span>Calculator</span>
      </Link>
    </nav>
  );
}

function TopHeader({ onLogout }) {
  return (
    <header className="top-header">
      <h1>Migration Assistant</h1>
      {onLogout && (
        <button onClick={onLogout} style={{ position: 'absolute', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-secondary)' }}>
          <LogOut size={20} />
        </button>
      )}
    </header>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--color-primary)'}}>Loading...</div>;
  }

  return (
    <Router>
      <div className="app-layout">
        {session && <TopHeader onLogout={handleLogout} />}

        <main className="main-content">
          <Routes>
            <Route path="/login" element={!session ? <Login /> : <Navigate to="/profile" />} />
            <Route path="/signup" element={!session ? <Signup /> : <Navigate to="/profile" />} />
            <Route path="/profile" element={session ? <Profile session={session} /> : <Navigate to="/login" />} />
            <Route path="/calculator" element={session ? <Calculator session={session} /> : <Navigate to="/login" />} />
            <Route path="/" element={<Navigate to={session ? "/profile" : "/login"} />} />
          </Routes>
        </main>
        
        {session && <BottomNav />}
      </div>
    </Router>
  );
}

export default App;
