import { test, expect } from '@playwright/test';

test.describe('Alerts Management', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to login before each test
        await page.goto('/login');
        await page.fill('input[name="email"]', 'test@example.com');
        await page.fill('input[name="password"]', 'Password123!');
        await page.click('button[type="submit"]');
    });

    test('should display alerts dashboard', async ({ page }) => {
        await page.goto('/dashboard/alerts');

        // Check for the main heading "Signal Alerts"
        await expect(page.locator('h1')).toContainText('Signal Alerts');

        // Check for Initialize Alert button logic (button text can be "INITIALIZE_ALERT")
        await expect(page.getByText('INITIALIZE_ALERT')).toBeVisible();
    });

    test('should verify empty state or list state', async ({ page }) => {
        await page.goto('/dashboard/alerts');

        // We can't easily predict if it's empty or not without seeding db, 
        // but we can check if EITHER the empty state card OR the table exists.

        // Empty state has text "No Signals Active"
        const emptyState = page.getByText('No Signals Active');

        // Table header "Trigger Type"
        const tableHeader = page.getByText('Trigger Type');

        await expect(emptyState.or(tableHeader).first()).toBeVisible();
    });
});
