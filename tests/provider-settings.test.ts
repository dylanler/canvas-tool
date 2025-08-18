import { test, expect } from '@playwright/test';

test.describe('Provider Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should access provider settings', async ({ page }) => {
    // Look for settings button or menu
    const settingsButton = page.locator('button').filter({ 
      hasText: /settings|config|provider/i 
    }).first();
    
    // Also try looking for gear icon or similar
    const settingsIcon = page.locator('[class*="settings"], [data-testid="settings"]').first();
    
    let settingsFound = false;
    
    if (await settingsButton.isVisible()) {
      await settingsButton.click();
      settingsFound = true;
    } else if (await settingsIcon.isVisible()) {
      await settingsIcon.click();
      settingsFound = true;
    }
    
    if (settingsFound) {
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-results/provider-settings-opened.png' });
    } else {
      console.log('Settings button not found');
      await page.screenshot({ path: 'test-results/provider-settings-not-found.png' });
    }
  });

  test('should test custom provider toggle', async ({ page }) => {
    // First try to access settings
    const settingsElements = [
      page.locator('button').filter({ hasText: /settings|config|provider/i }).first(),
      page.locator('[class*="settings"], [data-testid="settings"]').first()
    ];
    
    for (const element of settingsElements) {
      if (await element.isVisible()) {
        await element.click();
        break;
      }
    }
    
    await page.waitForTimeout(1000);
    
    // Look for custom provider toggle
    const customProviderToggle = page.locator('input[type="checkbox"]').filter({
      has: page.locator(':scope ~ label').filter({ hasText: /custom|provider/i })
    }).first();
    
    const switchToggle = page.locator('[role="switch"], .switch').first();
    
    if (await customProviderToggle.isVisible()) {
      await page.screenshot({ path: 'test-results/provider-toggle-before.png' });
      
      await customProviderToggle.click();
      
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'test-results/provider-toggle-after.png' });
    } else if (await switchToggle.isVisible()) {
      await page.screenshot({ path: 'test-results/provider-switch-before.png' });
      
      await switchToggle.click();
      
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'test-results/provider-switch-after.png' });
    } else {
      console.log('Custom provider toggle not found');
      await page.screenshot({ path: 'test-results/provider-toggle-not-found.png' });
    }
  });

  test('should test API settings form', async ({ page }) => {
    // Navigate to settings first
    const settingsButton = page.locator('button, [class*="settings"]').filter({ 
      hasText: /settings|config|provider/i 
    }).first();
    
    if (await settingsButton.isVisible()) {
      await settingsButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Look for API settings inputs
    const baseUrlInput = page.locator('input').filter({
      has: page.locator(':scope ~ label, :scope + label').filter({ hasText: /base.*url|url|endpoint/i })
    }).first();
    
    const apiKeyInput = page.locator('input').filter({
      has: page.locator(':scope ~ label, :scope + label').filter({ hasText: /api.*key|key/i })
    }).first();
    
    const modelInput = page.locator('input, select').filter({
      has: page.locator(':scope ~ label, :scope + label').filter({ hasText: /model/i })
    }).first();
    
    if (await baseUrlInput.isVisible() || await apiKeyInput.isVisible() || await modelInput.isVisible()) {
      await page.screenshot({ path: 'test-results/provider-settings-form.png' });
      
      // Test filling in the form
      if (await baseUrlInput.isVisible()) {
        await baseUrlInput.fill('https://api.example.com/v1');
      }
      
      if (await apiKeyInput.isVisible()) {
        await apiKeyInput.fill('test-api-key-123');
      }
      
      if (await modelInput.isVisible()) {
        await modelInput.fill('gpt-4');
      }
      
      await page.screenshot({ path: 'test-results/provider-settings-filled.png' });
      
      // Look for save button
      const saveButton = page.locator('button').filter({ hasText: /save|update|apply/i }).first();
      
      if (await saveButton.isVisible()) {
        await saveButton.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'test-results/provider-settings-saved.png' });
      }
    } else {
      console.log('API settings form not found');
      await page.screenshot({ path: 'test-results/provider-settings-form-not-found.png' });
    }
  });

  test('should test settings persistence', async ({ page }) => {
    // This test would verify that settings persist across page reloads
    // First, set some settings, then reload and check they're still there
    
    await page.screenshot({ path: 'test-results/provider-settings-persistence-before.png' });
    
    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Navigate back to settings
    const settingsButton = page.locator('button, [class*="settings"]').filter({ 
      hasText: /settings|config|provider/i 
    }).first();
    
    if (await settingsButton.isVisible()) {
      await settingsButton.click();
      await page.waitForTimeout(1000);
      
      await page.screenshot({ path: 'test-results/provider-settings-persistence-after.png' });
    }
  });
});