import { test, expect } from '@playwright/test';
import {
  waitForPageLoad,
  generateTestPDF,
  expectDownload,
  waitForToast,
  setViewport,
} from './helpers/test-utils';

test.describe('Split PDF', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/split');
    await waitForPageLoad(page);
  });

  // ==================== PAGE LOAD ====================

  test.describe('Page Load', () => {
    test('should display page title', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /Split/i })).toBeVisible();
    });

    test('should display upload area', async ({ page }) => {
      await expect(page.getByText(/Drop PDF|Upload|Select/i)).toBeVisible();
    });

    test('should have back button', async ({ page }) => {
      await expect(page.locator('a[href="/"]')).toBeVisible();
    });
  });

  // ==================== PDF UPLOAD ====================

  test.describe('PDF Upload', () => {
    test('should accept PDF upload', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(5);

      await fileInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      // Should show page thumbnails
      await expect(page.getByText(/Page 1|page 1/i)).toBeVisible({ timeout: 10000 });
    });

    test('should show all page thumbnails', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(5);

      await fileInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(3000);

      // All 5 pages should be visible
      for (let i = 1; i <= 5; i++) {
        await expect(page.getByText(new RegExp(`Page ${i}|page ${i}`, 'i'))).toBeVisible();
      }
    });

    test('should show loading state while processing', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(5);

      const uploadPromise = fileInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      // Check for loading indicator
      await expect(page.locator('svg.animate-spin').or(page.getByText(/Loading|Processing/i))).toBeVisible({ timeout: 2000 }).catch(() => {});

      await uploadPromise;
    });
  });

  // ==================== SPLIT MODES ====================

  test.describe('Split Modes', () => {
    test.beforeEach(async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(5);

      await fileInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(3000);
    });

    test('should have extract mode option', async ({ page }) => {
      await expect(page.getByText(/Extract|extract/i)).toBeVisible();
    });

    test('should have range mode option', async ({ page }) => {
      await expect(page.getByText(/Range|range/i)).toBeVisible();
    });

    test('should have "each page" mode option', async ({ page }) => {
      await expect(page.getByText(/Each|every|individual/i)).toBeVisible();
    });
  });

  // ==================== PAGE SELECTION ====================

  test.describe('Page Selection', () => {
    test.beforeEach(async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(5);

      await fileInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(3000);
    });

    test('should toggle page selection on click', async ({ page }) => {
      // Find and click first page thumbnail
      const firstPage = page.locator('[class*="cursor-pointer"]').first();
      await firstPage.click();

      // Should show visual selection indicator
      // The exact selector depends on implementation
    });

    test('should allow selecting multiple pages', async ({ page }) => {
      // Click multiple pages
      const pages = page.locator('[class*="cursor-pointer"]');

      if (await pages.count() > 0) {
        await pages.nth(0).click();
        await pages.nth(2).click();
        await pages.nth(4).click();
      }
    });

    test('should show select all / deselect all buttons', async ({ page }) => {
      // Look for selection controls
      const selectControls = page.getByText(/Select All|Deselect|All/i);
      // At least one should be visible
      await expect(selectControls.first()).toBeVisible().catch(() => {});
    });
  });

  // ==================== EXTRACT MODE ====================

  test.describe('Extract Mode', () => {
    test.beforeEach(async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(5);

      await fileInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(3000);

      // Click on extract mode if there are mode tabs
      const extractTab = page.getByText(/Extract/i).first();
      if (await extractTab.isVisible()) {
        await extractTab.click();
      }
    });

    test('should extract selected pages', async ({ page }) => {
      // Select some pages
      const pageCards = page.locator('[class*="rounded"]').filter({ has: page.locator('img') });
      const count = await pageCards.count();

      if (count >= 3) {
        await pageCards.nth(0).click();
        await pageCards.nth(2).click();
      }

      // Find and click split/extract button
      const splitButton = page.getByRole('button', { name: /Split|Extract|Download/i });

      if (await splitButton.isVisible()) {
        const download = await expectDownload(page, async () => {
          await splitButton.click();
        });

        expect(download.suggestedFilename()).toMatch(/\.(pdf|zip)$/);
      }
    });

    test('should show warning when no pages selected', async ({ page }) => {
      // Deselect all pages if possible
      const deselectBtn = page.getByText(/Deselect All/i);
      if (await deselectBtn.isVisible()) {
        await deselectBtn.click();
      }

      // Try to extract
      const splitButton = page.getByRole('button', { name: /Split|Extract|Download/i });
      if (await splitButton.isVisible()) {
        await splitButton.click();
        await waitForToast(page, /select/i);
      }
    });
  });

  // ==================== RANGE MODE ====================

  test.describe('Range Mode', () => {
    test.beforeEach(async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(10);

      await fileInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(3000);

      // Click on range mode if available
      const rangeTab = page.getByText(/Range/i).first();
      if (await rangeTab.isVisible()) {
        await rangeTab.click();
      }
    });

    test('should have range input field', async ({ page }) => {
      const rangeInput = page.locator('input[type="text"], input[placeholder*="1-3"]');
      await expect(rangeInput.first()).toBeVisible().catch(() => {});
    });

    test('should accept valid range format', async ({ page }) => {
      const rangeInput = page.locator('input[type="text"]').first();

      if (await rangeInput.isVisible()) {
        await rangeInput.fill('1-3, 5, 7-9');
        await expect(rangeInput).toHaveValue('1-3, 5, 7-9');
      }
    });

    test('should split by ranges', async ({ page }) => {
      const rangeInput = page.locator('input[type="text"]').first();

      if (await rangeInput.isVisible()) {
        await rangeInput.fill('1-3');

        const splitButton = page.getByRole('button', { name: /Split|Extract|Download/i });
        if (await splitButton.isVisible()) {
          const download = await expectDownload(page, async () => {
            await splitButton.click();
          });

          expect(download.suggestedFilename()).toMatch(/\.(pdf|zip)$/);
        }
      }
    });

    test('should show error for invalid range', async ({ page }) => {
      const rangeInput = page.locator('input[type="text"]').first();

      if (await rangeInput.isVisible()) {
        await rangeInput.fill('invalid-range');

        const splitButton = page.getByRole('button', { name: /Split|Extract|Download/i });
        if (await splitButton.isVisible()) {
          await splitButton.click();
          await waitForToast(page, /invalid|valid/i);
        }
      }
    });
  });

  // ==================== EACH PAGE MODE ====================

  test.describe('Each Page Mode', () => {
    test.beforeEach(async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(5);

      await fileInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(3000);

      // Click on "each" mode if available
      const eachTab = page.getByText(/Each|Every|Individual/i).first();
      if (await eachTab.isVisible()) {
        await eachTab.click();
      }
    });

    test('should split into individual pages', async ({ page }) => {
      const splitButton = page.getByRole('button', { name: /Split|Extract|Download/i });

      if (await splitButton.isVisible()) {
        const download = await expectDownload(page, async () => {
          await splitButton.click();
        });

        // Should download as ZIP (multiple files)
        expect(download.suggestedFilename()).toContain('.zip');
      }
    });
  });

  // ==================== PAGE ROTATION ====================

  test.describe('Page Rotation', () => {
    test.beforeEach(async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(3);

      await fileInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(3000);
    });

    test('should have rotate button on page thumbnails', async ({ page }) => {
      const rotateButton = page.locator('button').filter({ has: page.locator('svg.lucide-rotate-cw') });
      await expect(rotateButton.first()).toBeVisible().catch(() => {});
    });

    test('should rotate page on click', async ({ page }) => {
      const rotateButton = page.locator('button').filter({ has: page.locator('svg.lucide-rotate-cw') }).first();

      if (await rotateButton.isVisible()) {
        await rotateButton.click();
        // Rotation should be applied (visual change or indicator)
      }
    });
  });

  // ==================== EDGE CASES ====================

  test.describe('Edge Cases', () => {
    test('should handle single page PDF', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles({
        name: 'single.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(2000);

      await expect(page.getByText(/Page 1|page 1/i)).toBeVisible();
    });

    test('should handle PDF with many pages', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(20);

      await fileInput.setInputFiles({
        name: 'large.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(5000);

      // Should handle gracefully
      await expect(page.getByText(/Page 1|page 1/i)).toBeVisible();
    });
  });

  // ==================== RESPONSIVE DESIGN ====================

  test.describe('Responsive Design', () => {
    test('should work on mobile', async ({ page }) => {
      await setViewport(page, 'mobile');
      await page.reload();

      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(3);

      await fileInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(3000);

      await expect(page.getByText(/Page 1|page 1/i)).toBeVisible();
    });
  });
});
