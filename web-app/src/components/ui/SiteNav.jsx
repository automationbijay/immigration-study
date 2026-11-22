import { NavLink } from 'react-router-dom';
import { Compass } from 'lucide-react';
import PageLink from './PageLink';

const LINKS = [
  { to: '/discover', label: 'Discover' },
  { to: '/forms', label: 'Calculators' },
  { to: '/visas', label: 'Visas' },
  { to: '/tools', label: 'Tools' },
];

/**
 * Floating navy pill shown at the top of every page. On narrow screens only
 * the brand and the account button remain; signed-in users get the bottom
 * nav there instead.
 */
export default function SiteNav({ session }) {
  return (
    <header className="site-nav-wrap">
      <nav className="site-nav" aria-label="Site">
        <PageLink to="/" className="site-brand">
          <span className="site-brand-mark"><Compass size={18} aria-hidden="true" /></span>
          <span className="site-brand-name">Skilled Migration Assistant</span>
        </PageLink>
        <ul className="site-nav-links">
          {(session ? [...LINKS, { to: '/profile', label: 'Profile' }] : LINKS).map(({ to, label }) => (
            <li key={to}><PageLink as={NavLink} to={to}>{label}</PageLink></li>
          ))}
        </ul>
        <PageLink to={session ? '/home' : '/login'} className="site-nav-account">
          {session ? 'Dashboard' : 'Log in'}
        </PageLink>
      </nav>
    </header>
  );
}
