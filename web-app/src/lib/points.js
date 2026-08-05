// Point tables for the Australian skilled-migration points test.
//
// `point_australia` columns are integers, so age / english / education /
// partnerSkills are persisted as points, while overseasExp and ausExp are
// persisted as raw *years* — that is what Profile writes and what Discover and
// FormsHub read back. Keeping those two units straight is the whole reason this
// module exists.
//
// Every band carries a stable `id` so a <select> can never confuse two bands
// that happen to be worth the same number of points.

export const ELIGIBILITY_THRESHOLD = 65;
export const MAX_WORK_EXPERIENCE_POINTS = 20;
export const STATE_NOMINATION_POINTS = 5;

export const AGE_BANDS = [
  { id: 'unset', label: 'Select your age group', points: 0, placeholder: true },
  { id: '18_24', label: '18 - 24 years', points: 25, minAge: 18, maxAge: 24 },
  { id: '25_32', label: '25 - 32 years', points: 30, minAge: 25, maxAge: 32 },
  { id: '33_39', label: '33 - 39 years', points: 25, minAge: 33, maxAge: 39 },
  { id: '40_44', label: '40 - 44 years', points: 15, minAge: 40, maxAge: 44 },
  { id: '45_plus', label: '45 years and over', points: 0, minAge: 45, maxAge: Infinity },
];

export const ENGLISH_BANDS = [
  { id: 'competent', label: 'Competent', points: 0 },
  { id: 'proficient', label: 'Proficient', points: 10 },
  { id: 'superior', label: 'Superior', points: 20 },
];

// `minYears` is the lower bound of each band and the value written back to the
// years column when the user picks that band.
export const OVERSEAS_EXP_BANDS = [
  { id: 'lt3', label: 'Less than 3 years', points: 0, minYears: 0 },
  { id: '3_4', label: '3 - 4 years', points: 5, minYears: 3 },
  { id: '5_7', label: '5 - 7 years', points: 10, minYears: 5 },
  { id: '8_plus', label: '8 years or more', points: 15, minYears: 8 },
];

export const AUS_EXP_BANDS = [
  { id: 'lt1', label: 'Less than 1 year', points: 0, minYears: 0 },
  { id: '1_2', label: '1 - 2 years', points: 5, minYears: 1 },
  { id: '3_4', label: '3 - 4 years', points: 10, minYears: 3 },
  { id: '5_7', label: '5 - 7 years', points: 15, minYears: 5 },
  { id: '8_plus', label: '8 years or more', points: 20, minYears: 8 },
];

// The official points test lists "diploma/trade qualification completed in
// Australia" and "qualification recognised by the assessing authority" as two
// rows worth 10 points each. They are merged here because the integer column
// cannot tell them apart on reload, and the distinction changes no total.
export const EDUCATION_BANDS = [
  { id: 'none', label: 'None', points: 0 },
  { id: 'doctorate', label: 'Doctorate from an Australian or recognised institution', points: 20 },
  { id: 'bachelor_masters', label: 'Bachelor or Masters from an Australian or recognised institution', points: 15 },
  { id: 'diploma_or_award', label: 'Diploma or trade qualification in Australia, or other recognised award', points: 10 },
  { id: 'lesser', label: 'Lesser qualification recognised by an assessing authority', points: 5 },
];

// Same merge as above: "single / partner is an Australian citizen or PR" and
// "partner has competent English and a positive skills assessment" are both
// worth 10 points and are indistinguishable once stored.
export const PARTNER_SKILLS_BANDS = [
  { id: 'none', label: 'Not applicable', points: 0 },
  {
    id: 'single_or_skilled_partner',
    label: 'Single, partner is an Australian citizen/PR, or partner has competent English and a skills assessment',
    points: 10,
  },
  { id: 'partner_english', label: 'Partner has competent English (no skills assessment)', points: 5 },
];

export function optionLabel(band) {
  return band.placeholder ? band.label : `${band.label} (${band.points} pts)`;
}

export function pointsForBandId(bands, id) {
  return bands.find((band) => band.id === id)?.points ?? 0;
}

/**
 * First band worth `points`. Safe only because every table above has unique
 * point values — that is what makes a reload land on the band the user picked.
 */
export function bandIdForPoints(bands, points) {
  const target = Number(points) || 0;
  return (bands.find((band) => band.points === target) ?? bands[0]).id;
}

export function bandIdForYears(bands, years) {
  const value = Number(years) || 0;
  let match = bands[0];
  for (const band of bands) {
    if (value >= band.minYears) match = band;
  }
  return match.id;
}

export function yearsForBandId(bands, id) {
  return bands.find((band) => band.id === id)?.minYears ?? 0;
}

export function ageFromDob(dob) {
  if (!dob) return null;
  const birthDate = new Date(dob);
  if (Number.isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDelta = today.getMonth() - birthDate.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export function ageBandIdForAge(age) {
  if (age === null || age === undefined) return 'unset';
  const match = AGE_BANDS.find(
    (band) => !band.placeholder && age >= band.minAge && age <= band.maxAge,
  );
  return match?.id ?? 'unset';
}

/**
 * Date of birth is the unambiguous source; stored points are only a fallback
 * for profiles saved before a DOB existed.
 */
export function ageBandIdFromProfile(dob, storedPoints) {
  const age = ageFromDob(dob);
  if (age !== null) return ageBandIdForAge(age);
  return bandIdForPoints(AGE_BANDS, storedPoints);
}

export function workExperiencePoints(overseasYears, ausYears) {
  const overseas = pointsForBandId(
    OVERSEAS_EXP_BANDS,
    bandIdForYears(OVERSEAS_EXP_BANDS, overseasYears),
  );
  const aus = pointsForBandId(AUS_EXP_BANDS, bandIdForYears(AUS_EXP_BANDS, ausYears));
  return Math.min(overseas + aus, MAX_WORK_EXPERIENCE_POINTS);
}

/** Total for the calculator's band-id form state. */
export function totalPointsFromForm(form) {
  let points = 0;
  points += pointsForBandId(AGE_BANDS, form.ageBand);
  points += pointsForBandId(ENGLISH_BANDS, form.englishBand);
  points += pointsForBandId(EDUCATION_BANDS, form.educationBand);
  points += pointsForBandId(PARTNER_SKILLS_BANDS, form.partnerSkillsBand);

  if (form.specialistEdu) points += 10;
  if (form.ausStudy) points += 5;
  if (form.professionalYear) points += 5;
  if (form.ccl) points += 5;
  if (form.regionalStudy) points += 5;
  if (form.stateNomination) points += STATE_NOMINATION_POINTS;

  points += workExperiencePoints(form.overseasExpYears, form.ausExpYears);
  return points;
}
