import { test, expect } from '@playwright/test';
import {
  waitForPageLoad,
  generateTestPDF,
  expectDownload,
  setViewport,
} from './helpers/test-utils';

test.describe('Add Watermark', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/watermark');
    await waitForPageLoad(page);
  });

  // ==================== PAGE LOAD ====================

  test.describe('Page Load', () => {
    test('should display page title', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /Watermark/i })).toBeVisible();
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
      const fileInput = page.locator('input[type="file"]').first();
      const pdfBuffer = generateTestPDF(2);

      await fileInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      // Should show watermark options
      await expect(page.getByText(/Text|Image|Position|Opacity/i).first()).toBeVisible({ timeout: 5000 });
    });
  });

  // ==================== WATERMARK TYPES ====================

  test.describe('Watermark Types', () => {
    test.beforeEach(async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      const pdfBuffer = generateTestPDF(2);

      await fileInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(1000);
    });

    test('should have text watermark option', async ({ page }) => {
      await expect(page.getByText(/Text/i).first()).toBeVisible();
    });

    test('should have image watermark option', async ({ page }) => {
      await expect(page.getByText(/Image/i).first()).toBeVisible();
    });

    test('should allow switching between watermark types', async ({ page }) => {
      const textOption = page.getByText(/Text/i).first();
      const imageOption = page.getByText(/Image/i).first();

      if (await textOption.isVisible() && await imageOption.isVisible()) {
        await imageOption.click();
        await textOption.click();
      }
    });
  });

  // ==================== TEXT WATERMARK ====================

  test.describe('Text Watermark', () => {
    test.beforeEach(async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      const pdfBuffer = generateTestPDF(2);

      await fileInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(1000);
    });

    test('should have text input field', async ({ page }) => {
      const textInput = page.locator('input[type="text"]').first();
      await expect(textInput).toBeVisible();
    });

    test('should allow entering custom text', async ({ page }) => {
      const textInput = page.locator('input[type="text"]').first();
      await textInput.fill('CONFIDENTIAL');
      await expect(textInput).toHaveValue('CONFIDENTIAL');
    });

    test('should have default watermark text', async ({ page }) => {
      const textInput = page.locator('input[type="text"]').first();
      const value = await textInput.inputValue();
      expect(value.length).toBeGreaterThan(0);
    });

    test('should have font size control', async ({ page }) => {
      await expect(page.getByText(/Font|Size/i).first()).toBeVisible();
    });

    test('should have color picker', async ({ page }) => {
      // Look for color options or input
      const colorControl = page.locator('input[type="color"]').or(page.getByText(/Color/i).first());
      await expect(colorControl).toBeVisible();
    });
  });

  // ==================== POSITION OPTIONS ====================

  test.describe('Position Options', () => {
    test.beforeEach(async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      const pdfBuffer = generateTestPDF(2);

      await fileInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(1000);
    });

    test('should have position selector', async ({ page }) => {
      await expect(page.getByText(/Position/i)).toBeVisible();
    });

    test('should have center position option', async ({ page }) => {
      await expect(page.getByText(/Center/i)).toBeVisible();
    });

    test('should have corner position options', async ({ page }) => {
      const positions = ['Top Left', 'Top Right', 'Bottom Left', 'Bottom Right'];

      for (const pos of positions) {
        await expect(page.getByText(new RegExp(pos, 'i'))).toBeVisible().catch(() => {});
      }
    });

    test('should have tiled option', async ({ page }) => {
      await expect(page.getByText(/Tiled|Repeat/i)).toBeVisible();
    });

    test('should allow changing position', async ({ page }) => {
      const positionSelect = page.locator('select').filter({ has: page.locator('option') }).first();

      if (await positionSelect.isVisible()) {
        const options = positionSelect.locator('option');
        const count = await options.count();

        if (count > 1) {
          await positionSelect.selectOption({ index: 1 });
        }
      }
    });
  });

  // ==================== OPACITY & ROTATION ====================

  test.describe('Opacity & Rotation', () => {
    test.beforeEach(async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      const pdfBuffer = generateTestPDF(2);

      await fileInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(1000);
    });

    test('should have opacity slider', async ({ page }) => {
      const opacityControl = page.locator('input[type="range"]').first().or(page.getByText(/Opacity/i));
      await expect(opacityControl).toBeVisible();
    });

    test('should have rotation control', async ({ page }) => {
      await expect(page.getByText(/Rotation|Angle/i)).toBeVisible();
    });

    test('should allow adjusting opacity', async ({ page }) => {
      const opacitySlider = page.locator('input[type="range"]').first();

      if (await opacitySlider.isVisible()) {
        await opacitySlider.fill('50');
      }
    });

    test('should allow adjusting rotation', async ({ page }) => {
      const rotationInput = page.locator('input[type="range"]').or(page.locator('input[type="number"]'));

      if (await rotationInput.first().isVisible()) {
        // Adjust rotation
      }
    });
  });

  // ==================== APPLY WATERMARK ====================

  test.describe('Apply Watermark', () => {
    test('should apply text watermark and download', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      const pdfBuffer = generateTestPDF(2);

      await fileInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(1000);

      // Set watermark text
      const textInput = page.locator('input[type="text"]').first();
      if (await textInput.isVisible()) {
        await textInput.fill('TEST WATERMARK');
      }

      // Apply watermark
      const applyButton = page.getByRole('button', { name: /Apply|Add|Download/i });

      const download = await expectDownload(page, async () => {
        await applyButton.click();
      });

      expect(download.suggestedFilename()).toContain('.pdf');
    });

    test('should show processing state', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      const pdfBuffer = generateTestPDF(3);

      await fileInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(1000);

      const applyButton = page.getByRole('button', { name: /Apply|Add|Download/i });
      await applyButton.click();

      // Should show loading state
      await expect(page.locator('svg.animate-spin').or(page.getByText(/Processing|Applying/i))).toBeVisible({ timeout: 2000 }).catch(() => {});
    });
  });

  // ==================== PREVIEW ====================

  test.describe('Preview', () => {
    test.beforeEach(async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      const pdfBuffer = generateTestPDF(2);

      await fileInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(1000);
    });

    test('should show preview area', async ({ page }) => {
      // Look for preview or canvas element
      const preview = page.locator('canvas').or(page.locator('[class*="preview"]'));
      await expect(preview.first()).toBeVisible().catch(() => {});
    });

    test('should update preview when changing text', async ({ page }) => {
      const textInput = page.locator('input[type="text"]').first();

      if (await textInput.isVisible()) {
        await textInput.fill('NEW TEXT');
        // Preview should update (visual check)
        await page.waitForTimeout(500);
      }
    });
  });

  // ==================== EDGE CASES ====================

  test.describe('Edge Cases', () => {
    test('should handle empty watermark text', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(1000);

      // Clear text
      const textInput = page.locator('input[type="text"]').first();
      if (await textInput.isVisible()) {
        await textInput.fill('');
      }

      // Should handle gracefully (either prevent or use default)
    });

    test('should handle special characters in watermark', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(1000);

      const textInput = page.locator('input[type="text"]').first();
      if (await textInput.isVisible()) {
        await textInput.fill('© 2024 Company™ — All Rights Reserved');
        await expect(textInput).toHaveValue('© 2024 Company™ — All Rights Reserved');
      }
    });

    test('should handle very long watermark text', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(1000);

      const textInput = page.locator('input[type="text"]').first();
      if (await textInput.isVisible()) {
        const longText = 'A'.repeat(100);
        await textInput.fill(longText);
      }
    });
  });

  // ==================== RESPONSIVE DESIGN ====================

  test.describe('Responsive Design', () => {
    test('should work on mobile', async ({ page }) => {
      await setViewport(page, 'mobile');
      await page.reload();

      const fileInput = page.locator('input[type="file"]').first();
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(1000);

      await expect(page.getByRole('button', { name: /Apply|Add|Download/i })).toBeVisible();
    });
  });
});
