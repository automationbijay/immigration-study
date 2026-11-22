import { expect, test } from '@playwright/test';

async function selectOccupation(page) {
  await page.route('**/rest/v1/rpc/search_job_titles', route => route.fulfill({
    json: [{ id: 'occupation', occupation_code: '252511', job_name: 'Physiotherapist' }],
  }));
  await page.route(/\/rest\/v1\/anzsco_(?:mltssl|stsol|rol|csol)\?/, route => route.fulfill({ json: [] }));
  await page.goto('/tools/anzsco');
  await page.getByRole('combobox').fill('Physiotherapist');
  await page.getByRole('option', { name: /Physiotherapist/ }).click();
}

test('SkillSelect history shows the latest scores and a keyboard-accessible table on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.route('**/rest/v1/rpc/get_skillselect_cutoffs', async route => {
    expect(route.request().postDataJSON()).toEqual({ p_anzsco_code: 252511 });
    await route.fulfill({ json: [
      { round_date: '2025-11-13', subclass_189_points: 75, subclass_491_points: 80 },
      { round_date: '2026-10-15', subclass_189_points: 70, subclass_491_points: null },
    ] });
  });

  await selectOccupation(page);
  const latest = page.locator('.anz-cutoff-latest');
  await expect(latest.getByText('70', { exact: false })).toBeVisible();
  await expect(latest.getByText('80', { exact: false })).toBeVisible();
  const summary = page.getByText('View cut-off points by round');
  await summary.focus();
  await summary.press('Enter');
  const table = page.getByRole('table', { name: /by invitation round/ });
  await expect(table.getByRole('row', { name: /15 Oct 2026/ })).toContainText('70');
  await expect(table.getByRole('row', { name: /15 Oct 2026/ })).toContainText('—');
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
});

test('a failed SkillSelect request shows an error instead of empty history', async ({ page }) => {
  await page.route('**/rest/v1/rpc/get_skillselect_cutoffs', route => route.fulfill({
    status: 503,
    json: { message: 'Unavailable' },
  }));
  await selectOccupation(page);
  await expect(page.getByText('SkillSelect cut-off points could not be loaded.')).toBeVisible();
  await expect(page.getByText('No published SkillSelect cut-off points found for this occupation.')).toHaveCount(0);
});
