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
});
