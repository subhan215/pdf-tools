import { test, expect } from '@playwright/test';
import { waitForPageLoad, toggleDarkMode, setViewport, VIEWPORTS, checkKeyboardNavigation } from './helpers/test-utils';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
  });

  // ==================== BASIC RENDERING ====================

  test.describe('Basic Rendering', () => {
    test('should load successfully', async ({ page }) => {
      await expect(page).toHaveTitle(/PDF Tools/);
    });

    test('should display header with logo and navigation', async ({ page }) => {
      // Logo
      await expect(page.locator('header')).toBeVisible();
      await expect(page.locator('header').getByText('PDF Tools')).toBeVisible();

      // Navigation links
      await expect(page.locator('header').getByText('Open Source')).toBeVisible();
    });

    test('should display hero section with USP messaging', async ({ page }) => {
      // Main headline
      await expect(page.getByRole('heading', { level: 1 }).first()).toContainText('Free PDF Tools');

      // Privacy badge
      await expect(page.getByText('Your files never leave your browser').first()).toBeVisible();

      // Subheadline
      await expect(page.getByText('100% Private. No Signup.')).toBeVisible();
    });

    test('should display feature pills', async ({ page }) => {
      await expect(page.getByText('No Upload')).toBeVisible();
      await expect(page.getByText('No Signup')).toBeVisible();
      await expect(page.getByText('Scan & Edit')).toBeVisible();
      await expect(page.getByText('Unlimited')).toBeVisible();
    });

    test('should display CTA button', async ({ page }) => {
      const ctaButton = page.getByRole('link', { name: /Start Collaborating/i });
      await expect(ctaButton).toBeVisible();
      await expect(ctaButton).toHaveAttribute('href', '/collaborate');
    });

    test('should display all 10 tools', async ({ page }) => {
      const toolNames = [
        'Collaborate',
        'Sign & Edit',
        'Image to PDF',
        'PDF to Image',
        'Merge PDFs',
        'Split PDF',
        'Compress PDF',
        'Fill Forms',
        'Add Watermark',
        'Batch Process',
      ];

      for (const toolName of toolNames) {
        await expect(page.getByRole('heading', { name: toolName, level: 3 })).toBeVisible();
      }
    });

    test('should display "How Collaborate Works" section', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'How Collaborate Works' })).toBeVisible();
      await expect(page.getByText('Start Session')).toBeVisible();
      await expect(page.getByText('Scan & Join')).toBeVisible();
      await expect(page.getByText('Edit Together')).toBeVisible();
    });

    test('should display "Why Choose Us" section', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Why Choose PDF Tools?' })).toBeVisible();
      await expect(page.getByText('100% Private')).toBeVisible();
      await expect(page.getByText('Real-time P2P Sync')).toBeVisible();
      await expect(page.getByText('No Limits')).toBeVisible();
    });

    test('should display footer', async ({ page }) => {
      await expect(page.locator('footer')).toBeVisible();
      await expect(page.locator('footer').getByText('100% free & open source')).toBeVisible();
    });
  });

  // ==================== NAVIGATION ====================

  test.describe('Navigation', () => {
    test('should navigate to Collaborate page', async ({ page }) => {
      await page.getByRole('link', { name: /Collaborate/i }).first().click();
      await expect(page).toHaveURL('/collaborate');
    });

    test('should navigate to Sign & Edit page', async ({ page }) => {
      await page.getByRole('link', { name: /Sign & Edit/i }).click();
      await expect(page).toHaveURL('/edit');
    });

    test('should navigate to Image to PDF page', async ({ page }) => {
      await page.getByRole('link', { name: /Image to PDF/i }).click();
      await expect(page).toHaveURL('/image-to-pdf');
    });

    test('should navigate to PDF to Image page', async ({ page }) => {
      await page.getByRole('link', { name: /PDF to Image/i }).click();
      await expect(page).toHaveURL('/pdf-to-image');
    });

    test('should navigate to Merge PDFs page', async ({ page }) => {
      await page.getByRole('link', { name: /Merge PDFs/i }).click();
      await expect(page).toHaveURL('/merge');
    });

    test('should navigate to Split PDF page', async ({ page }) => {
      await page.getByRole('link', { name: /Split PDF/i }).click();
      await expect(page).toHaveURL('/split');
    });

    test('should navigate to Compress PDF page', async ({ page }) => {
      await page.getByRole('link', { name: /Compress PDF/i }).click();
      await expect(page).toHaveURL('/compress');
    });

    test('should navigate to Fill Forms page', async ({ page }) => {
      await page.getByRole('link', { name: /Fill Forms/i }).click();
      await expect(page).toHaveURL('/fill');
    });

    test('should navigate to Add Watermark page', async ({ page }) => {
      await page.getByRole('link', { name: /Add Watermark/i }).click();
      await expect(page).toHaveURL('/watermark');
    });

    test('should navigate to Batch Process page', async ({ page }) => {
      await page.getByRole('link', { name: /Batch Process/i }).click();
      await expect(page).toHaveURL('/batch');
    });

    test('should have working back navigation', async ({ page }) => {
      await page.getByRole('link', { name: /Merge PDFs/i }).click();
      await expect(page).toHaveURL('/merge');
      await page.goBack();
      await expect(page).toHaveURL('/');
    });
  });

  // ==================== DARK MODE ====================

  test.describe('Dark Mode', () => {
    test('should toggle dark mode', async ({ page }) => {
      // Initial state - check theme toggle exists
      const themeButton = page.locator('button').filter({ has: page.locator('svg') }).last();
      await expect(themeButton).toBeVisible();

      // Click to toggle
      await themeButton.click();

      // Verify class changes on html element
      const html = page.locator('html');
      const classAfterClick = await html.getAttribute('class');

      // Click again
      await themeButton.click();
      const classAfterSecondClick = await html.getAttribute('class');

      // Classes should be different (cycling through themes)
      expect(classAfterClick).not.toBe(classAfterSecondClick);
    });

    test('should persist dark mode preference', async ({ page, context }) => {
      // Set dark mode
      const themeButton = page.locator('button').filter({ has: page.locator('svg') }).last();
      await themeButton.click();
      await themeButton.click(); // Click to get to dark

      // Check localStorage
      const theme = await page.evaluate(() => localStorage.getItem('theme'));
      expect(theme).toBeTruthy();

      // Reload page
      await page.reload();
      await waitForPageLoad(page);

      // Theme should persist
      const themeAfterReload = await page.evaluate(() => localStorage.getItem('theme'));
      expect(themeAfterReload).toBe(theme);
    });
  });

  // ==================== RESPONSIVE DESIGN ====================

  test.describe('Responsive Design', () => {
    test('should display correctly on mobile', async ({ page }) => {
      await setViewport(page, 'mobile');
      await page.reload();
      await waitForPageLoad(page);

      // Header should be visible
      await expect(page.locator('header')).toBeVisible();

      // Hero should be visible
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

      // Tools should stack vertically
      const tools = page.locator('section').filter({ hasText: 'All Tools' }).locator('a');
      await expect(tools.first()).toBeVisible();
    });

    test('should display correctly on tablet', async ({ page }) => {
      await setViewport(page, 'tablet');
      await page.reload();
      await waitForPageLoad(page);

      await expect(page.locator('header')).toBeVisible();
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });

    test('should display correctly on desktop', async ({ page }) => {
      await setViewport(page, 'desktop');
      await page.reload();
      await waitForPageLoad(page);

      await expect(page.locator('header')).toBeVisible();
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });

    test('should display correctly on large desktop', async ({ page }) => {
      await setViewport(page, 'largeDesktop');
      await page.reload();
      await waitForPageLoad(page);

      await expect(page.locator('header')).toBeVisible();
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });
  });

  // ==================== KEYBOARD NAVIGATION ====================

  test.describe('Keyboard Navigation', () => {
    test('should be navigable with keyboard', async ({ page }) => {
      // Press Tab and verify focus moves
      await page.keyboard.press('Tab');
      const firstFocused = await page.evaluate(() => document.activeElement?.tagName);
      expect(firstFocused).toBeTruthy();

      // Continue tabbing
      await page.keyboard.press('Tab');
      const secondFocused = await page.evaluate(() => document.activeElement?.tagName);
      expect(secondFocused).toBeTruthy();
    });

    test('should activate links with Enter key', async ({ page }) => {
      // Tab to first tool link
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
      }

      // Press Enter
      await page.keyboard.press('Enter');

      // Should navigate (URL should change)
      await page.waitForURL(/\/.+/);
    });
  });

  // ==================== PERFORMANCE ====================

  test.describe('Performance', () => {
    test('should load within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/');
      await waitForPageLoad(page);
      const loadTime = Date.now() - startTime;

      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('should have no console errors', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      await page.goto('/');
      await waitForPageLoad(page);

      // Filter out known acceptable errors (like favicon)
      const criticalErrors = errors.filter(
        (e) => !e.includes('favicon') && !e.includes('404')
      );

      expect(criticalErrors).toHaveLength(0);
    });
  });

  // ==================== SEO ====================

  test.describe('SEO', () => {
    test('should have proper meta tags', async ({ page }) => {
      // Title
      await expect(page).toHaveTitle(/PDF Tools/);

      // Description
      const description = page.locator('meta[name="description"]');
      await expect(description).toHaveAttribute('content', /.+/);

      // Keywords
      const keywords = page.locator('meta[name="keywords"]');
      await expect(keywords).toHaveAttribute('content', /.+/);
    });

    test('should have proper heading hierarchy', async ({ page }) => {
      // Should have exactly one H1
      const h1s = page.locator('h1');
      await expect(h1s).toHaveCount(1);

      // H2s should exist
      const h2s = page.locator('h2');
      expect(await h2s.count()).toBeGreaterThan(0);
    });

    test('should have alt text for images', async ({ page }) => {
      const images = page.locator('img');
      const count = await images.count();

      for (let i = 0; i < count; i++) {
        const img = images.nth(i);
        const alt = await img.getAttribute('alt');
        expect(alt).toBeTruthy();
      }
    });
  });
});
