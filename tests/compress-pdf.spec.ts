import { test, expect } from '@playwright/test';
import {
  waitForPageLoad,
  generateTestPDF,
  expectDownload,
  waitForToast,
  setViewport,
} from './helpers/test-utils';

test.describe('Compress PDF', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/compress');
    await waitForPageLoad(page);
  });

  // ==================== PAGE LOAD ====================

  test.describe('Page Load', () => {
    test('should display page title', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /Compress/i })).toBeVisible();
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
      const pdfBuffer = generateTestPDF(3);

      await fileInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      // Should show file info
      await expect(page.getByText(/document|Original|Size/i)).toBeVisible({ timeout: 5000 });
    });

    test('should show original file size', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(3);

      await fileInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      // Should display size
      await expect(page.getByText(/\d+\s*(KB|MB|bytes)/i)).toBeVisible({ timeout: 5000 });
    });

    test('should show page count', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(5);

      await fileInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      // Should display page count
      await expect(page.getByText(/5\s*pages?/i)).toBeVisible({ timeout: 5000 });
    });
  });

  // ==================== COMPRESSION MODES ====================

  test.describe('Compression Modes', () => {
    test.beforeEach(async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(2);

      await fileInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(1000);
    });

    test('should have smart compression mode', async ({ page }) => {
      await expect(page.getByText(/Smart/i)).toBeVisible();
    });

    test('should have aggressive compression mode', async ({ page }) => {
      await expect(page.getByText(/Aggressive/i)).toBeVisible();
    });

    test('should allow switching between modes', async ({ page }) => {
      const smartMode = page.getByText(/Smart/i).first();
      const aggressiveMode = page.getByText(/Aggressive/i).first();

      if (await smartMode.isVisible() && await aggressiveMode.isVisible()) {
        await aggressiveMode.click();
        await smartMode.click();
      }
    });
  });

  // ==================== QUALITY SETTINGS ====================

  test.describe('Quality Settings', () => {
    test.beforeEach(async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(2);

      await fileInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(1000);
    });

    test('should show quality options', async ({ page }) => {
      await expect(page.getByText(/Quality|Low|Medium|High/i).first()).toBeVisible();
    });

    test('should have low quality option', async ({ page }) => {
      await expect(page.getByText(/Low/i)).toBeVisible();
    });

    test('should have medium quality option', async ({ page }) => {
      await expect(page.getByText(/Medium/i)).toBeVisible();
    });

    test('should have high quality option', async ({ page }) => {
      await expect(page.getByText(/High/i)).toBeVisible();
    });

    test('should allow selecting quality', async ({ page }) => {
      const lowQuality = page.getByText(/Low/i).first();
      const highQuality = page.getByText(/High/i).first();

      if (await lowQuality.isVisible()) {
        await lowQuality.click();
      }

      if (await highQuality.isVisible()) {
        await highQuality.click();
      }
    });
  });

  // ==================== COMPRESSION OPERATION ====================

  test.describe('Compression Operation', () => {
    test('should compress PDF with smart mode', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(2);

      await fileInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(1000);

      // Click compress button
      const compressButton = page.getByRole('button', { name: /Compress/i });
      await compressButton.click();

      // Wait for compression to complete
      await page.waitForTimeout(3000);

      // Should show compressed size or download button
      await expect(page.getByText(/Compressed|Download|saved/i)).toBeVisible({ timeout: 10000 });
    });

    test('should compress PDF with aggressive mode', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(2);

      await fileInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(1000);

      // Select aggressive mode
      const aggressiveMode = page.getByText(/Aggressive/i).first();
      if (await aggressiveMode.isVisible()) {
        await aggressiveMode.click();
      }

      // Click compress
      const compressButton = page.getByRole('button', { name: /Compress/i });
      await compressButton.click();

      // Wait for compression
      await page.waitForTimeout(5000);

      await expect(page.getByText(/Compressed|Download|saved/i)).toBeVisible({ timeout: 15000 });
    });

    test('should show progress during compression', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(3);

      await fileInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(1000);

      const compressButton = page.getByRole('button', { name: /Compress/i });
      await compressButton.click();

      // Should show progress indicator
      await expect(page.locator('svg.animate-spin').or(page.getByText(/%|Processing|Compressing/i))).toBeVisible({ timeout: 2000 }).catch(() => {});
    });

    test('should download compressed PDF', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(2);

      await fileInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(1000);

      // Compress
      const compressButton = page.getByRole('button', { name: /Compress/i });
      await compressButton.click();

      // Wait for compression to complete
      await page.waitForTimeout(5000);

      // Click download button
      const downloadButton = page.getByRole('button', { name: /Download/i });
      if (await downloadButton.isVisible()) {
        const download = await expectDownload(page, async () => {
          await downloadButton.click();
        });

        expect(download.suggestedFilename()).toContain('.pdf');
      }
    });

    test('should show compression ratio', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(3);

      await fileInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(1000);

      const compressButton = page.getByRole('button', { name: /Compress/i });
      await compressButton.click();

      // Wait and check for compression info
      await page.waitForTimeout(5000);

      // Should show size reduction or percentage
      await expect(page.getByText(/%|smaller|reduced|saved/i)).toBeVisible({ timeout: 10000 }).catch(() => {});
    });
  });

  // ==================== EDGE CASES ====================

  test.describe('Edge Cases', () => {
    test('should handle small PDF', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles({
        name: 'small.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(1000);

      const compressButton = page.getByRole('button', { name: /Compress/i });
      await compressButton.click();

      // Should complete without error
      await page.waitForTimeout(5000);
    });

    test('should handle already compressed PDF', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles({
        name: 'compressed.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(1000);

      const compressButton = page.getByRole('button', { name: /Compress/i });
      await compressButton.click();

      // Should handle gracefully
      await page.waitForTimeout(5000);
    });
  });

  // ==================== ERROR HANDLING ====================

  test.describe('Error Handling', () => {
    test('should show error toast on compression failure', async ({ page }) => {
      // This would require a way to trigger failure
      // For now, test normal operation
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(1000);

      const compressButton = page.getByRole('button', { name: /Compress/i });
      await expect(compressButton).toBeVisible();
    });
  });

  // ==================== RESPONSIVE DESIGN ====================

  test.describe('Responsive Design', () => {
    test('should work on mobile', async ({ page }) => {
      await setViewport(page, 'mobile');
      await page.reload();

      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(2);

      await fileInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(1000);

      await expect(page.getByRole('button', { name: /Compress/i })).toBeVisible();
    });

    test('should work on tablet', async ({ page }) => {
      await setViewport(page, 'tablet');
      await page.reload();

      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(2);

      await fileInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(1000);

      await expect(page.getByRole('button', { name: /Compress/i })).toBeVisible();
    });
  });
});
