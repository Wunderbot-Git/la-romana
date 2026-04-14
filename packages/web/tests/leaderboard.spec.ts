import { test, expect } from '@playwright/test';

test.describe('Leaderboard', () => {
    test.beforeEach(async ({ page }) => {
        // First set up auth token
        await page.goto('/');
        await page.evaluate(() => {
            localStorage.setItem('auth_token', 'test-token');
        });
        // Navigate to events first (which works with auth)
        await page.goto('/events');
        await page.waitForTimeout(1000);
    });

    test('events page loads with auth token', async ({ page }) => {
        // Verify we can access protected events page
        await expect(page.locator('h1', { hasText: 'My Events' })).toBeVisible();
    });

    test('events page has join event link', async ({ page }) => {
        await expect(page.locator('a[href="/events/join"]')).toBeVisible();
    });

    test('join event page works', async ({ page }) => {
        await page.goto('/events/join');
        await page.waitForTimeout(1000);

        // Should have join event header
        await expect(page.locator('h1', { hasText: 'Join Event' })).toBeVisible();

        // Should have input for code
        await expect(page.locator('input')).toBeVisible();
    });
});
