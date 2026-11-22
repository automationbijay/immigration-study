import { useEffect, useId, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertTriangle, Handshake, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import PageLink from './ui/PageLink';

const MODES = {
  mistake: {
    label: 'Report a mistake',
    icon: AlertTriangle,
    intro: 'Spotted a wrong points value, an outdated rule or a broken page? Tell us and we’ll fix it.',
    categories: ['Points calculation', 'Visa or pathway information', 'CV import', 'Broken link or page', 'Something else'],
    categoryLabel: 'What kind of mistake?',
    messageLabel: 'What’s wrong?',
    messageHint: 'What did you see, and what should it say? A link to the official source helps.',
    submit: 'Send report',
    thanks: 'Thanks for the report. We check every one, and it helps everyone who uses the site.',
  },
  collaborate: {
    label: 'Collaborate with us',
    icon: Handshake,
    intro: 'Migration agent, education provider, developer or just full of ideas? Let’s make the service better together.',
    categories: ['Migration agent or consultant', 'University or education provider', 'Data or content partnership', 'Developer or volunteer', 'General feedback or idea'],
    categoryLabel: 'How would you like to work with us?',
    messageLabel: 'Your message',
    messageHint: 'Tell us a little about yourself and what you have in mind.',
    submit: 'Send message',
    thanks: 'Thanks for reaching out. We’ll reply to the email you gave us.',
  },
};

const EMPTY = { category: '', name: '', email: '', organisation: '', page_url: '', message: '', website: '' };
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function validate(kind, form) {
  const errors = {};
  if (!form.category) errors.category = 'Choose an option.';
  if (form.message.trim().length < 10) errors.message = 'Please write at least 10 characters.';
  if (form.message.length > 5000) errors.message = 'Please keep it under 5,000 characters.';
  if (kind === 'collaborate' && !form.name.trim()) errors.name = 'Tell us your name.';
  if (kind === 'collaborate' && !form.email.trim()) errors.email = 'We need an email to reply to.';
  if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) errors.email = 'Enter a valid email address.';
  return errors;
}

/**
 * Mistake reports and collaboration/contact requests, stored in
 * public.feedback_submissions (insert-only for clients).
 */
export default function FeedbackForm({ initialKind = 'mistake', kind: controlledKind, onKindChange, id }) {
  const { pathname, hash } = useLocation();
  const uid = useId();
  const [ownKind, setOwnKind] = useState(initialKind);
  // Controlled when the page passes `kind` (e.g. Landing's buttons), otherwise self-managed.
  const kind = controlledKind ?? ownKind;
  const setKind = (next) => { setOwnKind(next); onKindChange?.(next); };
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const mode = MODES[kind];

  // Arriving via a link such as /#collaborate (footer, FAQ) opens that tab.
  useEffect(() => {
    if (hash === '#collaborate') setKind('collaborate');
    if (hash === '#report-mistake') setKind('mistake');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash]);

  const switchKind = (next) => {
    setKind(next);
    setErrors({});
    if (status !== 'sending') setStatus('idle');
    setForm((prev) => ({ ...prev, category: '' }));
  };

  const update = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    // Honeypot: real people never see or fill this field.
    if (form.website) { setStatus('sent'); return; }
    const found = validate(kind, form);
    setErrors(found);
    if (Object.keys(found).length) {
      document.getElementById(`${uid}-${Object.keys(found)[0]}`)?.focus();
      return;
    }

    setStatus('sending');
    const clean = (v) => (v && v.trim()) || null;
    const { error } = await supabase.from('feedback_submissions').insert({
      kind,
      category: form.category,
      name: clean(form.name),
      email: clean(form.email),
      organisation: kind === 'collaborate' ? clean(form.organisation) : null,
      page_url: kind === 'mistake' ? clean(form.page_url) || pathname : pathname,
      message: form.message.trim(),
    });

    if (error) {
      console.error('Feedback submission failed:', error);
      setStatus('error');
      return;
    }
    setStatus('sent');
    setForm(EMPTY);
  };

  const field = (name) => ({
    id: `${uid}-${name}`,
    name,
    value: form[name],
    onChange: update,
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? `${uid}-${name}-error` : undefined,
  });
  const errorFor = (name) => errors[name] && (
    <p id={`${uid}-${name}-error`} className="feedback-error">{errors[name]}</p>
  );

  return (
    <div className="feedback" id={id}>
      <div className="feedback-tabs" role="tablist" aria-label="What would you like to do?">
        {Object.entries(MODES).map(([key, { label, icon: Icon }]) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`${uid}-tab-${key}`}
            aria-selected={kind === key}
            aria-controls={`${uid}-panel`}
            className="feedback-tab"
            onClick={() => switchKind(key)}
          >
            <Icon size={17} aria-hidden="true" /> {label}
          </button>
        ))}
      </div>

      <div className="feedback-panel" role="tabpanel" id={`${uid}-panel`} aria-labelledby={`${uid}-tab-${kind}`}>
        {status === 'sent' ? (
          <div className="feedback-sent" role="status">
            <CheckCircle2 size={28} aria-hidden="true" />
            <p>{mode.thanks}</p>
            <button type="button" className="btn-secondary btn-compact" onClick={() => setStatus('idle')}>Send another</button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <p className="feedback-intro">{mode.intro}</p>

            <div className="form-group">
              <label htmlFor={`${uid}-category`}>{mode.categoryLabel}</label>
              <select {...field('category')} required>
                <option value="">Choose one</option>
                {mode.categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {errorFor('category')}
            </div>

            {kind === 'mistake' && (
              <div className="form-group">
                <label htmlFor={`${uid}-page_url`}>Where did you see it? <span className="feedback-optional">optional</span></label>
                <input type="text" {...field('page_url')} placeholder="Page name or link" maxLength={500} />
              </div>
            )}

            <div className="form-group">
              <label htmlFor={`${uid}-message`}>{mode.messageLabel}</label>
              <textarea {...field('message')} rows={5} maxLength={5000} required />
              <p className="field-hint">{mode.messageHint}</p>
              {errorFor('message')}
            </div>

            <div className="feedback-row">
              <div className="form-group">
                <label htmlFor={`${uid}-name`}>Name {kind === 'mistake' && <span className="feedback-optional">optional</span>}</label>
                <input type="text" {...field('name')} autoComplete="name" maxLength={120} required={kind === 'collaborate'} />
                {errorFor('name')}
              </div>
              <div className="form-group">
                <label htmlFor={`${uid}-email`}>Email {kind === 'mistake' && <span className="feedback-optional">optional, for a reply</span>}</label>
                <input type="email" {...field('email')} autoComplete="email" maxLength={254} required={kind === 'collaborate'} />
                {errorFor('email')}
              </div>
            </div>

            {kind === 'collaborate' && (
              <div className="form-group">
                <label htmlFor={`${uid}-organisation`}>Organisation <span className="feedback-optional">optional</span></label>
                <input type="text" {...field('organisation')} autoComplete="organization" maxLength={160} />
              </div>
            )}

            {/* Honeypot for bots: hidden from people and assistive tech. */}
            <div className="feedback-hp" aria-hidden="true">
              <label htmlFor={`${uid}-website`}>Website</label>
              <input type="text" id={`${uid}-website`} name="website" value={form.website} onChange={update} tabIndex={-1} autoComplete="off" />
            </div>

            {status === 'error' && (
              <p className="feedback-error feedback-error-banner" role="alert">
                We couldn’t send that just now. Your message is still here. Please try again in a moment.
              </p>
            )}

            <div className="feedback-actions">
              <button type="submit" className="btn-primary btn-compact" disabled={status === 'sending'}>
                {status === 'sending' ? 'Sending…' : mode.submit}
              </button>
              <p className="feedback-privacy">
                We only use your details to reply. See our <PageLink to="/privacy">privacy policy</PageLink>.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
