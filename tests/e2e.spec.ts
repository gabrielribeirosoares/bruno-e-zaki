import { test, expect } from '@playwright/test';

test.describe('Bruno & Zaki Garage Diecast - E2E', () => {
  test('HomePage loads and displays catalog', async ({ page }) => {
    // Navigate to the root
    await page.goto('/');

    // Wait for the main elements to load (e.g. catalog grid)
    // Replace '.miniature-card' with the actual class or data-testid used
    // await expect(page.locator('text=Bruno & Zaki')).toBeVisible();
    
    // Example: Check if the cart button exists
    // await expect(page.locator('button', { hasText: 'Carrinho' })).toBeVisible();
  });

  test('User can navigate to auth page', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();
  });
});
