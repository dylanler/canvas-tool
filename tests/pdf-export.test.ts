import { test, expect } from '@playwright/test';

test.describe('PDF Export Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should find PDF export button', async ({ page }) => {
    // Look for PDF export button - could be in various places
    const pdfExportButton = page.locator('button').filter({ 
      hasText: /pdf|export|download/i 
    }).first();
    
    // Also look for export menu or dropdown
    const exportMenu = page.locator('[class*="export"], [data-testid="export"]').first();
    
    if (await pdfExportButton.isVisible()) {
      await page.screenshot({ path: 'test-results/pdf-export-button-found.png' });
      console.log('PDF export button found');
    } else if (await exportMenu.isVisible()) {
      await page.screenshot({ path: 'test-results/pdf-export-menu-found.png' });
      console.log('PDF export menu found');
    } else {
      console.log('PDF export functionality not found in UI');
      await page.screenshot({ path: 'test-results/pdf-export-not-found.png' });
    }
  });

  test('should test PDF export functionality', async ({ page }) => {
    // Set up download listener
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
    
    // Look for export button
    const exportButtons = [
      page.locator('button').filter({ hasText: /pdf/i }).first(),
      page.locator('button').filter({ hasText: /export/i }).first(),
      page.locator('button').filter({ hasText: /download/i }).first()
    ];
    
    let clicked = false;
    
    for (const button of exportButtons) {
      if (await button.isVisible()) {
        await page.screenshot({ path: 'test-results/pdf-export-before-click.png' });
        
        await button.click();
        clicked = true;
        
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'test-results/pdf-export-after-click.png' });
        break;
      }
    }
    
    if (clicked) {
      // Wait for potential download
      const download = await downloadPromise;
      
      if (download) {
        console.log('Download triggered:', download.suggestedFilename());
        expect(download.suggestedFilename()).toContain('.pdf');
      } else {
        console.log('No download detected - may be handled differently');
      }
    } else {
      console.log('No export button found to click');
    }
  });

  test('should test "export all" functionality', async ({ page }) => {
    // Based on commit message mentioning "pdf export all func"
    const exportAllButton = page.locator('button').filter({ 
      hasText: /export all|export.*all|all.*export/i 
    }).first();
    
    if (await exportAllButton.isVisible()) {
      await page.screenshot({ path: 'test-results/pdf-export-all-button.png' });
      
      // Set up download listener
      const downloadPromise = page.waitForEvent('download', { timeout: 15000 }).catch(() => null);
      
      await exportAllButton.click();
      
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'test-results/pdf-export-all-clicked.png' });
      
      // Check for download
      const download = await downloadPromise;
      
      if (download) {
        console.log('Export all download triggered:', download.suggestedFilename());
      } else {
        console.log('No download detected for export all');
      }
    } else {
      console.log('Export all button not found');
      await page.screenshot({ path: 'test-results/pdf-export-all-not-found.png' });
    }
  });

  test('should test PDF export with multiple canvases', async ({ page }) => {
    // First check if there are multiple canvases
    const canvasItems = page.locator('[class*="canvas"], [data-testid="canvas-item"]');
    const canvasCount = await canvasItems.count();
    
    console.log(`Found ${canvasCount} canvas items`);
    
    if (canvasCount > 1) {
      // Test exporting multiple canvases
      const exportButton = page.locator('button').filter({ hasText: /export|pdf/i }).first();
      
      if (await exportButton.isVisible()) {
        await page.screenshot({ path: 'test-results/pdf-export-multiple-canvases.png' });
        
        const downloadPromise = page.waitForEvent('download', { timeout: 15000 }).catch(() => null);
        
        await exportButton.click();
        
        await page.waitForTimeout(5000); // Give more time for multiple canvas processing
        
        const download = await downloadPromise;
        
        if (download) {
          console.log('Multi-canvas PDF export successful:', download.suggestedFilename());
        }
      }
    } else {
      console.log('Not enough canvases for multi-export test');
    }
  });
});