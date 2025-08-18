import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start each test with a clean slate
    await page.context().clearCookies();
  });

  test('should redirect to signin page when not authenticated', async ({ page }) => {
    await page.goto('/');
    
    // Should be redirected to signin
    await expect(page).toHaveURL(/.*\/auth\/signin/);
    
    // Take screenshot of signin page
    await page.screenshot({ path: 'test-results/auth-signin-page.png' });
  });

  test('should show signin form elements', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // Check for form elements
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/auth-signin-form.png' });
  });

  test('should handle signin form submission', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // Fill and submit form with test credentials
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'testpass');
    
    // Take screenshot before submission
    await page.screenshot({ path: 'test-results/auth-signin-filled.png' });
    
    await page.click('button[type="submit"]');
    
    // Wait for navigation or error message
    await page.waitForTimeout(2000);
    
    // Take screenshot after submission
    await page.screenshot({ path: 'test-results/auth-signin-submitted.png' });
  });

  test('should protect API routes when not authenticated', async ({ page }) => {
    // Test that API routes redirect to signin
    const response = await page.goto('/api/canvases');
    expect(response?.status()).toBe(302);
    
    await expect(page).toHaveURL(/.*\/auth\/signin/);
  });
});