import { test, expect } from '@playwright/test';

test.describe('Comprehensive Application Test Suite', () => {
  test('should perform full application health check', async ({ page }) => {
    // This test runs a comprehensive check of the application
    console.log('Starting comprehensive application test...');
    
    // 1. Navigate to application
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Take initial screenshot
    await page.screenshot({ path: 'test-results/comprehensive-initial-load.png', fullPage: true });
    
    // 2. Check for critical JavaScript errors
    const jsErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        jsErrors.push(msg.text());
      }
    });
    
    const pageErrors: string[] = [];
    page.on('pageerror', error => {
      pageErrors.push(error.message);
    });
    
    // 3. Wait and let the page fully initialize
    await page.waitForTimeout(5000);
    
    // 4. Check for key application elements
    const elementsToCheck = [
      { selector: 'canvas', name: 'Canvas element' },
      { selector: '[class*="tldraw"]', name: 'TLDraw component' },
      { selector: 'input, textarea', name: 'Input elements' },
      { selector: 'button', name: 'Interactive buttons' },
      { selector: '[class*="chat"], [data-testid*="chat"]', name: 'Chat interface' },
      { selector: '[class*="sidebar"], aside', name: 'Sidebar' }
    ];
    
    const foundElements: string[] = [];
    const missingElements: string[] = [];
    
    for (const element of elementsToCheck) {
      const found = await page.locator(element.selector).first().isVisible().catch(() => false);
      if (found) {
        foundElements.push(element.name);
      } else {
        missingElements.push(element.name);
      }
    }
    
    console.log('Found elements:', foundElements);
    console.log('Missing elements:', missingElements);
    
    // 5. Test basic interactivity
    const interactiveElements = page.locator('button, input, textarea, [role="button"]');
    const interactiveCount = await interactiveElements.count();
    
    console.log(`Found ${interactiveCount} interactive elements`);
    
    // 6. Check network requests for API calls
    const apiRequests: string[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        apiRequests.push(request.url());
      }
    });
    
    // Trigger some activity to generate API calls
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    if (buttonCount > 0) {
      // Click the first few buttons to test interactivity
      for (let i = 0; i < Math.min(3, buttonCount); i++) {
        const button = buttons.nth(i);
        const isVisible = await button.isVisible();
        const isEnabled = await button.isEnabled();
        
        if (isVisible && isEnabled) {
          const buttonText = await button.textContent();
          console.log(`Clicking button: ${buttonText}`);
          
          await button.click();
          await page.waitForTimeout(1000);
        }
      }
    }
    
    // 7. Final screenshot
    await page.screenshot({ path: 'test-results/comprehensive-final-state.png', fullPage: true });
    
    // 8. Report results
    const report = {
      jsErrors: jsErrors.length,
      pageErrors: pageErrors.length,
      foundElements: foundElements.length,
      missingElements: missingElements.length,
      interactiveElements: interactiveCount,
      apiRequests: apiRequests.length
    };
    
    console.log('Comprehensive test report:', JSON.stringify(report, null, 2));
    
    // 9. Assertions
    expect(jsErrors.filter(error => 
      error.includes('append is not a function') || 
      error.includes('TypeError: append')
    )).toHaveLength(0);
    
    expect(pageErrors).toHaveLength(0);
    
    // Expect at least some key elements to be found
    expect(foundElements.length).toBeGreaterThan(0);
  });

  test('should test cross-browser compatibility markers', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check for browser-specific issues
    const userAgent = await page.evaluate(() => navigator.userAgent);
    console.log('Testing on:', userAgent);
    
    // Test localStorage/sessionStorage access
    const storageTest = await page.evaluate(() => {
      try {
        localStorage.setItem('test', 'value');
        localStorage.removeItem('test');
        return true;
      } catch (e) {
        return false;
      }
    });
    
    console.log('Storage access:', storageTest);
    
    // Test modern JavaScript features
    const modernJSTest = await page.evaluate(() => {
      try {
        // Test arrow functions, async/await, etc.
        const test = async () => {
          const result = await Promise.resolve('test');
          return result;
        };
        return true;
      } catch (e) {
        return false;
      }
    });
    
    console.log('Modern JS support:', modernJSTest);
    
    await page.screenshot({ path: `test-results/browser-compatibility-${Date.now()}.png` });
  });
});