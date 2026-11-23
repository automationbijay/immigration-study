import { Calculator, Leaf, Scale, Map, Briefcase, GraduationCap, ArrowRight, FileText, Sparkles, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import PageLink from '../components/ui/PageLink';
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
  { eyebrow: 'Skilled migration', title: 'Australia Occupation Explorer', blurb: 'Find your ANZSCO code, assessing authority, and past invitation cutoffs.', to: '/tools/anzsco', tone: 'wheat', icon: Briefcase },
  { eyebrow: 'Lookup', title: 'University directory', blurb: 'See how your qualification is likely to be recognised.', to: '/tools/university', tone: 'peach', icon: GraduationCap },
];

function UnionJack({ id, w, h }) {
  return (
    <g>
      <clipPath id={id}><rect width={w} height={h} /></clipPath>
      <g clipPath={`url(#${id})`}>
        <rect width={w} height={h} fill="#1c3f94" />
        <path d={`M0 0L${w} ${h}M${w} 0L0 ${h}`} stroke="#fff" strokeWidth={h * 0.2} />
        <path d={`M0 0L${w} ${h}M${w} 0L0 ${h}`} stroke="#c8102e" strokeWidth={h * 0.07} />
        <path d={`M0 ${h / 2}H${w}M${w / 2} 0V${h}`} stroke="#fff" strokeWidth={h * 0.32} />
        <path d={`M0 ${h / 2}H${w}M${w / 2} 0V${h}`} stroke="#c8102e" strokeWidth={h * 0.18} />
      </g>
    </g>
  );
}

const FLAG_POLES = [
  { x: 760, top: 96 },
  { x: 870, top: 116 },
  { x: 980, top: 96 },
  { x: 1090, top: 116 },
];

const SUN_RAYS = Array.from({ length: 16 }, (_, i) => i * 22.5);

function Cloud({ x, y, s = 1, className }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className={className}>
        <path d="M0 22 Q0 8 14 9 Q18 -4 34 0 Q46 -6 54 6 Q70 4 70 18 Q70 26 60 26 H8 Q0 26 0 22Z" fill="#fffaf0" opacity=".85" />
        <path d="M8 26 H60 Q70 26 70 18" fill="none" stroke="#e7d3b3" strokeWidth="2" strokeLinecap="round" />
      </g>
    </g>
  );
}

function Bird({ x, y, delay }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path className="lp-h-bird" style={{ animationDelay: delay }} d="M-8 0 Q-4 -5 0 0 Q4 -5 8 0" fill="none" stroke="#142036" strokeWidth="1.8" strokeLinecap="round" />
    </g>
  );
}

function HorizonArt() {
  return (
    <svg className="lp-horizon" viewBox="0 0 1200 260" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="lp-glow" cx="50%" cy="70%" r="45%">
          <stop offset="0%" stopColor="#f3c58f" stopOpacity=".8" />
          <stop offset="100%" stopColor="#f3c58f" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="lp-sun" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f0b070" />
          <stop offset="100%" stopColor="#d9783f" />
        </linearGradient>
        <linearGradient id="lp-fold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#000" stopOpacity="0" />
          <stop offset="25%" stopColor="#fff" stopOpacity=".18" />
          <stop offset="50%" stopColor="#000" stopOpacity=".12" />
          <stop offset="75%" stopColor="#fff" stopOpacity=".16" />
          <stop offset="100%" stopColor="#000" stopOpacity=".1" />
        </linearGradient>
      </defs>

      {/* Sky: glow, slowly turning sun rays, rising sun */}
      <rect x="200" y="0" width="800" height="260" fill="url(#lp-glow)" />
      <g className="lp-h-rays" opacity=".35">
        {SUN_RAYS.map((deg) => (
          <rect key={deg} x="477" y="70" width="6" height="40" rx="3" fill="#e59a5c" transform={`rotate(${deg} 480 190)`} />
        ))}
      </g>
      <circle cx="480" cy="190" r="78" fill="none" stroke="#e59a5c" strokeOpacity=".25" strokeWidth="2" strokeDasharray="3 8" />
      <circle cx="480" cy="190" r="62" fill="url(#lp-sun)" />
      <path d="M430 168 H530 M422 182 H538 M420 196 H540" stroke="#f4ead8" strokeOpacity=".35" strokeWidth="3" strokeLinecap="round" />

      <Cloud x={60} y={30} s={0.9} className="lp-h-cloud" />
      <Cloud x={600} y={8} s={0.7} className="lp-h-cloud lp-h-cloud-slow" />
      <Cloud x={1080} y={40} s={0.8} className="lp-h-cloud" />

      <Bird x={340} y={40} delay="0s" />
      <Bird x={362} y={30} delay=".3s" />
      <Bird x={380} y={46} delay=".6s" />

      {/* Distant hills */}
      <path d="M-1200 228 L-1200 205 Q0 205 60 200 Q170 172 300 196 Q400 212 470 228Z" fill="#e3cfae" />
      <path d="M380 228 Q520 200 660 214 Q720 220 760 228Z" fill="#e3cfae" opacity=".8" />

      {/* Destination landmarks, faint silhouettes behind the flags */}
      <g fill="#142036" opacity=".1">
        {/* Opera House */}
        <path d="M700 228 L700 216 Q712 186 734 180 Q730 200 738 216 Q748 192 768 190 Q762 206 768 218 Q776 204 792 204 L796 228Z" />
        {/* CN Tower */}
        <path d="M934 228 L938 92 L936 84 Q930 82 930 76 Q930 70 942 70 L942 22 L944 22 L944 70 Q956 70 956 76 Q956 82 950 84 L948 92 L952 228Z" />
        {/* Big Ben */}
        <path d="M1028 228 V120 L1034 112 V96 L1042 70 L1050 96 V112 L1056 120 V228Z" />
        {/* Brandenburg Gate */}
        <path d="M1118 228 V186 H1112 V176 L1150 166 L1188 176 V186 H1182 V228 H1174 V186 H1164 V228 H1156 V186 H1144 V228 H1136 V186 H1126 V228Z" />
      </g>

      {/* Left: a person with a backpack and suitcase, waving at the plane */}
      <g>
        <rect x="88" y="196" width="36" height="32" rx="4" fill="#c4612b" />
        <rect x="98" y="188" width="16" height="9" rx="3" fill="none" stroke="#a44a18" strokeWidth="3" />
        <rect x="88" y="206" width="36" height="3" fill="#a44a18" opacity=".6" />
        <rect x="104" y="214" width="10" height="7" rx="1.5" fill="#f4ead8" opacity=".8" />
        <rect x="142" y="104" width="30" height="58" rx="10" fill="#a44a18" />
        <rect x="156" y="112" width="40" height="64" rx="12" fill="#e59a5c" />
        <path d="M164 174 h12 l-1 54 h-12z M180 174 h12 l3 54 h-12z" fill="#142036" />
        <rect x="158" y="226" width="20" height="4" rx="2" fill="#142036" />
        <rect x="182" y="226" width="22" height="4" rx="2" fill="#142036" />
        <g className="lp-h-arm">
          <path d="M190 122 L226 104" stroke="#e59a5c" strokeWidth="11" strokeLinecap="round" />
          <circle cx="229" cy="102" r="6" fill="#d9a077" />
        </g>
        <path d="M162 124 L152 160" stroke="#e59a5c" strokeWidth="11" strokeLinecap="round" />
        <rect x="170" y="100" width="12" height="14" fill="#d9a077" />
        <circle cx="178" cy="90" r="17" fill="#d9a077" />
        <path d="M161 88 Q164 70 180 71 Q196 72 195 88 Q186 80 161 88Z" fill="#142036" />
      </g>

      {/* The CV, read and ticked, floating off on the journey */}
      <g transform="translate(250 50) rotate(-8)">
        <g className="lp-h-float">
          <path d="M0 0 H22 L30 8 V40 H0Z" fill="#fffaf0" stroke="#142036" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M22 0 V8 H30" fill="none" stroke="#142036" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M6 14 H22 M6 20 H24 M6 26 H16" stroke="#142036" strokeOpacity=".45" strokeWidth="2" strokeLinecap="round" />
          <circle cx="28" cy="38" r="9" fill="#5fc9bd" stroke="#142036" strokeWidth="1.8" />
          <path d="M24 38 l3 3 l5 -6" fill="none" stroke="#142036" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </g>

      {/* Journey toward the destination countries */}
      <path className="lp-h-trail" d="M290 88 Q480 -10 720 70" fill="none" stroke="#142036" strokeWidth="2" strokeDasharray="2 9" strokeLinecap="round" opacity=".45" />
      <path d="M730 74 l-17 -5 3 15z" fill="#142036" opacity=".6" />

      {/* Plane on the journey, with a contrail */}
      <g transform="translate(482 38) rotate(-2)">
        <g className="lp-h-plane">
          <path d="M-40 -2 H-90 M-40 3 H-76" stroke="#fffaf0" strokeWidth="3" strokeLinecap="round" opacity=".9" />
          <g stroke="#142036" strokeWidth="2" strokeLinejoin="round" fill="#f4ead8">
            <polygon points="-26,-3 -36,-18 -27,-18 -12,-3" />
            <polygon points="-6,3 -22,26 -10,26 16,3" />
            <path d="M-34 0 Q-34 -8 -20 -8 L24 -8 Q40 -6 42 0 Q40 6 24 7 L-20 7 Q-34 7 -34 0Z" />
            <g stroke="none" fill="#1c3f94">
              <circle cx="-12" cy="-1" r="2.2" /><circle cx="-4" cy="-1" r="2.2" /><circle cx="4" cy="-1" r="2.2" /><circle cx="12" cy="-1" r="2.2" />
              <path d="M24 -6 Q34 -5 38 -1 L24 -1Z" />
            </g>
          </g>
        </g>
      </g>

      {/* Jobs: briefcase */}
      <g>
        <path d="M303 200 v-7 a4 4 0 0 1 4 -4 h14 a4 4 0 0 1 4 4 v7" fill="none" stroke="#5a3515" strokeWidth="4" />
        <rect x="288" y="199" width="52" height="29" rx="5" fill="#8a5a2b" />
        <rect x="288" y="211" width="52" height="3" fill="#5a3515" opacity=".6" />
        <rect x="310" y="208" width="8" height="9" rx="2" fill="#f3c58f" stroke="#5a3515" strokeWidth="1.5" />
      </g>

      {/* Money: banknote and coins, with a glint */}
      <g>
        <g transform="rotate(-6 600 214)">
          <rect x="574" y="200" width="56" height="28" rx="3" fill="#56684a" />
          <rect x="579" y="205" width="46" height="18" rx="2" fill="none" stroke="#dfe8d2" strokeWidth="1.5" />
          <circle cx="602" cy="214" r="7" fill="#dfe8d2" />
          <text x="602" y="218.5" textAnchor="middle" fontSize="11" fontWeight="700" fill="#56684a" fontFamily="Georgia, serif">$</text>
        </g>
        <g fill="#e8b23c" stroke="#a87a1c" strokeWidth="1.5">
          <ellipse cx="662" cy="224" rx="18" ry="5" /><rect x="644" y="214" width="36" height="10" stroke="none" />
          <ellipse cx="662" cy="214" rx="18" ry="5" /><rect x="644" y="204" width="36" height="10" stroke="none" />
          <ellipse cx="662" cy="204" rx="18" ry="5" />
          <path d="M644 204 V224 M680 204 V224" fill="none" />
        </g>
        <circle cx="700" cy="216" r="11" fill="#e8b23c" stroke="#a87a1c" strokeWidth="1.5" />
        <text x="700" y="220.5" textAnchor="middle" fontSize="12" fontWeight="700" fill="#a87a1c" fontFamily="Georgia, serif">$</text>
        <g fill="#fffaf0">
          <path className="lp-h-glint" d="M672 186 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2z" />
          <path className="lp-h-glint lp-h-glint-late" d="M712 198 l1.5 4 4 1.5 -4 1.5 -1.5 4 -1.5 -4 -4 -1.5 4 -1.5z" />
        </g>
      </g>

      {/* Right: Australia, Canada, UK, Germany */}
      {FLAG_POLES.map(({ x, top }) => (
        <g key={x}>
          <line x1={x} y1={top - 2} x2={x} y2="228" stroke="#142036" strokeWidth="3" strokeLinecap="round" />
          <circle cx={x} cy={top - 5} r="4" fill="#e8b23c" stroke="#142036" strokeWidth="1.5" />
        </g>
      ))}

      {/* Australia */}
      <g transform={`translate(${FLAG_POLES[0].x + 1.5} ${FLAG_POLES[0].top})`}>
        <g className="lp-h-flag">
          <rect width="84" height="56" fill="#1c3f94" />
          <UnionJack id="lp-flag-au" w={42} h={28} />
          <g fill="#fff">
            <circle cx="21" cy="44" r="4" />
            <circle cx="62" cy="10" r="2.5" /><circle cx="70" cy="24" r="2.5" />
            <circle cx="54" cy="26" r="2.5" /><circle cx="62" cy="44" r="2.5" /><circle cx="67" cy="35" r="1.6" />
          </g>
          <rect width="84" height="56" fill="url(#lp-fold)" />
          <rect width="84" height="56" fill="none" stroke="#142036" strokeOpacity=".25" />
        </g>
      </g>

      {/* Canada */}
      <g transform={`translate(${FLAG_POLES[1].x + 1.5} ${FLAG_POLES[1].top})`}>
        <g className="lp-h-flag" style={{ animationDelay: '-.8s' }}>
          <rect width="84" height="56" fill="#fff" />
          <rect width="21" height="56" fill="#d52b1e" />
          <rect x="63" width="21" height="56" fill="#d52b1e" />
          <polygon points="42,10 45,19 51,16 49,27 55,29 46,35 47,42 42,40 37,42 38,35 29,29 35,27 33,16 39,19" fill="#d52b1e" />
          <rect width="84" height="56" fill="url(#lp-fold)" />
          <rect width="84" height="56" fill="none" stroke="#142036" strokeOpacity=".25" />
        </g>
      </g>

      {/* United Kingdom */}
      <g transform={`translate(${FLAG_POLES[2].x + 1.5} ${FLAG_POLES[2].top})`}>
        <g className="lp-h-flag" style={{ animationDelay: '-1.6s' }}>
          <UnionJack id="lp-flag-uk" w={84} h={56} />
          <rect width="84" height="56" fill="url(#lp-fold)" />
          <rect width="84" height="56" fill="none" stroke="#142036" strokeOpacity=".25" />
        </g>
      </g>

      {/* Germany */}
      <g transform={`translate(${FLAG_POLES[3].x + 1.5} ${FLAG_POLES[3].top})`}>
        <g className="lp-h-flag" style={{ animationDelay: '-2.4s' }}>
          <rect width="84" height="19" fill="#111" />
          <rect y="18.5" width="84" height="19" fill="#dd0000" />
          <rect y="37" width="84" height="19" fill="#ffce00" />
          <rect width="84" height="56" fill="url(#lp-fold)" />
          <rect width="84" height="56" fill="none" stroke="#142036" strokeOpacity=".25" />
        </g>
      </g>

      {/* Ground: grass tufts and a road with lane markings */}
      <g stroke="#7e8f6a" strokeWidth="2" strokeLinecap="round" fill="none">
        <path d="M60 228 l-3 -8 M64 228 v-10 M68 228 l3 -8" />
        <path d="M250 228 l-3 -7 M254 228 v-9 M258 228 l3 -7" />
        <path d="M540 228 l-3 -7 M544 228 v-9 M548 228 l3 -7" />
        <path d="M820 228 l-3 -7 M824 228 v-9 M828 228 l3 -7" />
      </g>
      <rect x="-1200" y="228" width="3600" height="32" fill="#142036" />
      <rect x="-1200" y="234" width="3600" height="3" fill="#2a3d5e" />
      <path className="lp-h-road" d="M-1200 247 H2400" stroke="#f3c58f" strokeOpacity=".5" strokeWidth="2.5" strokeDasharray="22 18" />
    </svg>
  );
}

const AU_BREAKDOWN = [
  { label: 'Age', pts: 30, max: 30 },
  { label: 'English', pts: 20, max: 20 },
  { label: 'Work', pts: 15, max: 20 },
  { label: 'Education', pts: 15, max: 20 },
  { label: 'Other', pts: 5, max: 10 },
];

function useCountUp(target, duration = 1400) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setValue(target);
      return undefined;
    }
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * (1 - (1 - t) ** 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function HeroPreview() {
  const au = useCountUp(85);
  const ca = useCountUp(72);

  return (
    <div className="lp-preview" aria-hidden="true">
      <div className="lp-preview-cv">
        <div className="lp-preview-cv-head">
          <FileText size={18} />
          <span><strong>priya-sharma-cv.pdf</strong>Read by AI</span>
          <Check size={16} className="lp-chat-ok" />
        </div>
        <div className="lp-preview-pills">
          <span>Master&rsquo;s</span><span>6 yrs engineering</span><span>IELTS 8</span>
        </div>
      </div>

      <div className="lp-preview-card">
        <div className="lp-preview-row">
          <div>
            <span className="lp-preview-label">Australia · 189</span>
            <span className="lp-preview-score">{au}<small> pts</small></span>
          </div>
          <span className="lp-preview-badge"><Check size={13} /> Eligible</span>
        </div>
        <ul className="lp-preview-bars">
          {AU_BREAKDOWN.map(({ label, pts, max }) => (
            <li key={label}>
              <span>{label}</span>
              <span className="lp-preview-track"><span style={{ '--w': `${(pts / max) * 100}%` }} /></span>
              <b>{pts}</b>
            </li>
          ))}
        </ul>
        <div className="lp-preview-divider" />
        <div className="lp-preview-row">
          <div>
            <span className="lp-preview-label">Canada · FSW</span>
            <span className="lp-preview-score lp-preview-score-sm">{ca}<small> / 100</small></span>
          </div>
          <span className="lp-preview-badge"><Check size={13} /> Passes 67</span>
        </div>
        <div className="lp-preview-pass">
          <span className="lp-preview-pass-fill" style={{ '--w': '72%' }} />
          <span className="lp-preview-pass-mark" style={{ left: '67%' }} />
        </div>
        <span className="lp-preview-note">Illustrative example</span>
      </div>

      <span className="lp-preview-sticker">~20 min<br />of forms<br />saved</span>
    </div>
  );
}

export default function Landing({ session }) {
  const cvTo = session ? '/profile?intent=upload_cv' : '/signup?intent=upload_cv';

  return (
    <div className="lp">

      <section className="lp-hero">
        <div className="lp-container lp-hero-grid">
          <div className="lp-hero-copy">
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
          <HeroPreview />
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
    </div>
  );
}
