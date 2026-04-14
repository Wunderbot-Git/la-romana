import { test, expect } from '@playwright/test';

test.describe('Event Management', () => {
    // Set up auth token before each test
    test.beforeEach(async ({ page }) => {
        // Navigate to an initial page first, then set localStorage
        await page.goto('/');
        await page.evaluate(() => {
            localStorage.setItem('auth_token', 'test-token');
        });
    });

    test('events list page loads', async ({ page }) => {
        await page.goto('/events');

        // Wait for page to load
        await page.waitForTimeout(1000);

        // Should see the header
        await expect(page.locator('h1', { hasText: 'My Events' })).toBeVisible();

        // Should see the join event link/button  
        await expect(page.locator('a[href="/events/join"]')).toBeVisible();
    });

    test('join event page has code input', async ({ page }) => {
        await page.goto('/events/join');

        // Wait for page to load
        await page.waitForTimeout(1000);

        // Should see the header
        await expect(page.locator('h1', { hasText: 'Join Event' })).toBeVisible();

        // Should have code input
        await expect(page.locator('input[type="text"]')).toBeVisible();
    });

    test('join event code input auto-capitalizes', async ({ page }) => {
        await page.goto('/events/join');
        await page.waitForTimeout(1000);

        const input = page.locator('input[type="text"]');

        // Type lowercase letters
        await input.fill('abc123');

        // Should be auto-capitalized
        await expect(input).toHaveValue('ABC123');
    });

    test('join event code input limits to 6 characters', async ({ page }) => {
        await page.goto('/events/join');
        await page.waitForTimeout(1000);

        const input = page.locator('input[type="text"]');

        // Type more than 6 characters
        await input.fill('ABCD1234567');

        // Should only have first 6
        await expect(input).toHaveValue('ABCD12');
    });

    test('join event button disabled with incomplete code', async ({ page }) => {
        await page.goto('/events/join');
        await page.waitForTimeout(1000);

        const input = page.locator('input[type="text"]');
        const button = page.locator('button[type="submit"]');

        // Type incomplete code
        await input.fill('ABC');

        // Button should be disabled
        await expect(button).toBeDisabled();

        // Complete the code
        await input.fill('ABC123');

        // Button should be enabled
        await expect(button).toBeEnabled();
    });

    test('events list has link to join page', async ({ page }) => {
        await page.goto('/events');
        await page.waitForTimeout(1000);

        // Click join event link
        await page.click('a[href="/events/join"]');

        // Should navigate to join page
        await expect(page).toHaveURL(/\/events\/join/);
    });
});
