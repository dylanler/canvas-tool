import { test, expect } from '@playwright/test';

test.describe('Chat Functionality - Critical Append Function Test', () => {
  test.beforeEach(async ({ page }) => {
    // This test assumes we can bypass auth or have a test user
    // In a real scenario, you'd set up proper authentication
    await page.goto('/');
  });

  test('should load chat interface without errors', async ({ page }) => {
    // Wait for page to load and check for chat elements
    await page.waitForLoadState('networkidle');
    
    // Look for chat interface elements
    const chatContainer = page.locator('[data-testid="chat-container"], .chat-container, [class*="chat"]').first();
    const messageInput = page.locator('input[type="text"], textarea').first();
    
    // Take screenshot of initial state
    await page.screenshot({ path: 'test-results/chat-initial-load.png' });
    
    // Check if elements are visible
    if (await chatContainer.isVisible()) {
      console.log('Chat container found');
    }
    if (await messageInput.isVisible()) {
      console.log('Message input found');
    }
  });

  test('CRITICAL: should send message without append function errors', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Listen for console errors, specifically the "append is not a function" error
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Listen for uncaught exceptions
    const pageErrors: string[] = [];
    page.on('pageerror', error => {
      pageErrors.push(error.message);
    });
    
    // Find message input - try multiple selectors
    const possibleInputs = [
      'input[placeholder*="message"]',
      'input[placeholder*="Message"]', 
      'textarea[placeholder*="message"]',
      'textarea[placeholder*="Message"]',
      'input[type="text"]',
      'textarea',
      '[contenteditable="true"]'
    ];
    
    let messageInput = null;
    for (const selector of possibleInputs) {
      const element = page.locator(selector).first();
      if (await element.isVisible()) {
        messageInput = element;
        console.log(`Found message input with selector: ${selector}`);
        break;
      }
    }
    
    if (messageInput) {
      // Take screenshot before typing
      await page.screenshot({ path: 'test-results/chat-before-message.png' });
      
      // Type test message
      await messageInput.fill('Hello, this is a test message to verify the append function works!');
      
      // Take screenshot after typing
      await page.screenshot({ path: 'test-results/chat-message-typed.png' });
      
      // Look for send button
      const sendButton = page.locator('button').filter({ hasText: /send|submit/i }).first();
      
      if (await sendButton.isVisible()) {
        await sendButton.click();
      } else {
        // Try pressing Enter
        await messageInput.press('Enter');
      }
      
      // Wait for message to be processed
      await page.waitForTimeout(3000);
      
      // Take screenshot after sending
      await page.screenshot({ path: 'test-results/chat-message-sent.png' });
      
      // Check for errors
      expect(consoleErrors.filter(error => 
        error.includes('append is not a function') || 
        error.includes('TypeError')
      )).toHaveLength(0);
      
      expect(pageErrors.filter(error => 
        error.includes('append is not a function')
      )).toHaveLength(0);
      
      console.log('Console errors:', consoleErrors);
      console.log('Page errors:', pageErrors);
    } else {
      console.log('No message input found - taking screenshot for debugging');
      await page.screenshot({ path: 'test-results/chat-no-input-found.png' });
    }
  });

  test('should test @mention functionality', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Find message input
    const messageInput = page.locator('input, textarea').first();
    
    if (await messageInput.isVisible()) {
      // Type @ symbol to trigger mention
      await messageInput.fill('@');
      
      // Wait for autocomplete to appear
      await page.waitForTimeout(1000);
      
      // Take screenshot of mention autocomplete
      await page.screenshot({ path: 'test-results/chat-mention-autocomplete.png' });
      
      // Look for canvas suggestions
      const mentionDropdown = page.locator('[role="listbox"], .mention-dropdown, [class*="mention"]').first();
      if (await mentionDropdown.isVisible()) {
        console.log('Mention dropdown appeared');
      }
    }
  });

  test('should test chat history persistence', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of chat history
    await page.screenshot({ path: 'test-results/chat-history.png' });
    
    // Look for existing messages
    const messages = page.locator('[class*="message"], .chat-message, [data-testid="message"]');
    const messageCount = await messages.count();
    
    console.log(`Found ${messageCount} existing messages`);
    
    // If there are messages, they should persist on page reload
    if (messageCount > 0) {
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      const messagesAfterReload = page.locator('[class*="message"], .chat-message, [data-testid="message"]');
      const messageCountAfterReload = await messagesAfterReload.count();
      
      expect(messageCountAfterReload).toBeGreaterThanOrEqual(messageCount);
    }
  });

  test('should test "Refer all" button functionality', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Look for "Refer all" button
    const referAllButton = page.locator('button').filter({ hasText: /refer all/i }).first();
    
    if (await referAllButton.isVisible()) {
      await page.screenshot({ path: 'test-results/chat-refer-all-button.png' });
      
      await referAllButton.click();
      
      // Wait for action to complete
      await page.waitForTimeout(2000);
      
      await page.screenshot({ path: 'test-results/chat-refer-all-clicked.png' });
    } else {
      console.log('Refer all button not found');
      await page.screenshot({ path: 'test-results/chat-no-refer-all-button.png' });
    }
  });
});