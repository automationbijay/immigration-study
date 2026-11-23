import PageLink from './components/ui/PageLink';
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, NavLink, matchPath, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { supabase } from './lib/supabase';
import { ProfileProvider } from './lib/ProfileContext';
import PageTransition from './components/ui/PageTransition';
import SiteNav from './components/ui/SiteNav';
import SiteFooter from './components/ui/SiteFooter';

const NotFound = lazy(() => import('./pages/NotFound'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Profile = lazy(() => import('./pages/Profile'));
const Home = lazy(() => import('./pages/Home'));
const Discover = lazy(() => import('./pages/Discover'));
const Calculator = lazy(() => import('./pages/Calculator'));
const FormsHub = lazy(() => import('./pages/FormsHub'));
const VisasHub = lazy(() => import('./pages/VisasHub'));
const CanadaFSWCalculator = lazy(() => import('./pages/CanadaFSWCalculator'));
const CanadaCRSCalculator = lazy(() => import('./pages/CanadaCRSCalculator'));
const ToolsHub = lazy(() => import('./pages/ToolsHub'));
const Landing = lazy(() => import('./pages/Landing'));
const AnzscoTool = lazy(() => import('./pages/AnzscoTool'));
const UniversityTool = lazy(() => import('./pages/UniversityTool'));
const About = lazy(() => import('./pages/info/About'));
const Faq = lazy(() => import('./pages/info/Faq'));
const Contact = lazy(() => import('./pages/info/Contact'));
const Privacy = lazy(() => import('./pages/info/Privacy'));
const Terms = lazy(() => import('./pages/info/Terms'));
const Disclaimer = lazy(() => import('./pages/info/Disclaimer'));
import { User, Home as HomeIcon, Compass, MessageSquare } from 'lucide-react';
import { SkeletonPage } from './components/ui/Skeleton';
import * as Sentry from '@sentry/react';
import './index.css';

const NAV_ITEMS = [
  { to: '/home', label: 'Home', icon: HomeIcon },
  { to: '/discover', label: 'Discover', icon: Compass },
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/contact', label: 'Feedback', icon: MessageSquare },
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
        <PageLink as={NavLink} key={to} to={to} className="nav-item">
          <Icon className="inline-icon" aria-hidden="true" />
          <span>{label}</span>
        </PageLink>
      ))}
    </nav>
  );
}

// Start each new page at the top, unless the link targets an in-page anchor.
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }
    // Pages load lazily, so the target may not exist yet: retry briefly.
    let frame;
    let tries = 0;
    const seek = () => {
      const target = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (target) target.scrollIntoView({ block: 'start' });
      else if (tries++ < 60) frame = requestAnimationFrame(seek);
    };
    seek();
    return () => cancelAnimationFrame(frame);
  }, [pathname, hash]);
  return null;
}

function AnimatedRoutes({ session }) {
  const location = useLocation();
  const wantsCvUpload = new URLSearchParams(location.search).get('intent') === 'upload_cv';
  const signedInDestination = wantsCvUpload ? '/profile?intent=upload_cv' : '/home';
  const legacyFeedbackLink = ['#collaborate', '#report-mistake'].includes(location.hash);
  const feedbackDestination = { pathname: '/contact', search: location.search, hash: location.hash };
  const landingDestination = location.hash === '#start'
    ? { pathname: '/landing', search: location.search, hash: location.hash }
    : '/home';
  const landingPage = <PageTransition><Landing session={session} /></PageTransition>;
  const landingRoute = legacyFeedbackLink ? <Navigate to={feedbackDestination} replace /> : landingPage;
  return (
    <AnimatePresence mode="wait">
      <Suspense key={location.pathname} fallback={<PageTransition><SkeletonPage lines={3} label="Loading page..." /></PageTransition>}>
        <Routes location={location}>
          <Route path="/login" element={session ? <Navigate to={signedInDestination} replace /> : <PageTransition><Login /></PageTransition>} />
          <Route path="/signup" element={session ? <Navigate to={signedInDestination} replace /> : <PageTransition><Signup /></PageTransition>} />
          <Route path="/profile" element={session ? <PageTransition><Profile session={session} /></PageTransition> : <Navigate to="/login" />} />
          <Route path="/discover" element={<PageTransition><Discover session={session} /></PageTransition>} />
          <Route path="/australia-point-calculator" element={<PageTransition><Calculator session={session} /></PageTransition>} />
          <Route path="/forms" element={<PageTransition><FormsHub session={session} /></PageTransition>} />
          <Route path="/visas" element={<PageTransition><VisasHub session={session} /></PageTransition>} />
          <Route path="/forms/canada-fsw" element={<PageTransition><CanadaFSWCalculator session={session} /></PageTransition>} />
          <Route path="/forms/canada-crs" element={<PageTransition><CanadaCRSCalculator session={session} /></PageTransition>} />
          <Route path="/tools" element={<PageTransition><ToolsHub /></PageTransition>} />
          <Route path="/tools/anzsco" element={<PageTransition><AnzscoTool session={session} /></PageTransition>} />
          <Route path="/tools/university" element={<PageTransition><UniversityTool /></PageTransition>} />
          <Route path="/home" element={session ? <PageTransition><Home session={session} /></PageTransition> : <Navigate to="/login" />} />
          <Route path="/about" element={<PageTransition><About session={session} /></PageTransition>} />
          <Route path="/faq" element={<PageTransition><Faq /></PageTransition>} />
          <Route path="/contact" element={<PageTransition><Contact /></PageTransition>} />
          <Route path="/privacy" element={<PageTransition><Privacy /></PageTransition>} />
          <Route path="/terms" element={<PageTransition><Terms /></PageTransition>} />
          <Route path="/disclaimer" element={<PageTransition><Disclaimer /></PageTransition>} />
          <Route path="/landing" element={landingRoute} />
          <Route path="/" element={session && !legacyFeedbackLink ? <Navigate to={landingDestination} replace /> : landingRoute} />
          <Route path="*" element={<PageTransition><NotFound session={session} /></PageTransition>} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}

function RouteErrorFallback() {
  return (
    <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
      <h2 style={{ marginBottom: '0.5rem' }}>Something went wrong</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        This page hit an unexpected error. Reloading usually fixes it.
      </p>
      <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
        Reload
      </button>
    </div>
  );
}

// Keyed by pathname so navigating away from a crashed page (via BottomNav,
// which lives outside this boundary) remounts a fresh boundary instead of
// staying stuck on the fallback.
function MainContent({ session }) {
  const location = useLocation();
  return (
    <main id="main-content" className="main-content" tabIndex={-1}>
      <Sentry.ErrorBoundary key={location.pathname} fallback={RouteErrorFallback}>
        <AnimatedRoutes session={session} />
      </Sentry.ErrorBoundary>
    </main>
  );
}

function App() {
  return <Router><AppContent /></Router>;
}

function AppContent() {
  const { pathname } = useLocation();
  const [session, setSession] = useState(null);
  const hasBottomNav = Boolean(session && !matchPath('/', pathname) && !matchPath('/landing', pathname));
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installDismissed, setInstallDismissed] = useState(() => {
    try { return sessionStorage.getItem('installBannerDismissed') === '1'; } catch { return false; }
  });

  const dismissInstallBanner = () => {
    setInstallDismissed(true);
    try { sessionStorage.setItem('installBannerDismissed', '1'); } catch { /* ignore */ }
  };

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

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  if (loading) {
    return (
      <div className="app-layout">
        <main id="main-content" className="main-content" tabIndex={-1}>
          <SkeletonPage lines={3} label="Loading" />
        </main>
      </div>
    );
  }

  return (
    <ProfileProvider session={session}>
      <div className={`app-layout${hasBottomNav ? ' has-nav' : ''}`}>
        {isOffline && (
          <div style={{ backgroundColor: 'var(--danger)', color: 'white', padding: '8px', textAlign: 'center', fontSize: '14px', zIndex: 100 }}>
            You are currently offline. Some features may be unavailable.
          </div>
        )}
        {deferredPrompt && !isOffline && !installDismissed && (
          <div style={{ backgroundColor: 'var(--primary)', color: 'white', padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', fontSize: '14px', zIndex: 100 }}>
            <span>Install Skilled Migration Assistant for a better experience</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={handleInstallApp}
                style={{ backgroundColor: 'white', color: 'var(--primary)', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Install
              </button>
              <button
                onClick={dismissInstallBanner}
                aria-label="Dismiss install banner"
                style={{ background: 'transparent', color: 'white', border: 'none', cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: '4px 8px' }}
              >
                ×
              </button>
            </div>
          </div>
        )}

        <a className="skip-link" href="#main-content">Skip to content</a>
        <ScrollToTop />
        <SiteNav session={session} hasBottomNav={hasBottomNav} />
        <MainContent session={session} />
        <SiteFooter />

        {hasBottomNav && <BottomNav />}
      </div>
    </ProfileProvider>
  );
}

export default App;
