import { test, expect } from '@playwright/test';

test.describe('Homepage — Landing', () => {
  test('có title và meta description chuẩn SEO', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveTitle(/Productivity Flow/i);

    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).toBeTruthy();
    expect(description!.length).toBeGreaterThan(50);

    // OG tags
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /Productivity Flow/);
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'website');

    // Canonical
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);

    // JSON-LD
    const jsonLd = page.locator('script[type="application/ld+json"]');
    await expect(jsonLd).toHaveCount(1);
    const ldText = await jsonLd.textContent();
    expect(ldText).toContain('SoftwareApplication');
    expect(ldText).toContain('WebSite');
  });

  test('có đúng 1 thẻ H1 trên landing', async ({ page }) => {
    await page.goto('/');
    const h1 = page.locator('main h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toContainText(/Chatbot|sự kiện|Mezon/i);
  });

  test('có navigation header', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('header nav').first()).toBeVisible();
  });

  test('responsive desktop & mobile + screenshot', async ({ page }) => {
    // Desktop
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/homepage-desktop.png', fullPage: true });
    await expect(page.locator('header nav').first()).toBeVisible();

    // Mobile
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/homepage-mobile.png', fullPage: true });

    // Nav desktop bị ẩn trên mobile, hamburger phải có
    const hamburger = page.getByRole('button', { name: /Mở menu/i });
    await expect(hamburger).toBeVisible();

    // Click hamburger -> drawer hiện
    await hamburger.click();
    await expect(page.locator('#mobile-nav')).toBeVisible();
  });

  test('robots.txt và sitemap.xml accessible', async ({ page }) => {
    const robots = await page.request.get('/robots.txt');
    expect(robots.ok()).toBeTruthy();
    const robotsBody = await robots.text();
    expect(robotsBody).toContain('Sitemap:');
    expect(robotsBody).toContain('Disallow: /dashboard');

    const sitemap = await page.request.get('/sitemap.xml');
    expect(sitemap.ok()).toBeTruthy();
    const sitemapBody = await sitemap.text();
    expect(sitemapBody).toContain('<urlset');
    expect(sitemapBody).toContain('/dang-nhap');
  });

  test('trang đăng nhập có noindex', async ({ page }) => {
    await page.goto('/dang-nhap');
    const robotsMeta = page.locator('meta[name="robots"]');
    await expect(robotsMeta).toHaveAttribute('content', /noindex/);
  });

  test('xử lý 404 không crash', async ({ page }) => {
    const response = await page.goto('/non-existent-page-12345');
    expect(response?.status()).toBe(404);
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
  });
});
