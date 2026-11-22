import { useState } from 'react';
import { Calculator, Leaf, Scale, Map, Briefcase, GraduationCap, ArrowRight, FileText, Sparkles, Check, AlertTriangle, Handshake } from 'lucide-react';
import PageLink from '../components/ui/PageLink';
import FeedbackForm from '../components/FeedbackForm';
import './landing.css';

const steps = [
  { title: 'Upload your CV.', body: ' A PDF resume is all you need. No long forms to start.' },
  { title: 'AI reads it and asks.', body: ' It fills in your education, work and personal details, then asks only about what your CV leaves out.' },
  { title: 'See your points.', body: ' Compare Australian and Canadian pathways from one profile, and fix anything the AI got wrong.' },
];

const tiles = [
  { eyebrow: 'Australia · 189 / 190 / 491', title: 'Australian points test', blurb: 'Age, English, work and study, scored the way Home Affairs does.', to: '/australia-point-calculator', tone: 'sand', icon: Calculator },
  { eyebrow: 'Canada · Express Entry', title: 'Federal Skilled Worker', blurb: 'Check the 67-point pass mark before you build a profile.', to: '/forms/canada-fsw', tone: 'sage', icon: Leaf },
  { eyebrow: 'Canada · Official tool', title: 'CRS score', blurb: 'Where to find the ranking score that decides who gets invited.', to: '/forms/canada-crs', tone: 'sky', icon: Scale },
  { eyebrow: 'Both countries', title: 'Compare pathways', blurb: 'Points-tested visas side by side, with links to the official pages.', to: '/discover', tone: 'blush', icon: Map },
  { eyebrow: 'Lookup', title: 'Occupation finder', blurb: 'Find your ANZSCO code and the body that assesses your skills.', to: '/tools/anzsco', tone: 'wheat', icon: Briefcase },
  { eyebrow: 'Lookup', title: 'University directory', blurb: 'See how your qualification is likely to be recognised.', to: '/tools/university', tone: 'peach', icon: GraduationCap },
];

function HorizonArt() {
  return (
    <svg className="lp-horizon" viewBox="0 0 1200 260" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="lp-glow" cx="50%" cy="70%" r="45%">
          <stop offset="0%" stopColor="#f3c58f" stopOpacity=".75" />
          <stop offset="100%" stopColor="#f3c58f" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="250" y="0" width="700" height="260" fill="url(#lp-glow)" />
      <circle cx="600" cy="168" r="62" fill="#e59a5c" />
      {/* Flight path linking the two countries */}
      <path d="M210 120 Q600 -20 990 110" fill="none" stroke="#142036" strokeWidth="2" strokeDasharray="2 9" strokeLinecap="round" opacity=".45" />
      <path d="M982 100 l14 9 -16 4z" fill="#142036" opacity=".6" />
      {/* Left: red-earth outback */}
      <path d="M0 230 L0 196 Q60 186 120 192 L150 168 Q170 150 230 150 Q300 150 318 172 L340 194 Q420 200 520 214 L600 230Z" fill="#c4612b" />
      <path d="M150 168 Q170 150 230 150 Q300 150 318 172 Z" fill="#a44a18" opacity=".45" />
      <g fill="#56684a">
        <circle cx="70" cy="184" r="12" /><rect x="68" y="184" width="4" height="16" />
        <circle cx="420" cy="196" r="9" /><rect x="418" y="196" width="3" height="12" />
      </g>
      {/* Right: northern mountains and pines */}
      <path d="M600 230 L720 210 L810 120 L860 168 L930 86 L1030 196 L1100 170 L1200 200 L1200 230Z" fill="#1c2c47" />
      <path d="M930 86 L955 115 L940 112 L925 122 L912 108Z M810 120 L828 140 L812 138 L798 146 L796 136Z" fill="#f4ead8" />
      <g fill="#56684a">
        {[700, 735, 1060, 1095, 1140].map((x, i) => (
          <path key={x} d={`M${x} ${222 - (i % 2) * 6} l14 0 -7 -${34 + (i % 2) * 8}z`} />
        ))}
      </g>
      <rect x="0" y="228" width="1200" height="32" fill="#142036" />
      <rect x="0" y="234" width="1200" height="3" fill="#2a3d5e" />
    </svg>
  );
}

export default function Landing({ session }) {
  const [feedbackKind, setFeedbackKind] = useState('mistake');
  const cvTo = session ? '/profile?intent=upload_cv' : '/signup?intent=upload_cv';

  return (
    <div className="lp">

      <section className="lp-hero">
        <div className="lp-container">
          <p className="lp-eyebrow">Skilled migration, AI-assisted</p>
          <h1 className="lp-display">
            Upload your CV. Let AI do the <em>paperwork.</em>
          </h1>
          <p className="lp-lede">
            AI reads your resume, fills in your profile and asks you only about what&rsquo;s missing. Then you see your
            points for Australia and Canada, in plain numbers.
          </p>
          <div className="lp-cta-row">
            <PageLink to={cvTo} className="lp-btn lp-btn-primary">
              <Sparkles size={17} aria-hidden="true" /> Upload your CV
            </PageLink>
          </div>
          <p className="lp-manual">
            <span>Or answer the questions yourself:</span>
            <PageLink to="/australia-point-calculator" className="lp-btn lp-btn-ghost">
              Australia points <ArrowRight size={16} aria-hidden="true" />
            </PageLink>
            <PageLink to="/forms/canada-fsw" className="lp-btn lp-btn-ghost">
              Canada points <ArrowRight size={16} aria-hidden="true" />
            </PageLink>
          </p>
        </div>
        <HorizonArt />
      </section>

      <section className="lp-how" aria-labelledby="lp-how-title">
        <div className="lp-container lp-how-grid">
          <div>
            <p className="lp-eyebrow">How it works</p>
            <h2 id="lp-how-title" className="lp-display lp-h2">One upload. <em>A few questions.</em> Your points.</h2>
            <ol className="lp-steps">
              {steps.map(({ title, body }, i) => (
                <li key={title}>
                  <span className="lp-step-num">0{i + 1}</span>
                  <span><strong>{title}</strong>{body}</span>
                </li>
              ))}
            </ol>
            <PageLink to={cvTo} className="lp-btn lp-btn-primary">Upload your CV <ArrowRight size={17} aria-hidden="true" /></PageLink>
          </div>

          <figure className="lp-chat" aria-label="Example of the assistant asking about details missing from a CV">
            <div className="lp-chat-file">
              <FileText size={20} aria-hidden="true" />
              <span><strong>priya-sharma-cv.pdf</strong>Read just now</span>
              <Check size={18} aria-hidden="true" className="lp-chat-ok" />
            </div>
            <p className="lp-chat-found">Found: Master&rsquo;s degree · 6 years as a software engineer · lives in India</p>
            <div className="lp-chat-bubble lp-chat-ai">
              <span className="lp-chat-who"><Sparkles size={14} aria-hidden="true" /> Assistant</span>
              Your CV doesn&rsquo;t mention your date of birth. When were you born? Age is worth up to 30 points.
            </div>
            <div className="lp-chat-bubble lp-chat-you">14 March 1994</div>
            <div className="lp-chat-bubble lp-chat-ai">
              <span className="lp-chat-who"><Sparkles size={14} aria-hidden="true" /> Assistant</span>
              Thanks. Have you taken an English test such as IELTS or PTE?
            </div>
            <figcaption>Illustrative example</figcaption>
          </figure>
        </div>
      </section>

      <section className="lp-section" id="start" aria-labelledby="lp-start-title">
        <div className="lp-container">
          <div className="lp-section-head">
            <div>
              <p className="lp-eyebrow">Pick a starting point</p>
              <h2 id="lp-start-title" className="lp-display lp-h2">
                Six tools. One question:<br /><em>do you qualify?</em>
              </h2>
            </div>
            <p className="lp-section-note">
              Most people check more than one pathway. Start with a calculator, then use the lookups to fill in
              the details the official forms will ask for.
            </p>
          </div>

          <ul className="lp-tiles">
            {tiles.map(({ eyebrow, title, blurb, to, tone, icon: Icon }) => (
              <li key={to}>
                <PageLink to={to} className={`lp-tile lp-tone-${tone}`}>
                  <span className="lp-tile-eyebrow">{eyebrow}</span>
                  <span className="lp-tile-title">{title}</span>
                  <span className="lp-tile-foot">
                    <span className="lp-tile-blurb">{blurb}</span>
                    <span className="lp-tile-art" aria-hidden="true">
                      <span className="lp-tile-sun" />
                      <Icon size={34} strokeWidth={1.6} />
                    </span>
                  </span>
                </PageLink>
              </li>
            ))}
          </ul>
        </div>
      </section>


      <section className="lp-feedback" aria-labelledby="lp-feedback-title">
        <span id="report-mistake" className="lp-anchor" />
        <span id="collaborate" className="lp-anchor" />
        <div className="lp-container lp-feedback-grid">
          <div className="lp-feedback-copy">
            <p className="lp-eyebrow">Help us get it right</p>
            <h2 id="lp-feedback-title" className="lp-display lp-h2">Found a mistake? <em>Want to build this with us?</em></h2>
            <p>
              Migration rules change all the time, and a wrong number can cost someone a visa. If something looks off,
              tell us. If you&rsquo;re an agent, educator, developer or just have ideas, we&rsquo;d love to collaborate.
            </p>
            <div className="lp-feedback-buttons">
              <PageLink to="#report-mistake" className="lp-btn lp-btn-ghost" onClick={() => setFeedbackKind('mistake')}>
                <AlertTriangle size={16} aria-hidden="true" /> Report a mistake
              </PageLink>
              <PageLink to="#collaborate" className="lp-btn lp-btn-dark" onClick={() => setFeedbackKind('collaborate')}>
                <Handshake size={16} aria-hidden="true" /> Collaborate with us
              </PageLink>
            </div>
          </div>
          <FeedbackForm kind={feedbackKind} onKindChange={setFeedbackKind} />
        </div>
      </section>
    </div>
  );
}
