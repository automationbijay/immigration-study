// Live database round-trip check.
//
// Signs in as a throwaway test account, writes one entry per profile section
// exactly the way the app does, reads each back, checks the derived points,
// and finally clears the account's data with clear_user_data().
//
// Usage (from web-app/):  node scripts/db-roundtrip.mjs
// Needs .env.local (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) and
// .env.test.local (TEST_EMAIL, TEST_PASSWORD). NEVER point this at a real user:
// it deletes all of the account's data at the end.
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
for (const file of ['.env.local', '.env.test.local']) {
  if (!fs.existsSync(file)) { console.error(`Missing ${file}`); process.exit(2); }
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const results = [];
const check = (name, ok, detail = '', needsMigration = false) => {
  results.push({ name, ok, needsMigration });
  console.log(`${ok ? 'PASS' : needsMigration ? 'TODO' : 'FAIL'}  ${name}${ok ? '' : `  ->  ${detail}`}`);
};
const must = (res, what) => { if (res.error) throw new Error(`${what}: ${res.error.message}`); return res.data; };
const points = async () => must(await supabase.from('point_australia').select('*').eq('id', uid).single(), 'read point_australia');

const { data: auth, error: authError } = await supabase.auth.signInWithPassword({ email: env.TEST_EMAIL, password: env.TEST_PASSWORD });
if (authError) { console.error('Sign-in failed:', authError.message); process.exit(2); }
const uid = auth.user.id;
console.log(`Signed in as test user ${uid.slice(0, 8)}…\n`);

try {
  // Start from a clean slate so earlier runs cannot mask a failure.
  must(await supabase.rpc('clear_user_data'), 'clear_user_data (start)');
  must(await supabase.from('point_australia').insert({ id: uid }), 'recreate point_australia');
  must(await supabase.from('profile_basic').insert({ id: uid }), 'recreate profile_basic');

  const fresh = await points();
  check('new points row starts unanswered (english/education NULL)', fresh.english === null && fresh.education === null,
    `english=${fresh.english}, education=${fresh.education}`, true);

  // Profile > Basic details
  must(await supabase.from('profile_basic').upsert({ id: uid, name: 'Roundtrip Test', dob: '1994-03-14', country: 'India', location: 'Pune', marital_status: 'Single', phone_no: '000', email: env.TEST_EMAIL, updated_at: new Date() }), 'save basic');
  const basic = must(await supabase.from('profile_basic').select('*').eq('id', uid).single(), 'read basic');
  check('basic details save and read back', basic.name === 'Roundtrip Test' && basic.dob === '1994-03-14' && basic.location === 'Pune', JSON.stringify(basic));

  // Australian calculator save
  must(await supabase.from('point_australia').upsert({ id: uid, age: 30, english: 10, overseasExp: 5, ausExp: 0, education: 15, specialistEdu: false, ausStudy: true, professionalYear: false, ccl: false, regionalStudy: false, partnerSkills: 10 }), 'save calculator');
  let pa = await points();
  check('calculator answers save and read back', pa.age === 30 && pa.english === 10 && pa.overseasExp === 5 && pa.ausStudy === true && pa.partnerSkills === 10, JSON.stringify(pa));

  // Occupation (ANZSCO tool)
  must(await supabase.from('point_australia').upsert({ id: uid, experienceAnzsco: '261313' }), 'save occupation');
  must(await supabase.from('profile_job_classification').insert({ user_id: uid, anzsco_code: '261313', anzsco_title: 'Software Engineer' }), 'save job classification');
  pa = await points();
  const job = must(await supabase.from('profile_job_classification').select('anzsco_code').eq('user_id', uid).maybeSingle(), 'read job');
  check('occupation saves without wiping calculator answers', String(pa.experienceAnzsco) === '261313' && pa.english === 10 && job?.anzsco_code === '261313', JSON.stringify({ anzsco: pa.experienceAnzsco, english: pa.english }));

  // Profile > Language: IELTS 8 across the board is Superior (20 points) via triggers
  const ielts = must(await supabase.from('test_ielts').upsert({ user_id: uid, listening: 8, reading: 8, writing: 8, speaking: 8, overall: 8, test_date: '2024-05-01', updated_at: new Date() }).select(), 'save IELTS')[0];
  pa = await points();
  check('language test saves and updates English points (20)', pa.english === 20, `english=${pa.english}`);
  must(await supabase.from('test_ielts').delete().eq('id', ielts.id), 'delete IELTS');
  pa = await points();
  check('deleting the only test resets English points', pa.english === null, `english=${pa.english}`, true);

  // Profile > Education
  const edu = must(await supabase.from('profile_education').upsert({ user_id: uid, level: 'Doctorate', field_of_study: 'CS', country: 'India', start_date: '2015-01-01', end_date: '2019-12-01', updated_at: new Date() }).select(), 'save education')[0];
  const eduBack = must(await supabase.from('profile_education').select('*').eq('id', edu.id).single(), 'read education');
  check('education entry saves and reads back', eduBack.level === 'Doctorate' && eduBack.field_of_study === 'CS', JSON.stringify(eduBack));
  pa = await points();
  check('education entry updates education points (20)', pa.education === 20, `education=${pa.education}`, true);

  // Profile > Experience: 6 years overseas, ended a year ago
  const now = new Date();
  const ymd = (y) => new Date(now.getFullYear() - y, now.getMonth(), now.getDate()).toISOString().slice(0, 10);
  const exp = must(await supabase.from('profile_experience').upsert({ user_id: uid, company_name: 'Acme', role: 'Engineer', country: 'India', start_date: ymd(7), end_date: ymd(1) }).select(), 'save experience')[0];
  const expBack = must(await supabase.from('profile_experience').select('*').eq('id', exp.id).single(), 'read experience');
  check('work experience saves and reads back', expBack.company_name === 'Acme' && expBack.start_date === ymd(7), JSON.stringify(expBack));
  pa = await points();
  check('work experience updates overseas years (6)', pa.overseasExp === 6, `overseasExp=${pa.overseasExp}`, true);

  // Profile > Family
  const fam = must(await supabase.from('profile_family').upsert({ profile_id: uid, relation: 'Spouse', age: 30, gender: 'Female', highest_education: 'Bachelor', language_test_type: 'IELTS', language_overall_score: 7, citizenship_or_pr: 'No', current_country_of_residence: 'India', updated_at: new Date() }).select(), 'save family')[0];
  const famBack = must(await supabase.from('profile_family').select('*').eq('id', fam.id).single(), 'read family');
  check('family member saves and reads back', famBack.relation === 'Spouse' && Number(famBack.language_overall_score) === 7, JSON.stringify(famBack));

  // Canada FSW calculator
  must(await supabase.from('point_fsw67').upsert({ id: uid, user_id: uid, experience_points: 13, age_points: 12, education_points: 21, language_reading_points: 6, language_writing_points: 6, language_listening_points: 6, language_speaking_points: 6, arranged_employment_points: 0, adaptability_spouse_lang: 0, adaptability_past_study: 0, adaptability_spouse_study: 0, adaptability_past_work: 0, adaptability_spouse_work: 0, adaptability_arranged_emp: 0, adaptability_relative: 0, total_points: 70, is_eligible: true, updated_at: new Date().toISOString() }), 'save FSW');
  const fsw = must(await supabase.from('point_fsw67').select('*').eq('user_id', uid).maybeSingle(), 'read FSW');
  check('Canada FSW estimate saves and reads back', fsw?.total_points === 70 && fsw?.is_eligible === true, JSON.stringify(fsw));

  // Isolation: another user's id must be invisible and unwritable.
  const other = '00000000-0000-4000-8000-0000000000aa';
  const peek = await supabase.from('point_australia').select('id').eq('id', other);
  const poke = await supabase.from('point_australia').insert({ id: other });
  check('cannot read or write another user\'s points', (peek.data ?? []).length === 0 && Boolean(poke.error), poke.error ? '' : 'insert for another user succeeded!');
} catch (err) {
  check('run completed without errors', false, err.message);
} finally {
  const { error } = await supabase.rpc('clear_user_data');
  console.log(error ? `\nCleanup FAILED: ${error.message}` : '\nCleanup: test account data cleared.');
  await supabase.auth.signOut();
}

const failed = results.filter(r => !r.ok && !r.needsMigration).length;
const todo = results.filter(r => !r.ok && r.needsMigration).length;
console.log(`\n${results.length - failed - todo} passed, ${failed} failed, ${todo} need migration 20261122000000_sync_points_from_profile`);
process.exit(failed ? 1 : 0);
