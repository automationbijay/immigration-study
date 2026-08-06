import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, NavLink } from 'react-router-dom';
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
import AnzscoTool from './pages/AnzscoTool';
import { User, Home as HomeIcon, Compass } from 'lucide-react';
import { SkeletonPage } from './components/ui/Skeleton';
import './index.css';

const NAV_ITEMS = [
  { to: '/home', label: 'Home', icon: HomeIcon },
  { to: '/discover', label: 'Discover', icon: Compass },
  { to: '/profile', label: 'Profile', icon: User },
];

/**
 * NavLink rather than Link: it adds `aria-current="page"` and the `active`
 * class itself, so "which tab am I on" is exposed to assistive tech instead of
 * being implied by colour alone.
 */
function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} className="nav-item">
          <Icon className="inline-icon" aria-hidden="true" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
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

  if (loading) {
    return (
      <div className="app-layout">
        <main className="main-content">
          <SkeletonPage lines={3} label="Loading" />
        </main>
      </div>
    );
  }

  return (
    <Router>
      <div className={`app-layout ${session ? 'has-nav' : ''}`}>
        <main className="main-content">
          <Routes>
            <Route path="/login" element={!session ? <Login /> : <Navigate to="/home" />} />
            <Route path="/signup" element={!session ? <Signup /> : <Navigate to="/home" />} />
            <Route path="/profile" element={session ? <Profile session={session} /> : <Navigate to="/login" />} />
            <Route path="/discover" element={session ? <Discover session={session} /> : <Navigate to="/login" />} />
            <Route path="/australia-point-calculator" element={session ? <Calculator session={session} /> : <Navigate to="/login" />} />
            <Route path="/forms" element={session ? <FormsHub session={session} /> : <Navigate to="/login" />} />
            <Route path="/news" element={session ? <NewsHub session={session} /> : <Navigate to="/login" />} />
            <Route path="/tools/anzsco" element={session ? <AnzscoTool /> : <Navigate to="/login" />} />
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
