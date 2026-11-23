import { expect, test } from '@playwright/test';

const user = { id: '00000000-0000-4000-8000-000000000002', email: 'profile@example.invalid' };
const job = {
  id: 'job', company_name: 'Example Co', role: 'Developer', country: 'Australia',
  start_date: '2025-01-01', end_date: '2025-07-01',
};

async function mockProfile(context, overrides = {}) {
  const rows = {
    point_australia: [{ id: user.id, experienceAnzsco: '261312', english: 0, education: 0, ausExp: 0, overseasExp: 0 }],
    profile_basic: [{ id: user.id, name: 'Alex', dob: '1995-01-01' }],
    profile_education: [{ id: 'school', level: 'High School' }],
    test_ielts: [{ id: 'test', overall: 6 }],
    countries: [{ name: 'Australia' }],
    ...overrides,
  };
  const errors = new Set();

  await context.route('**/src/lib/supabase.js*', async route => {
    const original = await route.fetch();
    await route.fulfill({ response: original, body: (await original.text()) + `
      supabase.auth.getSession = async () => ({ data: { session: { user: ${JSON.stringify(user)} } } });
      supabase.auth.getUser = async () => ({ data: { user: ${JSON.stringify(user)} } });
      supabase.auth.onAuthStateChange = () => ({ data: { subscription: { unsubscribe() {} } } });
    ` });
  });
  await context.route('**/rest/v1/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const table = url.pathname.split('/').pop();
    const records = rows[table] ?? [];
    if (errors.has(table) || errors.has(`${request.method()} ${table}`)) {
      return route.fulfill({ status: 400, json: { message: 'Test request failed' } });
    }
    if (url.pathname.includes('/rpc/')) return route.fulfill({ json: records });

    if (request.method() === 'POST') {
      const payload = request.postDataJSON();
      if (errors.has(`POST ${table} ${payload.level}`)) {
        return route.fulfill({ status: 400, json: { message: 'Test write failed' } });
      }
      const row = { id: 'saved-entry', ...payload };
      const existing = records.find(record => record.id === row.id);
      rows[table] = [...records.filter(record => record !== existing), { ...existing, ...row }];
      return route.fulfill({ status: 201, json: [row] });
    }
    if (request.method() === 'DELETE') {
      const id = url.searchParams.get('id')?.replace(/^eq\./, '');
      rows[table] = id ? records.filter(row => row.id !== id) : [];
      return route.fulfill({ status: 204 });
    }

    let filtered = records;
    if (url.searchParams.has('or')) {
      const scores = ['listening', 'reading', 'writing', 'speaking', 'overall'];
      expect(url.searchParams.get('or')).toBe(`(${scores.map(field => `${field}.not.is.null`).join(',')})`);
      filtered = records.filter(row => scores.some(field => row[field] != null));
    }
    if (url.searchParams.has('level')) {
      expect(url.searchParams.getAll('level')).toEqual(['not.is.null', 'neq.']);
      filtered = records.filter(row => row.level);
    }
    const limit = url.searchParams.get('limit');
    return route.fulfill({ json: limit ? filtered.slice(0, Number(limit)) : filtered });
  });
  return { rows, errors };
}

const nav = (page, label) => page.getByRole('navigation', { name: 'Site' }).getByRole('link', { name: label === 'Home' ? 'Dashboard' : label, exact: true });
const reminder = page => page.locator('.next-task').getByRole('link').first();
const estimates = page => page.getByRole('region', { name: 'Your estimates' });

test('six-month job clears both reminders after save and restores them after deletion', async ({ page, context }) => {
  await mockProfile(context);
  await page.goto('/home');
  await expect(reminder(page)).toHaveText('Add your work experience');
  await expect(page.getByText('80%', { exact: true })).toBeVisible();
  const savedEstimate = await estimates(page).locator('.saved-estimate').first().textContent();

  await reminder(page).click();
  const editor = page.getByRole('dialog');
  await editor.getByLabel('Company Name').fill(job.company_name);
  await editor.getByLabel('Role').fill(job.role);
  await editor.getByLabel('Country').selectOption(job.country);
  await editor.getByLabel(/Start Date/).fill(job.start_date);
  await editor.getByLabel(/End Date/).fill(job.end_date);
  await editor.getByRole('button', { name: 'Save Details' }).click();
  await expect(editor).toBeHidden();
  await expect(page.getByRole('button', { name: /Experience & Extras/ })).toContainText('Done');

  await nav(page, 'Home').click();
  await expect(page.getByRole('heading', { name: 'Continue your profile' })).toBeHidden();
  await expect(page.getByText('80%', { exact: true })).toBeHidden();
  await expect(estimates(page).locator('.saved-estimate').first()).toHaveText(savedEstimate);

  await nav(page, 'Profile').click();
  await page.getByRole('button', { name: /Experience & Extras/ }).click();
  await editor.getByRole('button', { name: 'Remove' }).click();
  await expect(editor.getByLabel('Company Name')).toBeHidden();
  await editor.getByRole('button', { name: 'Cancel' }).click();
  await nav(page, 'Home').click();
  await expect(reminder(page)).toHaveText('Add your work experience');
});

test('calculator answers and placeholder profile rows leave checklist gaps', async ({ page, context }) => {
  const { rows, errors } = await mockProfile(context, {
    point_australia: [{ id: user.id, age: 30, english: 10, education: 15, ausExp: 3, educationAnzsco: '261312' }],
    profile_basic: [{ id: user.id, name: 'Alex' }],
    profile_education: [{ id: 'partial', university_name: 'Example school', level: null }],
    test_ielts: [{ id: 'blank', test_date: '2025-01-01' }],
  });
  errors.add('profile_experience');
  await page.goto('/home');
  const retry = page.getByRole('button', { name: 'Retry loading your profile checklist' });
  await expect(retry).toBeVisible();
  await expect(estimates(page).locator('.saved-estimate').first()).toHaveText('65 points');
  await expect(page.locator('.next-task')).toBeHidden();

  errors.clear();
  await retry.click();
  await expect(reminder(page)).toHaveText('Add your date of birth');
  const checklist = page.locator('.checklist-items');
  for (const label of ['Add your English test scores', 'Add your highest qualification', 'Add your work experience']) {
    await expect(checklist.getByRole('link', { name: label })).toBeVisible();
  }
  await expect(checklist.getByRole('link', { name: 'Select your occupation' })).toBeHidden();

  await checklist.getByRole('link', { name: 'Add your English test scores' }).click();
  const editor = page.getByRole('dialog');
  await editor.getByRole('button', { name: 'Remove' }).click();
  await editor.getByRole('button', { name: '+ Add Another Test' }).click();
  await editor.getByRole('button', { name: 'Save Details' }).click();
  await expect(editor).toBeHidden();
  expect(rows.test_ielts).toEqual([]);
  await expect(page.getByRole('button', { name: /Language Proficiency/ })).toContainText('Incomplete');

  await page.getByRole('link', { name: /Profession/ }).click();
  await expect(page.locator('.occupation-selected-name')).toHaveText('ANZSCO 261312');
});

test('applied CV imports refresh both the dashboard checklist and previously opened editors', async ({ page, context }) => {
  const { rows } = await mockProfile(context, {
    profile_education: [],
    cv_metadata: [{ id: 'cv', file_url: 'sample.pdf', extraction_status: 'processing' }],
  });
  await context.route('**/storage/v1/object/sign/**', route => route.fulfill({ status: 404, json: { message: 'Mock CV' } }));
  await page.goto('/profile');
  const education = page.getByRole('button', { name: /Education/ });
  const editor = page.getByRole('dialog');
  await education.click();
  await expect(editor.getByLabel('Level', { exact: true })).toHaveValue('');
  await editor.getByRole('button', { name: 'Cancel' }).click();

  await page.getByRole('button', { name: /My CV/ }).click();
  await expect(editor.getByText('Reading your CV.')).toBeVisible();
  rows.cv_metadata[0].extraction_status = 'applied';
  rows.profile_education = [{ id: 'new-education', level: 'Bachelor', end_date: '2099-01-01' }];
  rows.profile_experience = [job];
  await editor.getByRole('button', { name: 'Refresh import status' }).click();
  await expect(editor.getByText(/Import complete/)).toBeVisible();
  await editor.getByRole('button', { name: 'Close' }).click();

  await education.click();
  await expect(editor.getByLabel('Level', { exact: true })).toHaveValue('Bachelor');
  await editor.getByRole('button', { name: 'Cancel' }).click();
  await nav(page, 'Home').click();
  await expect(estimates(page)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Continue your profile' })).toBeHidden();
});

test('occupation follows the saved code when a conflicting title record or a write failure exists', async ({ page, context }) => {
  const { rows, errors } = await mockProfile(context, {
    profile_experience: [job],
    profile_job_classification: [{ id: 'classification', anzsco_code: '252511', anzsco_title: 'Physiotherapist' }],
    search_job_titles: [{ occupation_code: '233211', job_name: 'Civil Engineer' }],
  });
  await page.goto('/tools/anzsco');
  await expect(page.locator('.occupation-selected-name')).toHaveText('ANZSCO 261312');
  await page.getByRole('button', { name: 'Clear selected occupation' }).click();
  await page.getByRole('combobox').fill('Civil Engineer');
  await page.getByRole('option', { name: /Civil Engineer/ }).click();
  const save = page.getByRole('button', { name: 'Save to profile' });

  errors.add('POST point_australia');
  await save.click();
  await expect(page.getByText('Test request failed')).toBeVisible();
  expect(rows.profile_job_classification[0].anzsco_code).toBe('252511');

  errors.clear();
  errors.add('POST profile_job_classification');
  await save.click();
  await expect(page.getByText(/Occupation code saved. The profile title could not be updated/)).toBeVisible();
  expect(rows.point_australia[0].experienceAnzsco).toBe('233211');
  await nav(page, 'Profile').click();
  const profession = page.getByRole('link', { name: /Profession Done/ });
  await expect(profession).toBeVisible();
  await profession.click();
  await expect(page.locator('.occupation-selected-name')).toHaveText('ANZSCO 233211');
});

test('a successful row still clears its checklist item when another row fails to save', async ({ page, context }) => {
  const { rows, errors } = await mockProfile(context, {
    profile_experience: [job],
    profile_education: [],
  });
  errors.add('POST profile_education Bachelor');
  await page.goto('/home');
  await expect(reminder(page)).toHaveText('Add your highest qualification');
  await reminder(page).click();

  const editor = page.getByRole('dialog');
  const levels = editor.getByLabel('Level', { exact: true });
  await levels.first().selectOption('High School');
  await editor.getByRole('button', { name: /Add Another/ }).click();
  await levels.nth(1).selectOption('Bachelor');
  await editor.getByRole('button', { name: 'Save Details' }).click();
  await expect(editor.getByText(/Could not save every change/)).toBeVisible();
  await expect(levels.nth(1)).toHaveValue('Bachelor');
  expect(rows.profile_education.map(row => row.level)).toEqual(['High School']);

  await editor.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('button', { name: /Education Done/ })).toBeVisible();
  await nav(page, 'Home').click();
  await expect(estimates(page)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Continue your profile' })).toBeHidden();
});
