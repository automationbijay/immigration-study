import { expect, test } from '@playwright/test';

test('FSW keeps a failed edit, confirms a retry and restores the saved estimate from Home', async ({ page, context }) => {
  const user = { id: '00000000-0000-4000-8000-000000000001', email: 'sample@example.invalid' };
  let fsw = null;
  let failNextSave = true;

  // Supply a synthetic session only to the local Vite application. Route all
  // database reads and writes below so the real client exercises its error path.
  await context.route('**/src/lib/supabase.js*', async route => {
    const original = await route.fetch();
    const body = await original.text();
    await route.fulfill({ response: original, body: body + `
      supabase.auth.getSession = async () => ({ data: { session: { user: ${JSON.stringify(user)} } } });
      supabase.auth.onAuthStateChange = () => ({ data: { subscription: { unsubscribe() {} } } });
    ` });
  });
  await context.route('**/rest/v1/**', async route => {
    const table = new URL(route.request().url()).pathname.split('/').pop();
    if (route.request().method() === 'POST' && table === 'point_fsw67') {
      if (failNextSave) {
        failNextSave = false;
        return route.fulfill({ status: 403, json: { message: 'Test save failure' } });
      }
      fsw = route.request().postDataJSON();
      return route.fulfill({ status: 201, body: '' });
    }
    if (table === 'profile_basic') return route.fulfill({ json: { id: user.id, name: 'Alex' } });
    if (table === 'point_australia') return route.fulfill({ status: 406, json: { code: 'PGRST116' } });
    return route.fulfill({ json: table === 'point_fsw67' && fsw ? [fsw] : [] });
  });

  await page.goto('/home');
  await expect(page.getByRole('heading', { name: 'Continue your profile' })).toBeVisible();
  await page.getByRole('link', { name: /Canada Federal Skilled Worker/ }).click();
  const estimate = page;
  for (const [label, value] of Object.entries({ Experience: '9', Age: '12', Education: '21', Reading: '6', Writing: '6', Listening: '6', Speaking: '6' })) {
    await estimate.getByLabel(label, { exact: true }).selectOption(value);
  }
  await estimate.getByLabel('No (0 pts)').check();
  const save = estimate.getByRole('button', { name: 'Save to profile' });
  await save.click();
  await expect(estimate.getByText('Could not save.', { exact: false })).toBeVisible();
  await expect(estimate.getByLabel('Education', { exact: true })).toHaveValue('21');
  await save.click();
  await expect(estimate.getByText('Estimate saved to your profile.')).toBeVisible();
  await estimate.reload();
  await expect(estimate.getByLabel('Education', { exact: true })).toHaveValue('21');
  await expect(estimate.locator('.estimate-number')).toContainText('66');
  await page.goto('/home');
  await expect(page.getByRole('link', { name: /Canada Federal Skilled Worker/ })).toContainText('66 / 100');
});
