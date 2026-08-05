import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import Calculator from './pages/Calculator';
import { LogOut, User, Calculator as CalcIcon } from 'lucide-react';
import './index.css';

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
    return <div className="loading-screen">Loading...</div>;
  }

  return (
    <Router>
      <div className="background-elements">
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
      </div>
      
      <div className="app-layout">
        {session && (
          <nav className="sidebar glass-panel">
            <div className="brand">
              <h2>Migrate<br/>Assistant</h2>
            </div>
            <ul className="nav-links">
              <li>
                <Link to="/profile"><User className="inline-icon"/> Profile</Link>
              </li>
              <li>
                <Link to="/calculator"><CalcIcon className="inline-icon"/> Calculator</Link>
              </li>
            </ul>
            <div className="nav-footer">
              <button onClick={handleLogout} className="btn-logout">
                <LogOut className="inline-icon"/> Logout
              </button>
            </div>
          </nav>
        )}

        <main className="main-content">
          <Routes>
            <Route path="/login" element={!session ? <Login /> : <Navigate to="/profile" />} />
            <Route path="/signup" element={!session ? <Signup /> : <Navigate to="/profile" />} />
            <Route path="/profile" element={session ? <Profile session={session} /> : <Navigate to="/login" />} />
            <Route path="/calculator" element={session ? <Calculator session={session} /> : <Navigate to="/login" />} />
            <Route path="/" element={<Navigate to={session ? "/profile" : "/login"} />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
