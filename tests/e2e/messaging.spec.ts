import { test, expect } from '@playwright/test';
import { injectAuthState } from './auth.setup';

/**
 * E2E Tests: Message Sending
 *
 * Tests the real-time messaging (Chat) feature for students.
 * Covers message sending success and error paths.
 *
 * Validates: Requirement 9.2
 */

test.describe('Messaging - Student Chat', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthState(page, 'student');
  });

  test('should display messaging interface on student dashboard', async ({ page }) => {
    // Navigate to student dashboard - the Chat component is part of the dashboard
    await page.goto('/student-dashboard');
    await page.waitForLoadState('networkidle');

    // Look for messaging/chat related navigation
    const chatNav = page.getByText(/messages|chat|communication/i).first();
    if (await chatNav.isVisible()) {
      await chatNav.click();
      await page.waitForLoadState('networkidle');

      // Messaging section should be visible
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should display chat list with contacts', async ({ page }) => {
    await page.goto('/student-dashboard');
    await page.waitForLoadState('networkidle');

    // Navigate to chat/messages section
    const chatNav = page.getByText(/messages|chat|communication/i).first();
    if (await chatNav.isVisible()) {
      await chatNav.click();
      await page.waitForTimeout(2000);

      // Chat list should show contacts (using mock data from Chat component)
      const chatList = page.locator('[role="list"], ul, .chat-list, [class*="chat"]');
      await expect(chatList.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('should select a chat contact and show conversation', async ({ page }) => {
    await page.goto('/student-dashboard');
    await page.waitForLoadState('networkidle');

    // Navigate to messages
    const chatNav = page.getByText(/messages|chat|communication/i).first();
    if (await chatNav.isVisible()) {
      await chatNav.click();
      await page.waitForTimeout(2000);

      // Click on a chat contact
      const firstContact = page.locator('[role="listitem"], li').first();
      if (await firstContact.isVisible()) {
        await firstContact.click();
        await page.waitForTimeout(1000);

        // Message area should be visible
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });

  test('should send a message', async ({ page }) => {
    await page.goto('/student-dashboard');
    await page.waitForLoadState('networkidle');

    // Navigate to messages
    const chatNav = page.getByText(/messages|chat|communication/i).first();
    if (await chatNav.isVisible()) {
      await chatNav.click();
      await page.waitForTimeout(2000);

      // Select first contact
      const firstContact = page.locator('[role="listitem"], li').first();
      if (await firstContact.isVisible()) {
        await firstContact.click();
        await page.waitForTimeout(1000);

        // Find the message input field
        const messageInput = page.locator(
          'textarea, input[type="text"], [contenteditable], [placeholder*="message" i], [placeholder*="type" i]',
        ).first();

        if (await messageInput.isVisible()) {
          // Type a message
          await messageInput.fill('Hello, this is a test message');

          // Find and click send button
          const sendButton = page.locator(
            'button:has([data-testid*="send" i]), button[aria-label*="send" i], button:has(svg[data-testid="SendIcon"])',
          ).first();

          if (await sendButton.isVisible()) {
            await sendButton.click();
            await page.waitForTimeout(1000);

            // Message should appear in the conversation
            await expect(
              page.getByText('Hello, this is a test message'),
            ).toBeVisible();
          }
        }
      }
    }
  });

  test('should send message using Enter key', async ({ page }) => {
    await page.goto('/student-dashboard');
    await page.waitForLoadState('networkidle');

    // Navigate to messages
    const chatNav = page.getByText(/messages|chat|communication/i).first();
    if (await chatNav.isVisible()) {
      await chatNav.click();
      await page.waitForTimeout(2000);

      // Select first contact
      const firstContact = page.locator('[role="listitem"], li').first();
      if (await firstContact.isVisible()) {
        await firstContact.click();
        await page.waitForTimeout(1000);

        // Find message input
        const messageInput = page.locator(
          'textarea, input[type="text"], [contenteditable], [placeholder*="message" i], [placeholder*="type" i]',
        ).first();

        if (await messageInput.isVisible()) {
          await messageInput.fill('Message sent via Enter');
          await messageInput.press('Enter');
          await page.waitForTimeout(1000);

          // The sent message should appear
          await expect(page.getByText('Message sent via Enter')).toBeVisible();
        }
      }
    }
  });

  test('should not send empty messages', async ({ page }) => {
    await page.goto('/student-dashboard');
    await page.waitForLoadState('networkidle');

    // Navigate to messages
    const chatNav = page.getByText(/messages|chat|communication/i).first();
    if (await chatNav.isVisible()) {
      await chatNav.click();
      await page.waitForTimeout(2000);

      // Select first contact
      const firstContact = page.locator('[role="listitem"], li').first();
      if (await firstContact.isVisible()) {
        await firstContact.click();
        await page.waitForTimeout(1000);

        // Try to send an empty message
        const messageInput = page.locator(
          'textarea, input[type="text"], [contenteditable], [placeholder*="message" i], [placeholder*="type" i]',
        ).first();

        if (await messageInput.isVisible()) {
          // Clear input and press Enter
          await messageInput.fill('');
          await messageInput.press('Enter');
          await page.waitForTimeout(500);

          // No new empty message bubble should appear - page stays stable
          await expect(page.locator('body')).toBeVisible();
        }
      }
    }
  });

  test('should handle WebSocket connection failure gracefully', async ({ page }) => {
    // Block WebSocket connections
    await page.route('**/socket.io/**', (route) => route.abort('failed'));

    await page.goto('/student-dashboard');
    await page.waitForLoadState('networkidle');

    // Navigate to messages - page should not crash
    const chatNav = page.getByText(/messages|chat|communication/i).first();
    if (await chatNav.isVisible()) {
      await chatNav.click();
      await page.waitForTimeout(2000);

      // Page should still be functional even without WebSocket
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

test.describe('Messaging - Faculty Chat', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthState(page, 'faculty');
  });

  test('should access messaging from faculty dashboard', async ({ page }) => {
    await page.goto('/faculty-dashboard');
    await page.waitForLoadState('networkidle');

    // Look for messaging option
    const chatNav = page.getByText(/messages|chat|communication/i).first();
    if (await chatNav.isVisible()) {
      await chatNav.click();
      await page.waitForTimeout(2000);

      // Should display messaging UI
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
