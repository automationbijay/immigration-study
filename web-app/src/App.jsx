import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import NotFound from './pages/NotFound';
import { supabase } from './lib/supabase';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import Home from './pages/Home';
import Discover from './pages/Discover';
import Calculator from './pages/Calculator';
import FormsHub from './pages/FormsHub';
import NewsHub from './pages/NewsHub';
import Landing from './pages/Landing';
import { User, Home as HomeIcon, Compass, LogOut } from 'lucide-react';
import './index.css';

function BottomNav() {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <nav className="bottom-nav">
      <Link to="/home" className={`nav-item ${currentPath === '/home' ? 'active' : ''}`}>
        <HomeIcon className="inline-icon"/> 
        <span>Home</span>
      </Link>
      <Link to="/discover" className={`nav-item ${currentPath === '/discover' ? 'active' : ''}`}>
        <Compass className="inline-icon"/> 
        <span>Discover</span>
      </Link>
      <Link to="/profile" className={`nav-item ${currentPath === '/profile' ? 'active' : ''}`}>
        <User className="inline-icon"/> 
        <span>Profile</span>
      </Link>
    </nav>
  );
}

function TopHeader() {
  return (
    <header className="top-header">
      <h1>Migration Assistant</h1>
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
        {session && <TopHeader />}

        <main className="main-content">
          <Routes>
            <Route path="/login" element={!session ? <Login /> : <Navigate to="/home" />} />
            <Route path="/signup" element={!session ? <Signup /> : <Navigate to="/home" />} />
            <Route path="/profile" element={session ? <Profile session={session} /> : <Navigate to="/login" />} />
            <Route path="/discover" element={session ? <Discover session={session} /> : <Navigate to="/login" />} />
            <Route path="/australia-point-calculator" element={session ? <Calculator session={session} /> : <Navigate to="/login" />} />
            <Route path="/forms" element={session ? <FormsHub session={session} /> : <Navigate to="/login" />} />
            <Route path="/news" element={session ? <NewsHub session={session} /> : <Navigate to="/login" />} />
            <Route path="/home" element={session ? <Home session={session} /> : <Navigate to="/login" />} />
            <Route path="/" element={<Landing session={session} />} />
            <Route path="*" element={<NotFound session={session} />} />
          </Routes>
        </main>
        
        {session && <BottomNav />}
      </div>
    </Router>
  );
}

export default App;
