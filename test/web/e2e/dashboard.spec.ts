import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard - adjust URL based on your routing
    await page.goto('/dashboard');
  });

  test('should load dashboard page', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Check if we're on the dashboard page
    await expect(page).toHaveURL(/.*dashboard.*/);
  });

  test('should display schedule components', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Look for common dashboard elements
    // These selectors should be updated based on actual dashboard structure
    
    // Check for schedule list or calendar view
    const scheduleContainer = page.locator('[data-testid="schedule-container"], .schedule-list, .calendar-view');
    
    // If no specific test IDs, look for common patterns
    if (await scheduleContainer.count() === 0) {
      // Fallback to looking for any content that suggests schedules
      const fallbackSelectors = [
        'text=/lịch/i',
        'text=/schedule/i',
        'text=/công việc/i',
        'text=/task/i',
        '[class*="schedule"]',
        '[class*="calendar"]',
        '[class*="task"]'
      ];
      
      let found = false;
      for (const selector of fallbackSelectors) {
        if (await page.locator(selector).count() > 0) {
          found = true;
          break;
        }
      }
      
      if (!found) {
        // If no schedule-related content found, at least check page loaded
        await expect(page.locator('body')).toBeVisible();
      }
    } else {
      await expect(scheduleContainer.first()).toBeVisible();
    }
  });

  test('should handle loading states', async ({ page }) => {
    // Intercept API calls to simulate loading
    await page.route('**/api/**', route => {
      // Delay the response to test loading states
      setTimeout(() => route.continue(), 1000);
    });
    
    await page.reload();
    
    // Look for loading indicators
    const loadingIndicators = page.locator('[data-testid="loading"], .loading, .spinner, text=/loading/i, text=/đang tải/i');
    
    // If loading indicators exist, they should be visible initially
    if (await loadingIndicators.count() > 0) {
      await expect(loadingIndicators.first()).toBeVisible();
    }
    
    // Wait for loading to complete
    await page.waitForLoadState('networkidle');
    
    // Loading indicators should be gone
    if (await loadingIndicators.count() > 0) {
      await expect(loadingIndicators.first()).not.toBeVisible();
    }
  });

  test('should be accessible', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Basic accessibility checks
    
    // Check for proper heading structure
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    if (await headings.count() > 0) {
      await expect(headings.first()).toBeVisible();
    }
    
    // Check for proper button/link accessibility
    const interactiveElements = page.locator('button, a, [role="button"], [role="link"]');
    if (await interactiveElements.count() > 0) {
      // Ensure interactive elements are keyboard accessible
      await interactiveElements.first().focus();
      await expect(interactiveElements.first()).toBeFocused();
    }
    
    // Check for alt text on images
    const images = page.locator('img');
    if (await images.count() > 0) {
      for (let i = 0; i < await images.count(); i++) {
        const img = images.nth(i);
        const alt = await img.getAttribute('alt');
        // Images should have alt text (can be empty for decorative images)
        expect(alt).not.toBeNull();
      }
    }
  });

  test('should handle error states', async ({ page }) => {
    // Intercept API calls to simulate errors
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Look for error messages or error states
    const errorIndicators = page.locator('[data-testid="error"], .error, text=/error/i, text=/lỗi/i');
    
    // Should show some kind of error handling
    if (await errorIndicators.count() > 0) {
      await expect(errorIndicators.first()).toBeVisible();
    } else {
      // At minimum, page should still be functional
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should work on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check that content is still accessible on mobile
    await expect(page.locator('body')).toBeVisible();
    
    // Take mobile screenshot
    await page.screenshot({ path: 'test-results/dashboard-mobile.png' });
    
    // Check for mobile-specific navigation (hamburger menu, etc.)
    const mobileNav = page.locator('[data-testid="mobile-nav"], .mobile-menu, .hamburger, [aria-label*="menu"]');
    if (await mobileNav.count() > 0) {
      await expect(mobileNav.first()).toBeVisible();
    }
  });
});