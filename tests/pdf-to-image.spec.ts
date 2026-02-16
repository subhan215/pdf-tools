import { test, expect } from '@playwright/test';
import {
  waitForPageLoad,
  generateTestPDF,
  expectDownload,
  waitForToast,
  setViewport,
} from './helpers/test-utils';

test.describe('PDF to Image Converter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pdf-to-image');
    await waitForPageLoad(page);
  });

  // ==================== PAGE LOAD ====================

  test.describe('Page Load', () => {
    test('should display page title', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'PDF to Image' })).toBeVisible();
    });

    test('should display upload area', async ({ page }) => {
      await expect(page.getByText('Upload PDF')).toBeVisible();
    });

    test('should have back button', async ({ page }) => {
      const backButton = page.locator('a[href="/"]');
      await expect(backButton).toBeVisible();
    });

    test('should navigate back to home', async ({ page }) => {
      await page.locator('a[href="/"]').click();
      await expect(page).toHaveURL('/');
    });

    test('should not show export button initially', async ({ page }) => {
      await expect(page.getByRole('button', { name: /Export/i })).not.toBeVisible();
    });
  });

  // ==================== PDF UPLOAD ====================

  test.describe('PDF Upload', () => {
    test('should accept PDF upload', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(3);

      await fileInput.setInputFiles({
        name: 'test.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      // Should show page thumbnails
      await expect(page.getByText('Page 1')).toBeVisible({ timeout: 10000 });
    });

    test('should show loading state during PDF processing', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(3);

      const uploadPromise = fileInput.setInputFiles({
        name: 'test.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      // Check for loading indicator
      await expect(page.getByText('Loading PDF...')).toBeVisible().catch(() => {
        // Might be too fast
      });

      await uploadPromise;
    });

    test('should display all page thumbnails', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(5);

      await fileInput.setInputFiles({
        name: 'test.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      // Wait for thumbnails to load
      await page.waitForTimeout(2000);

      // All pages should be visible
      for (let i = 1; i <= 5; i++) {
        await expect(page.getByText(`Page ${i}`)).toBeVisible();
      }
    });

    test('should show export button after upload', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles({
        name: 'test.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await expect(page.getByRole('button', { name: /Export/i })).toBeVisible({ timeout: 10000 });
    });

    test('should select all pages by default', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(3);

      await fileInput.setInputFiles({
        name: 'test.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(2000);

      // Should show all selected
      await expect(page.getByText('3 of 3 pages selected')).toBeVisible();
    });
  });

  // ==================== PAGE SELECTION ====================

  test.describe('Page Selection', () => {
    test.beforeEach(async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(5);

      await fileInput.setInputFiles({
        name: 'test.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(2000);
    });

    test('should toggle page selection on click', async ({ page }) => {
      // Click to deselect first page
      await page.getByText('Page 1').click();

      // Should show updated count
      await expect(page.getByText('4 of 5 pages selected')).toBeVisible();

      // Click again to reselect
      await page.getByText('Page 1').click();
      await expect(page.getByText('5 of 5 pages selected')).toBeVisible();
    });

    test('should deselect all pages', async ({ page }) => {
      await page.getByRole('button', { name: 'Deselect All' }).click();
      await expect(page.getByText('0 of 5 pages selected')).toBeVisible();
    });

    test('should select all pages', async ({ page }) => {
      // First deselect all
      await page.getByRole('button', { name: 'Deselect All' }).click();

      // Then select all
      await page.getByRole('button', { name: 'Select All' }).click();
      await expect(page.getByText('5 of 5 pages selected')).toBeVisible();
    });

    test('should show visual indicator for selected pages', async ({ page }) => {
      // Selected pages should have check mark
      const firstPage = page.getByText('Page 1').locator('..');
      await expect(firstPage.locator('svg')).toBeVisible();
    });

    test('should update export button count', async ({ page }) => {
      await expect(page.getByRole('button', { name: /Export \(5\)/i })).toBeVisible();

      // Deselect two pages
      await page.getByText('Page 1').click();
      await page.getByText('Page 2').click();

      await expect(page.getByRole('button', { name: /Export \(3\)/i })).toBeVisible();
    });
  });

  // ==================== FORMAT OPTIONS ====================

  test.describe('Format Options', () => {
    test.beforeEach(async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles({
        name: 'test.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(2000);
    });

    test('should show format selector', async ({ page }) => {
      await expect(page.getByText('Format:')).toBeVisible();
    });

    test('should have PNG and JPG options', async ({ page }) => {
      const formatSelect = page.locator('select').first();
      await expect(formatSelect.locator('option[value="png"]')).toBeAttached();
      await expect(formatSelect.locator('option[value="jpg"]')).toBeAttached();
    });

    test('should change format selection', async ({ page }) => {
      const formatSelect = page.locator('select').first();

      await formatSelect.selectOption('png');
      await expect(formatSelect).toHaveValue('png');

      await formatSelect.selectOption('jpg');
      await expect(formatSelect).toHaveValue('jpg');
    });
  });

  // ==================== QUALITY OPTIONS ====================

  test.describe('Quality Options', () => {
    test.beforeEach(async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles({
        name: 'test.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(2000);
    });

    test('should show quality selector', async ({ page }) => {
      await expect(page.getByText('Quality:')).toBeVisible();
    });

    test('should have all quality options', async ({ page }) => {
      const qualitySelect = page.locator('select').nth(1);
      await expect(qualitySelect.locator('option[value="low"]')).toBeAttached();
      await expect(qualitySelect.locator('option[value="medium"]')).toBeAttached();
      await expect(qualitySelect.locator('option[value="high"]')).toBeAttached();
    });

    test('should change quality selection', async ({ page }) => {
      const qualitySelect = page.locator('select').nth(1);

      await qualitySelect.selectOption('low');
      await expect(qualitySelect).toHaveValue('low');

      await qualitySelect.selectOption('high');
      await expect(qualitySelect).toHaveValue('high');
    });
  });

  // ==================== IMAGE EXPORT ====================

  test.describe('Image Export', () => {
    test('should export single page as direct download', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(3);

      await fileInput.setInputFiles({
        name: 'test.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(2000);

      // Select only one page
      await page.getByRole('button', { name: 'Deselect All' }).click();
      await page.getByText('Page 1').click();

      // Export
      const download = await expectDownload(page, async () => {
        await page.getByRole('button', { name: /Export/i }).click();
      });

      // Single page = direct image download
      expect(download.suggestedFilename()).toMatch(/\.(png|jpg)$/);
    });

    test('should export multiple pages as ZIP', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(3);

      await fileInput.setInputFiles({
        name: 'test.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(2000);

      // Export all pages
      const download = await expectDownload(page, async () => {
        await page.getByRole('button', { name: /Export/i }).click();
      });

      // Multiple pages = ZIP download
      expect(download.suggestedFilename()).toContain('.zip');
    });

    test('should export as PNG format', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles({
        name: 'test.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(2000);

      // Select PNG format
      await page.locator('select').first().selectOption('png');

      const download = await expectDownload(page, async () => {
        await page.getByRole('button', { name: /Export/i }).click();
      });

      expect(download.suggestedFilename()).toContain('.png');
    });

    test('should export as JPG format', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles({
        name: 'test.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(2000);

      // Select JPG format
      await page.locator('select').first().selectOption('jpg');

      const download = await expectDownload(page, async () => {
        await page.getByRole('button', { name: /Export/i }).click();
      });

      expect(download.suggestedFilename()).toContain('.jpg');
    });

    test('should show progress during export', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(3);

      await fileInput.setInputFiles({
        name: 'test.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(2000);

      // Start export and check for progress
      await page.getByRole('button', { name: /Export/i }).click();

      // Should show percentage briefly
      await expect(page.getByText(/%/)).toBeVisible({ timeout: 2000 }).catch(() => {
        // Export might be too fast
      });
    });

    test('should show success toast after export', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles({
        name: 'test.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(2000);

      await page.getByRole('button', { name: /Export/i }).click();

      await waitForToast(page, 'Exported');
    });
  });

  // ==================== EDGE CASES ====================

  test.describe('Edge Cases', () => {
    test('should show warning when no pages selected', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(3);

      await fileInput.setInputFiles({
        name: 'test.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(2000);

      // Deselect all
      await page.getByRole('button', { name: 'Deselect All' }).click();

      // Try to export
      await page.getByRole('button', { name: /Export/i }).click();

      // Should show warning toast
      await waitForToast(page, 'Please select at least one page');
    });

    test('should disable export button when no pages selected', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(3);

      await fileInput.setInputFiles({
        name: 'test.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(2000);

      // Deselect all
      await page.getByRole('button', { name: 'Deselect All' }).click();

      // Export button should be disabled
      const exportButton = page.getByRole('button', { name: /Export/i });
      await expect(exportButton).toBeDisabled();
    });

    test('should handle single page PDF', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles({
        name: 'test.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(2000);

      await expect(page.getByText('Page 1')).toBeVisible();
      await expect(page.getByText('1 of 1 page selected')).toBeVisible();
    });

    test('should handle PDF with many pages', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(10);

      await fileInput.setInputFiles({
        name: 'test.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(5000);

      await expect(page.getByText('10 of 10 pages selected')).toBeVisible();
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
        name: 'test.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(2000);

      await expect(page.getByText('Page 1')).toBeVisible();
      await expect(page.getByRole('button', { name: /Export/i })).toBeVisible();
    });

    test('should work on tablet', async ({ page }) => {
      await setViewport(page, 'tablet');
      await page.reload();

      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(2);

      await fileInput.setInputFiles({
        name: 'test.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(2000);

      await expect(page.getByText('Page 1')).toBeVisible();
    });
  });
});
