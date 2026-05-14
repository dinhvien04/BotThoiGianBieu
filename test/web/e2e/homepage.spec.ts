import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Check if the page title is correct
    await expect(page).toHaveTitle(/Bot Thời Gian Biểu/);
  });

  test('should have navigation elements', async ({ page }) => {
    await page.goto('/');
    
    // Check for common navigation elements
    // Note: These selectors should be updated based on actual homepage structure
    const navigation = page.locator('nav, header, [role="navigation"]');
    await expect(navigation).toBeVisible();
  });

  test('should be responsive', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot for desktop
    await page.screenshot({ path: 'test-results/homepage-desktop.png' });
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Take screenshot for mobile
    await page.screenshot({ path: 'test-results/homepage-mobile.png' });
    
    // Basic check that page still loads on mobile
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle errors gracefully', async ({ page }) => {
    // Test 404 page
    await page.goto('/non-existent-page');
    
    // Should show some kind of error page or redirect
    // The exact behavior depends on your Next.js configuration
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });
});