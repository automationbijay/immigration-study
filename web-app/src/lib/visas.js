// Visa pathway catalogue and matching engine.
//
// Product rule: the app shows people what IS open to them. It never lists the
// pathways they fail. When nothing qualifies yet, `nearestPathway` returns the
// closest one plus the concrete actions that would unlock it, so the answer is
// still a route forward rather than a rejection.
//
// MVP covers Australia only. `COUNTRIES` carries the roadmap so the UI can show
// what is coming without pretending it already works.

import {
  ELIGIBILITY_THRESHOLD,
  ENGLISH_BANDS,
  EDUCATION_BANDS,
  PARTNER_SKILLS_BANDS,
  OVERSEAS_EXP_BANDS,
  AUS_EXP_BANDS,
  AGE_BANDS,
  basePointsFromForm,
  pointsForBandId,
  ageFromDob,
  optionLabel,
// Explicit extension keeps this module runnable under plain node for tests.
} from './points.js';

// Points-tested skilled visas close at 45.
const SKILLED_AGE_LIMIT = 45;
// Temporary Graduate runs to 50.
const GRADUATE_AGE_LIMIT = 50;

export const VISAS = [
  {
    id: '189',
    subclass: '189',
    name: 'Skilled Independent',
    kind: 'Permanent residence',
    pointsTested: true,
    nominationPoints: 0,
    tagline: 'Live and work anywhere in Australia, permanently, with no sponsor or state tie.',
    highlights: [
      'Permanent residence from the day it is granted',
      'No employer, state or family sponsor required',
      'Include your partner and dependent children',
      'Work and live in any part of Australia',
    ],
    nextSteps: [
      'Get a positive skills assessment from your occupation’s assessing authority',
      'Submit an Expression of Interest in SkillSelect',
      'Wait to be invited to apply',
    ],
  },
  {
    id: '190',
    subclass: '190',
    name: 'Skilled Nominated',
    kind: 'Permanent residence',
    pointsTested: true,
    nominationPoints: 5,
    tagline: 'Permanent residence with a state or territory backing your application.',
    highlights: [
      'Permanent residence from the day it is granted',
      'State nomination adds 5 points to your score',
      'Include your partner and dependent children',
      'Commit to living in your nominating state, usually for two years',
    ],
    nextSteps: [
      'Get a positive skills assessment from your occupation’s assessing authority',
      'Check which states currently nominate your occupation',
      'Apply for state nomination, then submit your Expression of Interest',
    ],
  },
  {
    id: '491',
    subclass: '491',
    name: 'Skilled Work Regional',
    kind: 'Provisional, leads to PR',
    pointsTested: true,
    nominationPoints: 15,
    tagline: 'The widest-opening door: regional nomination adds 15 points, and leads to PR.',
    highlights: [
      'Adds 15 points — the largest boost of any pathway',
      'Live, work and study in designated regional Australia for 5 years',
      'Leads to permanent residence via subclass 191 after 3 years',
      'Include your partner and dependent children',
    ],
    nextSteps: [
      'Get a positive skills assessment from your occupation’s assessing authority',
      'Identify regions nominating your occupation, or an eligible relative who can sponsor you',
      'Apply for nomination, then submit your Expression of Interest',
    ],
  },
  {
    id: '485',
    subclass: '485',
    name: 'Temporary Graduate',
    kind: 'Temporary, 18 months to 3 years',
    pointsTested: false,
    nominationPoints: 0,
    tagline: 'Stay on after studying in Australia and build the local experience that scores points.',
    highlights: [
      'No points test and no sponsor needed',
      'Full work rights while you build Australian experience',
      'Australian work experience later adds up to 20 points',
      'A common stepping stone to 189, 190 or 491',
    ],
    nextSteps: [
      'Confirm you meet the Australian Study Requirement',
      'Hold or apply for an eligible substantive visa',
      'Apply within 6 months of finishing your course',
    ],
  },
];

// Two-letter codes rather than flag emoji: Windows ships no regional-indicator
// glyphs, so emoji flags degrade to bare letter pairs there. A designed chip
// renders identically everywhere.
export const COUNTRIES = [
  { id: 'au', code: 'AU', name: 'Australia', status: 'live' },
  { id: 'ca', code: 'CA', name: 'Canada', status: 'planned' },
  { id: 'nz', code: 'NZ', name: 'New Zealand', status: 'planned' },
  { id: 'uk', code: 'UK', name: 'United Kingdom', status: 'planned' },
  { id: 'de', code: 'DE', name: 'Germany', status: 'planned' },
];

/**
 * Facts a pathway is judged against, beyond the points score itself.
 */
export function buildContext(form, profileRow, basicRow) {
  const age = ageFromDob(basicRow?.dob);
  return {
    age,
    // Every band except the "unset" placeholder means a real age was resolved.
    hasAge: age !== null || form.ageBand !== 'unset',
    ageForLimit: age ?? ageFromBand(form.ageBand),
    hasOccupation: Boolean(profileRow?.experienceAnzsco || profileRow?.educationAnzsco),
    occupation: profileRow?.experienceAnzsco || profileRow?.educationAnzsco || null,
    ausStudy: Boolean(form.ausStudy),
  };
}

function ageFromBand(bandId) {
  const band = AGE_BANDS.find((b) => b.id === bandId && !b.placeholder);
  return band ? band.minAge : null;
}

function meetsThreshold(visa, ctx) {
  const age = ctx.ageForLimit;
  if (visa.id === '485') {
    return ctx.ausStudy && (age === null || age < GRADUATE_AGE_LIMIT);
  }
  // Points-tested skilled visas need an assessable occupation and an age under 45.
  if (age !== null && age >= SKILLED_AGE_LIMIT) return false;
  return ctx.hasOccupation;
}

/**
 * Score every pathway. Returns entries sorted best-first, each carrying the
 * points that pathway would give and how far short it falls.
 */
export function evaluatePathways(form, ctx) {
  const base = basePointsFromForm(form);

  return VISAS.map((visa) => {
    const points = visa.pointsTested ? base + visa.nominationPoints : null;
    const thresholdMet = meetsThreshold(visa, ctx);
    const gap = visa.pointsTested ? Math.max(0, ELIGIBILITY_THRESHOLD - points) : 0;

    return {
      visa,
      points,
      gap,
      thresholdMet,
      eligible: thresholdMet && gap === 0,
      // A pathway blocked only by an unmet age limit can never be unlocked by
      // effort, so it must not be offered as a goal.
      reachable: thresholdMet || (visa.pointsTested && !isAgeBlocked(ctx)),
    };
  }).sort(byBestFirst);
}

function isAgeBlocked(ctx) {
  return ctx.ageForLimit !== null && ctx.ageForLimit >= SKILLED_AGE_LIMIT;
}

function byBestFirst(a, b) {
  if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
  // Among eligible pathways, prefer permanent residence, then the higher score.
  if (a.eligible) {
    const permanence = Number(b.visa.kind.startsWith('Permanent')) - Number(a.visa.kind.startsWith('Permanent'));
    if (permanence !== 0) return permanence;
    return (b.points ?? 0) - (a.points ?? 0);
  }
  return a.gap - b.gap;
}

export function eligiblePathways(form, ctx) {
  return evaluatePathways(form, ctx).filter((p) => p.eligible);
}

/**
 * The closest pathway that effort could actually open, for people who do not
 * qualify for anything yet. Returns null when no pathway is reachable, so the
 * UI can fall back to a roadmap message rather than an impossible goal.
 */
export function nearestPathway(form, ctx) {
  const candidates = evaluatePathways(form, ctx).filter((p) => !p.eligible && p.reachable && p.visa.pointsTested);
  return candidates[0] ?? null;
}

// ---------------------------------------------------------------------------
// Opportunities
// ---------------------------------------------------------------------------

/**
 * Candidate improvements. Each carries the patch that would apply it, so the
 * gain is measured by re-scoring the whole profile rather than hardcoding a
 * number — that keeps the 20-point work-experience cap honest.
 */
function candidates(form) {
  const list = [];

  for (const band of ENGLISH_BANDS) {
    if (band.points > pointsForBandId(ENGLISH_BANDS, form.englishBand)) {
      list.push({
        id: `english-${band.id}`,
        label: `Reach ${band.label} English`,
        detail: band.id === 'superior' ? 'IELTS 8 or PTE 79 in every band' : 'IELTS 7 or PTE 65 in every band',
        patch: { englishBand: band.id },
        area: 'English',
      });
    }
  }

  for (const band of EDUCATION_BANDS) {
    if (band.points > pointsForBandId(EDUCATION_BANDS, form.educationBand)) {
      list.push({
        id: `education-${band.id}`,
        label: band.label,
        detail: 'Have your qualification assessed',
        patch: { educationBand: band.id },
        area: 'Education',
      });
    }
  }

  for (const band of AUS_EXP_BANDS) {
    if (band.minYears > (Number(form.ausExpYears) || 0)) {
      list.push({
        id: `aus-exp-${band.id}`,
        label: `Work ${band.label.toLowerCase()} in Australia`,
        detail: 'Skilled employment in your nominated occupation',
        patch: { ausExpYears: band.minYears },
        area: 'Experience',
      });
    }
  }

  for (const band of OVERSEAS_EXP_BANDS) {
    if (band.minYears > (Number(form.overseasExpYears) || 0)) {
      list.push({
        id: `overseas-exp-${band.id}`,
        label: `Reach ${band.label.toLowerCase()} of overseas experience`,
        detail: 'Skilled employment in your nominated occupation',
        patch: { overseasExpYears: band.minYears },
        area: 'Experience',
      });
    }
  }

  for (const band of PARTNER_SKILLS_BANDS) {
    if (band.points > pointsForBandId(PARTNER_SKILLS_BANDS, form.partnerSkillsBand)) {
      list.push({
        id: `partner-${band.id}`,
        label: 'Claim partner skill points',
        detail: band.label,
        patch: { partnerSkillsBand: band.id },
        area: 'Partner',
      });
    }
  }

  const flags = [
    { key: 'specialistEdu', label: 'Complete a specialist qualification', detail: 'STEM Masters by research or PhD in Australia', area: 'Education' },
    { key: 'ausStudy', label: 'Meet the Australian Study Requirement', detail: 'At least 2 academic years of study in Australia', area: 'Education' },
    { key: 'professionalYear', label: 'Complete a Professional Year', detail: 'A 44-week program in Australia', area: 'Experience' },
    { key: 'ccl', label: 'Pass the CCL test', detail: 'Credentialled Community Language accreditation', area: 'Language' },
    { key: 'regionalStudy', label: 'Study in regional Australia', detail: 'At least 2 academic years in a designated area', area: 'Education' },
  ];

  for (const flag of flags) {
    if (!form[flag.key]) {
      list.push({
        id: flag.key,
        label: flag.label,
        detail: flag.detail,
        patch: { [flag.key]: true },
        area: flag.area,
      });
    }
  }

  return list;
}

/**
 * Ranked ways to add points, largest gain first. `limit` keeps the home screen
 * to a readable shortlist.
 */
export function opportunities(form, limit = 4) {
  const current = basePointsFromForm(form);

  return candidates(form)
    .map((c) => ({ ...c, gain: basePointsFromForm({ ...form, ...c.patch }) - current }))
    .filter((c) => c.gain > 0)
    .sort((a, b) => b.gain - a.gain || a.label.localeCompare(b.label))
    .slice(0, limit);
}

/**
 * The smallest set of single actions that would each close a pathway's gap on
 * their own. Used by the "unlock it with any one of" list.
 */
export function unlockOptions(form, gap, limit = 3) {
  return opportunities(form, Infinity)
    .filter((o) => o.gain >= gap)
    .sort((a, b) => a.gain - b.gain)
    .slice(0, limit);
}

/**
 * Which parts of the profile still need filling in. Drives the completeness
 * meter, and doubles as the empty state for brand-new accounts.
 */
export function profileGaps(form, ctx) {
  return [
    { id: 'dob', label: 'Add your date of birth', done: ctx.hasAge, to: '/profile?section=basic' },
    { id: 'occupation', label: 'Select your occupation', done: ctx.hasOccupation, to: '/profile?section=experience' },
    { id: 'english', label: 'Add your English test scores', done: form.englishBand !== 'competent', to: '/profile?section=language' },
    { id: 'education', label: 'Add your highest qualification', done: form.educationBand !== 'none', to: '/profile?section=education' },
    {
      id: 'experience',
      label: 'Add your work experience',
      done: (Number(form.overseasExpYears) || 0) > 0 || (Number(form.ausExpYears) || 0) > 0,
      to: '/profile?section=experience',
    },
  ];
}

export function completeness(gaps) {
  const done = gaps.filter((g) => g.done).length;
  return Math.round((done / gaps.length) * 100);
}

export { optionLabel };
