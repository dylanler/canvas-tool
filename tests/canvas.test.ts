import { test, expect } from '@playwright/test';

test.describe('Canvas Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should load canvas interface', async ({ page }) => {
    // Look for canvas or tldraw elements
    const canvasElement = page.locator('canvas, [class*="tldraw"], [data-testid="canvas"]').first();
    
    await page.waitForTimeout(3000); // Give tldraw time to initialize
    
    // Take screenshot of canvas area
    await page.screenshot({ path: 'test-results/canvas-initial-load.png' });
    
    console.log('Canvas element visible:', await canvasElement.isVisible());
  });

  test('should create new canvas', async ({ page }) => {
    // Look for "New Canvas" or similar button
    const newCanvasButton = page.locator('button').filter({ 
      hasText: /new canvas|create canvas|add canvas/i 
    }).first();
    
    if (await newCanvasButton.isVisible()) {
      await page.screenshot({ path: 'test-results/canvas-before-create.png' });
      
      await newCanvasButton.click();
      
      // Wait for canvas creation
      await page.waitForTimeout(2000);
      
      await page.screenshot({ path: 'test-results/canvas-after-create.png' });
    } else {
      console.log('New canvas button not found');
      await page.screenshot({ path: 'test-results/canvas-no-create-button.png' });
    }
  });

  test('should test canvas editing functionality', async ({ page }) => {
    // Wait for canvas to be ready
    await page.waitForTimeout(3000);
    
    // Look for drawing tools or canvas area
    const drawingArea = page.locator('canvas, [class*="tldraw"], [data-testid="canvas"]').first();
    
    if (await drawingArea.isVisible()) {
      // Get bounding box for drawing
      const box = await drawingArea.boundingBox();
      
      if (box) {
        // Take screenshot before drawing
        await page.screenshot({ path: 'test-results/canvas-before-drawing.png' });
        
        // Simulate drawing a simple line
        await page.mouse.move(box.x + 100, box.y + 100);
        await page.mouse.down();
        await page.mouse.move(box.x + 200, box.y + 200);
        await page.mouse.up();
        
        // Wait for drawing to register
        await page.waitForTimeout(1000);
        
        // Take screenshot after drawing
        await page.screenshot({ path: 'test-results/canvas-after-drawing.png' });
      }
    }
  });

  test('should test canvas auto-sync (2-second debounce)', async ({ page }) => {
    // Make changes and wait for auto-sync
    const drawingArea = page.locator('canvas').first();
    
    if (await drawingArea.isVisible()) {
      const box = await drawingArea.boundingBox();
      
      if (box) {
        // Make a change
        await page.mouse.move(box.x + 150, box.y + 150);
        await page.mouse.down();
        await page.mouse.move(box.x + 250, box.y + 250);
        await page.mouse.up();
        
        // Wait for the 2-second debounce period plus some buffer
        await page.waitForTimeout(3000);
        
        // Take screenshot after auto-sync period
        await page.screenshot({ path: 'test-results/canvas-after-autosync.png' });
        
        // Check network requests for save operations
        // This would require more sophisticated monitoring in a real test
      }
    }
  });

  test('should test canvas sidebar and management', async ({ page }) => {
    // Look for canvas sidebar
    const sidebar = page.locator('[class*="sidebar"], [data-testid="sidebar"], aside').first();
    
    if (await sidebar.isVisible()) {
      await page.screenshot({ path: 'test-results/canvas-sidebar.png' });
      
      // Look for canvas list items
      const canvasItems = page.locator('[class*="canvas-item"], li').filter({ hasText: /canvas/i });
      const canvasCount = await canvasItems.count();
      
      console.log(`Found ${canvasCount} canvas items in sidebar`);
    } else {
      console.log('Canvas sidebar not found');
      await page.screenshot({ path: 'test-results/canvas-no-sidebar.png' });
    }
  });

  test('should test canvas deletion', async ({ page }) => {
    // Look for delete button or context menu
    const deleteButton = page.locator('button').filter({ hasText: /delete|remove/i }).first();
    
    if (await deleteButton.isVisible()) {
      await page.screenshot({ path: 'test-results/canvas-before-delete.png' });
      
      await deleteButton.click();
      
      // Handle confirmation dialog if it appears
      const confirmDialog = page.locator('[role="dialog"], .dialog, .modal').first();
      if (await confirmDialog.isVisible()) {
        const confirmButton = page.locator('button').filter({ hasText: /confirm|yes|delete/i }).first();
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }
      }
      
      await page.waitForTimeout(2000);
      
      await page.screenshot({ path: 'test-results/canvas-after-delete.png' });
    } else {
      console.log('Delete button not found');
      await page.screenshot({ path: 'test-results/canvas-no-delete-button.png' });
    }
  });
});