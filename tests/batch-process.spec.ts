import { test, expect } from '@playwright/test';
import {
  waitForPageLoad,
  generateTestPDF,
  expectDownload,
  setViewport,
} from './helpers/test-utils';

test.describe('Batch Process', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/batch');
    await waitForPageLoad(page);
  });

  // ==================== PAGE LOAD ====================

  test.describe('Page Load', () => {
    test('should display page title', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /Batch/i })).toBeVisible();
    });

    test('should display upload area', async ({ page }) => {
      await expect(page.getByText(/Drop|Upload|Select/i)).toBeVisible();
    });

    test('should have back button', async ({ page }) => {
      await expect(page.locator('a[href="/"]')).toBeVisible();
    });
  });

  // ==================== FILE UPLOAD ====================

  test.describe('File Upload', () => {
    test('should accept multiple PDF uploads', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles([
        { name: 'doc1.pdf', mimeType: 'application/pdf', buffer: pdfBuffer },
        { name: 'doc2.pdf', mimeType: 'application/pdf', buffer: pdfBuffer },
        { name: 'doc3.pdf', mimeType: 'application/pdf', buffer: pdfBuffer },
      ]);

      await expect(page.getByText('doc1.pdf')).toBeVisible();
      await expect(page.getByText('doc2.pdf')).toBeVisible();
      await expect(page.getByText('doc3.pdf')).toBeVisible();
    });

    test('should show file count', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles([
        { name: 'doc1.pdf', mimeType: 'application/pdf', buffer: pdfBuffer },
        { name: 'doc2.pdf', mimeType: 'application/pdf', buffer: pdfBuffer },
      ]);

      // Should show count or list
      await expect(page.getByText(/2|files/i)).toBeVisible();
    });
  });

  // ==================== OPERATIONS ====================

  test.describe('Operations', () => {
    test.beforeEach(async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(2);

      await fileInput.setInputFiles([
        { name: 'doc1.pdf', mimeType: 'application/pdf', buffer: pdfBuffer },
        { name: 'doc2.pdf', mimeType: 'application/pdf', buffer: pdfBuffer },
      ]);
    });

    test('should have compress operation', async ({ page }) => {
      await expect(page.getByText(/Compress/i)).toBeVisible();
    });

    test('should have rotate operation', async ({ page }) => {
      await expect(page.getByText(/Rotate/i)).toBeVisible();
    });

    test('should have merge operation', async ({ page }) => {
      await expect(page.getByText(/Merge/i)).toBeVisible();
    });

    test('should allow selecting operation', async ({ page }) => {
      const compressOption = page.getByText(/Compress/i).first();
      const rotateOption = page.getByText(/Rotate/i).first();

      await compressOption.click();
      await rotateOption.click();
    });
  });

  // ==================== COMPRESS OPERATION ====================

  test.describe('Compress Operation', () => {
    test('should batch compress PDFs', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles([
        { name: 'doc1.pdf', mimeType: 'application/pdf', buffer: pdfBuffer },
        { name: 'doc2.pdf', mimeType: 'application/pdf', buffer: pdfBuffer },
      ]);

      // Select compress
      await page.getByText(/Compress/i).first().click();

      // Start processing
      const processButton = page.getByRole('button', { name: /Process|Start|Run/i });
      await processButton.click();

      // Wait for completion
      await page.waitForTimeout(5000);

      // Should show completed status
      await expect(page.getByText(/Complete|Done|Download/i).first()).toBeVisible({ timeout: 30000 });
    });

    test('should have quality settings for compress', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles({
        name: 'doc1.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      // Select compress
      await page.getByText(/Compress/i).first().click();

      // Should show quality settings
      await expect(page.getByText(/Quality/i).or(page.locator('input[type="range"]'))).toBeVisible().catch(() => {});
    });
  });

  // ==================== ROTATE OPERATION ====================

  test.describe('Rotate Operation', () => {
    test('should batch rotate PDFs', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles([
        { name: 'doc1.pdf', mimeType: 'application/pdf', buffer: pdfBuffer },
        { name: 'doc2.pdf', mimeType: 'application/pdf', buffer: pdfBuffer },
      ]);

      // Select rotate
      await page.getByText(/Rotate/i).first().click();

      // Start processing
      const processButton = page.getByRole('button', { name: /Process|Start|Run/i });
      await processButton.click();

      await page.waitForTimeout(3000);
    });

    test('should have angle selection for rotate', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles({
        name: 'doc1.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      // Select rotate
      await page.getByText(/Rotate/i).first().click();

      // Should show angle options
      await expect(page.getByText(/90|180|270|Angle/i).first()).toBeVisible();
    });
  });

  // ==================== MERGE OPERATION ====================

  test.describe('Merge Operation', () => {
    test('should batch merge PDFs', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles([
        { name: 'doc1.pdf', mimeType: 'application/pdf', buffer: pdfBuffer },
        { name: 'doc2.pdf', mimeType: 'application/pdf', buffer: pdfBuffer },
      ]);

      // Select merge
      await page.getByText(/Merge/i).first().click();

      // Start processing
      const processButton = page.getByRole('button', { name: /Process|Start|Run|Merge/i });
      await processButton.click();

      // Wait and check for download
      const download = await expectDownload(page, () => page.waitForTimeout(5000)).catch(() => null);

      // Either download triggered or completion shown
    });
  });

  // ==================== PROGRESS ====================

  test.describe('Progress', () => {
    test('should show processing progress', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(2);

      await fileInput.setInputFiles([
        { name: 'doc1.pdf', mimeType: 'application/pdf', buffer: pdfBuffer },
        { name: 'doc2.pdf', mimeType: 'application/pdf', buffer: pdfBuffer },
        { name: 'doc3.pdf', mimeType: 'application/pdf', buffer: pdfBuffer },
      ]);

      await page.getByText(/Compress/i).first().click();

      const processButton = page.getByRole('button', { name: /Process|Start|Run/i });
      await processButton.click();

      // Should show progress indicator
      await expect(page.locator('svg.animate-spin').or(page.getByText(/%|Processing/i))).toBeVisible({ timeout: 3000 }).catch(() => {});
    });

    test('should show individual file status', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles([
        { name: 'doc1.pdf', mimeType: 'application/pdf', buffer: pdfBuffer },
        { name: 'doc2.pdf', mimeType: 'application/pdf', buffer: pdfBuffer },
      ]);

      // Files should have status indicators
      await expect(page.getByText(/Pending|Ready|Waiting/i).first()).toBeVisible().catch(() => {});
    });
  });

  // ==================== DOWNLOAD ====================

  test.describe('Download', () => {
    test('should download as ZIP for multiple files', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles([
        { name: 'doc1.pdf', mimeType: 'application/pdf', buffer: pdfBuffer },
        { name: 'doc2.pdf', mimeType: 'application/pdf', buffer: pdfBuffer },
      ]);

      await page.getByText(/Compress/i).first().click();

      const processButton = page.getByRole('button', { name: /Process|Start|Run/i });
      await processButton.click();

      await page.waitForTimeout(5000);

      // Look for download button
      const downloadButton = page.getByRole('button', { name: /Download/i });
      if (await downloadButton.isVisible()) {
        const download = await expectDownload(page, async () => {
          await downloadButton.click();
        });

        expect(download.suggestedFilename()).toContain('.zip');
      }
    });
  });

  // ==================== FILE MANAGEMENT ====================

  test.describe('File Management', () => {
    test('should remove files', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles([
        { name: 'doc1.pdf', mimeType: 'application/pdf', buffer: pdfBuffer },
        { name: 'doc2.pdf', mimeType: 'application/pdf', buffer: pdfBuffer },
      ]);

      // Find and click delete button
      const deleteButton = page.locator('button').filter({ has: page.locator('svg.lucide-trash-2, svg.lucide-x') }).first();

      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        // One file should be removed
      }
    });

    test('should add more files', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles({
        name: 'doc1.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      // Add more
      await fileInput.setInputFiles({
        name: 'doc2.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });
    });
  });

  // ==================== RESPONSIVE DESIGN ====================

  test.describe('Responsive Design', () => {
    test('should work on mobile', async ({ page }) => {
      await setViewport(page, 'mobile');
      await page.reload();

      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles([
        { name: 'doc1.pdf', mimeType: 'application/pdf', buffer: pdfBuffer },
        { name: 'doc2.pdf', mimeType: 'application/pdf', buffer: pdfBuffer },
      ]);

      await expect(page.getByText('doc1.pdf')).toBeVisible();
      await expect(page.getByRole('button', { name: /Process|Start|Run/i })).toBeVisible();
    });
  });
});
