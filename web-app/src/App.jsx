import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import NotFound from './pages/NotFound';
import { supabase } from './lib/supabase';
import { ProfileProvider } from './lib/ProfileContext';
import PageTransition from './components/ui/PageTransition';

import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import Home from './pages/Home';
import Discover from './pages/Discover';
import Calculator from './pages/Calculator';
import FormsHub from './pages/FormsHub';
import ToolsHub from './pages/ToolsHub';
import Landing from './pages/Landing';
import AnzscoTool from './pages/AnzscoTool';
import UniversityTool from './pages/UniversityTool';
import { User, Home as HomeIcon, Compass } from 'lucide-react';
import { SkeletonPage } from './components/ui/Skeleton';
import * as Sentry from '@sentry/react';
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

function AnimatedRoutes({ session }) {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={!session ? <PageTransition><Login /></PageTransition> : <Navigate to="/home" />} />
        <Route path="/signup" element={!session ? <PageTransition><Signup /></PageTransition> : <Navigate to="/home" />} />
        <Route path="/profile" element={session ? <PageTransition><Profile session={session} /></PageTransition> : <Navigate to="/login" />} />
        <Route path="/discover" element={session ? <PageTransition><Discover session={session} /></PageTransition> : <Navigate to="/login" />} />
        <Route path="/australia-point-calculator" element={session ? <PageTransition><Calculator session={session} /></PageTransition> : <Navigate to="/login" />} />
        <Route path="/forms" element={session ? <PageTransition><FormsHub session={session} /></PageTransition> : <Navigate to="/login" />} />
        <Route path="/tools" element={session ? <PageTransition><ToolsHub /></PageTransition> : <Navigate to="/login" />} />
        <Route path="/tools/anzsco" element={session ? <PageTransition><AnzscoTool /></PageTransition> : <Navigate to="/login" />} />
        <Route path="/tools/university" element={session ? <PageTransition><UniversityTool /></PageTransition> : <Navigate to="/login" />} />
        <Route path="/home" element={session ? <PageTransition><Home session={session} /></PageTransition> : <Navigate to="/login" />} />
        <Route path="/" element={<PageTransition><Landing session={session} /></PageTransition>} />
        <Route path="*" element={<PageTransition><NotFound session={session} /></PageTransition>} />
      </Routes>
    </AnimatePresence>
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
      <ProfileProvider session={session}>
        <div className={`app-layout ${session ? 'has-nav' : ''}`}>
          <main className="main-content">
            <AnimatedRoutes session={session} />
          </main>
          
          {session && <BottomNav />}
        </div>
      </ProfileProvider>
    </Router>
  );
}

export default App;
