import { test, expect } from '@playwright/test';

test.describe('Authentication Guards', () => {
  test('Visiting protected route without session redirects to login', async ({ page }) => {
    // Attempt to navigate to the protected profile page
    await page.goto('/profile');
    
    // Should be redirected to the login page because there's no session
    await page.waitForURL('**/login');
    
    // Verify we landed on login
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('Google auth returns to the default entry point or the CV upload shortcut', async ({ page }) => {
    const authorize = (url) => url.pathname === '/auth/v1/authorize';
    await page.route(authorize, route => route.fulfill({ status: 200, body: 'Google authorization intercepted' }));

    for (const path of ['/login', '/signup']) {
      for (const intent of ['', '?intent=upload_cv']) {
        await page.goto(path + intent);
        const expected = new URL(intent ? '/profile?intent=upload_cv' : '/', page.url());
        const [request] = await Promise.all([
          page.waitForRequest(request => authorize(new URL(request.url()))),
          page.getByRole('button', { name: 'Continue with Google' }).click(),
        ]);
        const params = new URL(request.url()).searchParams;
        expect(params.get('provider')).toBe('google');
        expect(params.get('redirect_to')).toBe(expected.href);
        await expect(page.getByText('Google authorization intercepted')).toBeVisible();
      }
    }
  });
});
