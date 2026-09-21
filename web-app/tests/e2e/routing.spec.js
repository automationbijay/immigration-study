import { test, expect } from '@playwright/test';

test.describe('Routing and Code Splitting', () => {
  test('Landing page loads and renders core UI without crashing', async ({ page }) => {
    await page.goto('/');
    
    // Expect the title or hero text to be visible
    await expect(page.locator('text=Global Migration Made Easy')).toBeVisible();
    
    // Check for specific actions to ensure JS hydrated
    const loginButton = page.locator('button:has-text("Log In")');
    await expect(loginButton).toBeVisible();
  });

  test('Navigating to login triggers lazy-loaded chunk', async ({ page }) => {
    await page.goto('/');
    
    const loginButton = page.locator('button:has-text("Log In")');
    await loginButton.click();
    
    // Wait for the URL to change to /login
    await page.waitForURL('**/login');
    
    // Verify the login form renders, confirming the chunk loaded and Suspense resolved
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});
