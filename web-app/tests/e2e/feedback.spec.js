import { expect, test } from '@playwright/test';

// The database is mocked: these tests never write to a real project.
async function mockFeedback(context, status = 201) {
  const bodies = [];
  await context.route('**/rest/v1/feedback_submissions*', async (route) => {
    bodies.push(route.request().postDataJSON());
    await route.fulfill({ status, body: status === 201 ? '' : JSON.stringify({ message: 'boom' }) });
  });
  return bodies;
}

test('homepage "Collaborate with us" opens the form, validates and submits', async ({ page, context }) => {
  const bodies = await mockFeedback(context);
  await page.goto('/');
  await page.getByRole('link', { name: 'Collaborate with us' }).first().click();
  await expect(page.getByRole('tab', { name: 'Collaborate with us' })).toHaveAttribute('aria-selected', 'true');

  const form = page.locator('.lp-feedback form');
  await form.getByRole('button', { name: 'Send message' }).click();
  await expect(form.getByText('Choose an option.')).toBeVisible();
  await expect(form.getByText('Tell us your name.')).toBeVisible();
  await expect(form.getByText('We need an email to reply to.')).toBeVisible();
  expect(bodies).toHaveLength(0);

  await form.getByLabel('How would you like to work with us?').selectOption('Migration agent or consultant');
  await form.getByLabel('Your message').fill('We are a registered agency and would like to partner.');
  await form.getByLabel(/^Name/).fill('Asha');
  await form.getByLabel(/^Email/).fill('asha@example.org');
  await form.getByLabel(/^Organisation/).fill('Example Migration');
  await form.getByRole('button', { name: 'Send message' }).click();

  await expect(page.getByText('Thanks for reaching out.')).toBeVisible();
  expect(bodies).toHaveLength(1);
  expect(bodies[0]).toMatchObject({ kind: 'collaborate', category: 'Migration agent or consultant', name: 'Asha', email: 'asha@example.org', organisation: 'Example Migration' });
});

test('a mistake report keeps the text when sending fails', async ({ page, context }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const bodies = await mockFeedback(context, 500);
  await page.goto('/faq');
  await page.locator('.site-footer').getByRole('link', { name: 'Report a mistake' }).click();
  await expect(page).toHaveURL(/\/#report-mistake$/);
  await expect(page.getByRole('tab', { name: 'Report a mistake' })).toHaveAttribute('aria-selected', 'true');

  const form = page.locator('.lp-feedback form');
  await form.getByLabel('What kind of mistake?').selectOption('Points calculation');
  await form.getByLabel('What’s wrong?').fill('Age 33 should be 25 points, not 30.');
  await form.getByRole('button', { name: 'Send report' }).click();

  await expect(form.getByRole('alert')).toContainText('couldn’t send');
  await expect(form.getByLabel('What’s wrong?')).toHaveValue('Age 33 should be 25 points, not 30.');
  expect(bodies[0]).toMatchObject({ kind: 'mistake', email: null, page_url: '/' });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
});

test('the contact page offers the same form', async ({ page }) => {
  await page.goto('/contact');
  await expect(page.getByRole('tab', { name: 'Collaborate with us' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tab', { name: 'Report a mistake' })).toBeVisible();
});
