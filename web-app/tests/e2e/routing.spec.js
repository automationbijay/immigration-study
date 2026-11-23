import { test, expect } from '@playwright/test';

async function openLink(page, name) {
  const link = page.getByRole('link', { name }).first();
  await expect(link).not.toHaveAttribute('target', '_blank');
  await link.focus();
  await link.press('Enter');
  return page;
}

test('landing offers both calculators on mobile and opens login in the same tab', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Upload your CV. Let AI do the paperwork.');
  for (const country of ['Australia', 'Canada']) {
    await expect(page.getByRole('link', { name: `${country} points`, exact: true })).toBeInViewport({ ratio: 1 });
  }
  const login = await openLink(page, /Log in/);
  await expect(login).toHaveURL(/\/login$/);
  await expect(login.locator('input[type="email"]')).toBeVisible();
});

test('sign-in opens Home and the landing page remains available on mobile', async ({ page, context }) => {
  await context.route('**/src/lib/supabase.js*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()) + `
      let currentSession = null;
      let onAuthChange;
      supabase.auth.getSession = async () => ({ data: { session: currentSession } });
      supabase.auth.onAuthStateChange = (callback) => {
        onAuthChange = callback;
        return { data: { subscription: { unsubscribe() {} } } };
      };
      supabase.auth.signInWithPassword = async () => {
        currentSession = { user: { id: '00000000-0000-4000-8000-000000000001' } };
        onAuthChange('SIGNED_IN', currentSession);
        return { error: null };
      };
    ` });
  });
  await context.route('**/rest/v1/**', route => route.fulfill({ json: [] }));

  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/login');
  await page.getByLabel('Email Address').fill('sample@example.invalid');
  await page.getByLabel('Password').fill('example-password');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);

  await page.getByRole('link', { name: 'Landing page', exact: true }).click();
  await expect(page).toHaveURL(/\/landing$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Upload your CV. Let AI do the paperwork.');
  await expect(page.getByRole('navigation', { name: 'Primary' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Upload your CV' }).first()).toHaveAttribute('href', '/profile?intent=upload_cv');

  await page.getByRole('navigation', { name: 'Site', exact: true }).getByRole('link', { name: 'Skilled Migration Assistant' }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();

  const feedback = page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Feedback' });
  await feedback.click();
  await expect(page).toHaveURL(/\/contact$/);
  await expect(page.getByRole('heading', { name: 'Feedback and collaboration' })).toBeVisible();
  await expect(feedback).toHaveAttribute('aria-current', 'page');
});

test('Discover connects countries, official visa information and lookups on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');
  const discover = await openLink(page, /Compare pathways/);
  await discover.setViewportSize({ width: 360, height: 800 });
  await expect(discover.getByRole('heading', { name: 'Australia', exact: true })).toBeVisible();
  await expect(discover.getByRole('heading', { name: 'Canada', exact: true })).toBeVisible();
  await expect(discover.getByRole('link', { name: /Skilled Independent/ })).toHaveAttribute('href', /homeaffairs\.gov\.au.*skilled-independent-189/);
  await expect(discover.getByRole('link', { name: /official CRS calculator/ })).toHaveAttribute('href', /canada\.ca/);
  await expect(discover.getByRole('link', { name: /University directory/ })).toHaveAttribute('href', '/tools/university');
  await expect.poll(() => discover.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  const tool = discover.getByRole('link', { name: /University directory/ });
  await tool.click();
  await expect(discover).toHaveURL(/\/tools\/university$/);
  await discover.goBack();

  for (const name of [/Skilled Independent/, /official CRS calculator/]) {
    const card = discover.getByRole('link', { name });
    await expect(card).not.toHaveAttribute('target', '_blank');
    await expect(card).not.toHaveAccessibleName(/opens in a new tab/);
  }

  const visas = await openLink(discover, /All Australian pathways/);
  await expect(visas.locator('a[href^="https://immi.homeaffairs.gov.au/"]')).toHaveCount(3);
});

test('the existing CRS URL offers the official calculator', async ({ page }) => {
  await page.goto('/forms/canada-crs');
  await expect(page.getByRole('heading', { name: 'Canada Express Entry CRS' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Open the official CRS calculator/ })).toHaveAttribute('href', /canada\.ca.*check-score\.html$/);
  await expect(page.getByRole('button', { name: /Save/ })).toHaveCount(0);
});

test('an Australian estimate distinguishes zero from unanswered and links to guidance', async ({ page, context }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await context.route('https://immi.homeaffairs.gov.au/**', route => route.fulfill({ body: 'Official guidance' }));
  await page.goto('/australia-point-calculator');
  const panel = page.locator('#estimate');
  await expect(panel).toContainText('Choose your age group');
  await page.getByLabel('Age', { exact: true }).selectOption('45_plus');
  await expect(panel).toContainText('Partial estimate');
  await page.getByText('View breakdown').click();
  await expect(panel.locator('dl div').filter({ hasText: 'English' })).toContainText('Unanswered');
  await page.getByLabel('English Language Skills').selectOption('superior');
  await expect(panel.locator('.estimate-number')).toContainText('20');
  await openLink(page, /Home Affairs points table/);
  await expect(page).toHaveURL(/homeaffairs\.gov\.au/);
});

test('Canada FSW shows a subtotal and a completed estimate with zero-point answers', async ({ page }) => {
  await page.goto('/forms/canada-fsw');
  const panel = page.locator('#estimate');
  await expect(panel).toContainText('Choose your work experience');
  await page.getByLabel('Experience', { exact: true }).selectOption('0');
  await expect(panel).toContainText('Partial estimate');
  for (const label of ['Age', 'Education', 'Reading', 'Writing', 'Listening', 'Speaking']) {
    await page.getByLabel(label, { exact: true }).selectOption('0');
  }
  await page.getByLabel('No (0 pts)').check();
  await expect(panel).toContainText('67 points below the threshold');
  await expect(page.getByRole('button', { name: /Save/ })).toHaveCount(0);
});
