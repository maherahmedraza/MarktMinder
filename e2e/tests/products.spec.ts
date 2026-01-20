import { test, expect } from '@playwright/test';

test.describe('Products Management', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to login before each test
        await page.goto('/login');
        await page.fill('input[name="email"]', 'test@example.com');
        await page.fill('input[name="password"]', 'Password123!');
        await page.click('button[type="submit"]');
        // Wait for navigation to dashboard - validation dependent on backend state
        // await page.waitForURL('/dashboard'); 
    });

    test('should display products dashboard', async ({ page }) => {
        await page.goto('/dashboard/products');

        // Check for the main heading "Asset Ledger"
        await expect(page.locator('h1')).toContainText('Asset Ledger');

        // Check for Add Product button (if it exists when no products or with products)
        // The text on button is "Add Product" or "Add your first product"
        // We can look for the link
        const addLink = page.locator('a[href="/dashboard/products/add"]');
        await expect(addLink).toBeVisible();
    });

    test('should allow navigating to add product page', async ({ page }) => {
        await page.goto('/dashboard/products');
        await page.getByRole('link', { name: /Add.*Product/i }).first().click();
        await expect(page).toHaveURL(/.*\/dashboard\/products\/add/);
    });
});
