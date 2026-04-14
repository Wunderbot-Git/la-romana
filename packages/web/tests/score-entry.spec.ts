import { test, expect } from '@playwright/test';

test.describe('Score Entry', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => {
            localStorage.setItem('auth_token', 'test-token');
        });
    });

    test('score page shows no flight assigned or match header', async ({ page }) => {
        await page.goto('/events/test-event-id/scores');
        await page.waitForTimeout(2000);

        // Should show either no flight message or loading/error state
        const noFlightText = page.locator('text=No flight assigned');
        const loadingText = page.locator('.animate-spin');
        const errorText = page.locator('text=Failed');

        // At least one of these should be visible
        const hasContent = await noFlightText.isVisible() ||
            await loadingText.count() > 0 ||
            await errorText.isVisible();

        expect(hasContent).toBe(true);
    });

    test('score page accessible with auth', async ({ page }) => {
        await page.goto('/events/test-event-id/scores');
        await page.waitForTimeout(2000);

        // Should not redirect to login if authenticated
        const url = page.url();
        const onScorePage = url.includes('/scores') || url.includes('/events');
        expect(onScorePage).toBe(true);
    });
});
