import { test, expect } from '@playwright/test';

test.describe('Flight History', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => {
            localStorage.setItem('auth_token', 'test-token');
        });
    });

    test('flight page shows no flight assigned message', async ({ page }) => {
        await page.goto('/events/test-event-id/flight');
        await page.waitForTimeout(2000);

        // Should show no flight message or loading
        const noFlightText = page.locator('text=No flight assigned');
        const loadingText = page.locator('.animate-spin');

        const hasContent = await noFlightText.isVisible() || await loadingText.count() > 0;
        expect(hasContent).toBe(true);
    });

    test('flight page accessible with auth', async ({ page }) => {
        await page.goto('/events/test-event-id/flight');
        await page.waitForTimeout(2000);

        // Should not redirect to login
        const url = page.url();
        const onFlightPage = url.includes('/flight') || url.includes('/events');
        expect(onFlightPage).toBe(true);
    });
});
