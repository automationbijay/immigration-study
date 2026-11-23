import { Compass } from 'lucide-react';
import PageLink from './PageLink';
import { SITE_NAME } from '../../lib/site';

const COLUMNS = [
  ['Calculators', [['/australia-point-calculator', 'Australia points test'], ['/forms/canada-fsw', 'Canada FSW 67 points'], ['/forms/canada-crs', 'Canada CRS']]],
  ['Explore', [['/landing', 'Landing page'], ['/discover', 'Compare pathways'], ['/visas', 'Australian visas'], ['/tools', 'Lookup tools']]],
  ['Company', [['/about', 'About us'], ['/faq', 'FAQ'], ['/contact', 'Feedback'], ['/contact#collaborate', 'Collaborate with us'], ['/contact#report-mistake', 'Report a mistake']]],
  ['Legal', [['/privacy', 'Privacy policy'], ['/terms', 'Terms of use'], ['/disclaimer', 'Disclaimer']]],
];

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-grid">
          <div className="site-footer-about">
            <PageLink to="/" className="site-brand">
              <span className="site-brand-mark"><Compass size={18} aria-hidden="true" /></span>
              <span className="site-brand-name">{SITE_NAME}</span>
            </PageLink>
            <p>Upload your CV and let AI do the reading. Plain-language points estimates for skilled migration to Australia and Canada.</p>
          </div>
          {COLUMNS.map(([heading, links]) => (
            <nav key={heading} aria-label={heading}>
              <p className="site-footer-head">{heading}</p>
              <ul>
                {links.map(([to, label]) => <li key={to}><PageLink to={to}>{label}</PageLink></li>)}
              </ul>
            </nav>
          ))}
        </div>
        <p className="site-footer-legal">
          General information only, not migration advice. We are not registered migration agents or licensed
          immigration consultants. Always check{' '}
          <a href="https://immi.homeaffairs.gov.au">immi.homeaffairs.gov.au</a> and{' '}
          <a href="https://www.canada.ca/en/immigration-refugees-citizenship.html">canada.ca</a>.{' '}
          <PageLink to="/disclaimer">Read the full disclaimer</PageLink>.
        </p>
        <p className="site-footer-copy">© {new Date().getFullYear()} {SITE_NAME}</p>
      </div>
    </footer>
  );
}
