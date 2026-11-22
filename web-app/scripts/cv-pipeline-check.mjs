// Live end-to-end check of the CV pipeline.
//
// Signs in as a throwaway test account, uploads script/fixtures' sample CV
// through the upload-cv Edge Function (exactly like the app), waits for
// parse-cv / extract-cv / apply-cv-profile to finish, reports what landed in
// the profile and the derived points, then clears the account's data.
//
// Usage (from web-app/): npm run test:cv  (TEST_EMAIL / TEST_PASSWORD from the
// environment or .env.test.local)
// NEVER point this at a real user: it deletes all of the account's data.
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
for (const file of ['.env.local', '.env.test.local']) {
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
for (const k of ['TEST_EMAIL', 'TEST_PASSWORD']) if (process.env[k]) env[k] = process.env[k];
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(env.VITE_SUPABASE_URL, key, { auth: { persistSession: false } });

const { data: auth, error: authError } = await supabase.auth.signInWithPassword({
  email: env.TEST_EMAIL, password: env.TEST_PASSWORD,
});
if (authError) { console.error('Sign-in failed:', authError.message); process.exit(2); }
const uid = auth.user.id;
console.log(`Signed in (key type: ${key.startsWith('sb_publishable_') ? 'publishable' : 'legacy anon'})`);

let ok = false;
try {
  await supabase.rpc('clear_user_data');
  await supabase.from('point_australia').insert({ id: uid });
  await supabase.from('profile_basic').insert({ id: uid });

  const pdf = fs.readFileSync('../script/fixtures/two-column-resume-template-blue.pdf');
  const form = new FormData();
  form.append('cv', new Blob([pdf], { type: 'application/pdf' }), 'sample-cv.pdf');
  const { error: upErr } = await supabase.functions.invoke('upload-cv', { body: form });
  if (upErr) throw new Error(`upload-cv: ${upErr.message}`);
  console.log('Uploaded. Waiting for AI extraction…');

  let row;
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 3000));
    ({ data: row } = await supabase.from('cv_metadata').select('extraction_status, extraction_error')
      .eq('user_id', uid).order('created_at', { ascending: false }).limit(1).maybeSingle());
    if (row && ['applied', 'failed'].includes(row.extraction_status)) break;
  }
  console.log(`Extraction status: ${row?.extraction_status}${row?.extraction_error ? ` (${row.extraction_error})` : ''}`);

  const [{ data: basic }, { data: edu }, { data: exp }, { data: pts }] = await Promise.all([
    supabase.from('profile_basic').select('name, email, country, dob').eq('id', uid).single(),
    supabase.from('profile_education').select('level, field_of_study').eq('user_id', uid),
    supabase.from('profile_experience').select('role, country, start_date, end_date').eq('user_id', uid),
    supabase.from('point_australia').select('education, overseasExp, ausExp').eq('id', uid).single(),
  ]);
  console.log('Basic details filled:', Object.entries(basic ?? {}).filter(([, v]) => v).map(([k]) => k).join(', ') || 'none');
  console.log('Education rows:', JSON.stringify(edu));
  console.log('Experience rows:', (exp ?? []).length, exp?.[0] ? `(${exp[0].country}, ${exp[0].start_date} → ${exp[0].end_date ?? 'now'})` : '');
  console.log('Derived points:', JSON.stringify(pts));
  ok = row?.extraction_status === 'applied';
} catch (e) {
  console.error('ERROR:', e.message);
} finally {
  // The app's own "Delete All My Data" path: removes stored CV files too.
  const { data, error } = await supabase.functions.invoke('delete-user-data');
  const failed = error || data?.error;
  console.log(failed ? `Cleanup FAILED: ${error?.message ?? data.error}` : 'Cleanup: test account data and CV files cleared.');
}
console.log(ok ? 'CV PIPELINE OK' : 'CV PIPELINE FAILED');
process.exit(ok ? 0 : 1);
