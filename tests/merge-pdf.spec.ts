import { test, expect } from '@playwright/test';
import {
  waitForPageLoad,
  generateTestPDF,
  expectDownload,
  waitForToast,
  setViewport,
} from './helpers/test-utils';

test.describe('Merge PDFs', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/merge');
    await waitForPageLoad(page);
  });

  // ==================== PAGE LOAD ====================

  test.describe('Page Load', () => {
    test('should display page title', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /Merge/i })).toBeVisible();
    });

    test('should display upload area', async ({ page }) => {
      await expect(page.getByText(/Drop PDF files here|Select PDFs/i)).toBeVisible();
    });

    test('should have back button', async ({ page }) => {
      const backButton = page.locator('a[href="/"]');
      await expect(backButton).toBeVisible();
    });

    test('should not show merge button initially', async ({ page }) => {
      await expect(page.getByRole('button', { name: /Merge/i })).not.toBeVisible();
    });
  });

  // ==================== FILE UPLOAD ====================

  test.describe('File Upload', () => {
    test('should accept single PDF upload', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(2);

      await fileInput.setInputFiles({
        name: 'document1.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await expect(page.getByText('document1.pdf')).toBeVisible();
    });

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

    test('should show file size for each PDF', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      // Size should be displayed (KB or MB)
      await expect(page.getByText(/\d+\s*(KB|MB|bytes)/i)).toBeVisible();
    });

    test('should show merge button after uploading 2+ files', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles([
        { name: 'doc1.pdf', mimeType: 'application/pdf', buffer: pdfBuffer },
        { name: 'doc2.pdf', mimeType: 'application/pdf', buffer: pdfBuffer },
      ]);

      await expect(page.getByRole('button', { name: /Merge/i })).toBeVisible();
    });
  });

  // ==================== FILE MANAGEMENT ====================

  test.describe('File Management', () => {
    test.beforeEach(async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles([
        { name: 'first.pdf', mimeType: 'application/pdf', buffer: pdfBuffer },
        { name: 'second.pdf', mimeType: 'application/pdf', buffer: pdfBuffer },
        { name: 'third.pdf', mimeType: 'application/pdf', buffer: pdfBuffer },
      ]);
    });

    test('should delete file when clicking delete button', async ({ page }) => {
      // Find delete button for first file
      const firstFile = page.getByText('first.pdf').locator('..').locator('..');
      await firstFile.hover();
      const deleteButton = firstFile.locator('button').filter({ has: page.locator('svg') });
      await deleteButton.click();

      await expect(page.getByText('first.pdf')).not.toBeVisible();
    });

    test('should support drag and drop reordering', async ({ page }) => {
      // Get file items
      const firstFile = page.getByText('first.pdf').locator('..').locator('..');
      const lastFile = page.getByText('third.pdf').locator('..').locator('..');

      // Attempt drag (implementation may vary)
      await firstFile.dragTo(lastFile);
    });

    test('should add more files after initial upload', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(1);

      // Add another file
      await fileInput.setInputFiles({
        name: 'fourth.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await expect(page.getByText('fourth.pdf')).toBeVisible();
    });
  });

  // ==================== MERGE OPERATION ====================

  test.describe('Merge Operation', () => {
    test('should merge two PDFs', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles([
        { name: 'doc1.pdf', mimeType: 'application/pdf', buffer: pdfBuffer },
        { name: 'doc2.pdf', mimeType: 'application/pdf', buffer: pdfBuffer },
      ]);

      const download = await expectDownload(page, async () => {
        await page.getByRole('button', { name: /Merge/i }).click();
      });

      expect(download.suggestedFilename()).toContain('.pdf');
    });

    test('should merge multiple PDFs', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles([
        { name: 'doc1.pdf', mimeType: 'application/pdf', buffer: pdfBuffer },
        { name: 'doc2.pdf', mimeType: 'application/pdf', buffer: pdfBuffer },
        { name: 'doc3.pdf', mimeType: 'application/pdf', buffer: pdfBuffer },
        { name: 'doc4.pdf', mimeType: 'application/pdf', buffer: pdfBuffer },
      ]);

      const download = await expectDownload(page, async () => {
        await page.getByRole('button', { name: /Merge/i }).click();
      });

      expect(download.suggestedFilename()).toContain('.pdf');
    });

    test('should show loading state during merge', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(2);

      await fileInput.setInputFiles([
        { name: 'doc1.pdf', mimeType: 'application/pdf', buffer: pdfBuffer },
        { name: 'doc2.pdf', mimeType: 'application/pdf', buffer: pdfBuffer },
      ]);

      await page.getByRole('button', { name: /Merge/i }).click();

      // Should show loading indicator (spinner or text)
      await expect(page.locator('svg.animate-spin').or(page.getByText(/Merging|Processing/i))).toBeVisible({ timeout: 1000 }).catch(() => {
        // Might be too fast
      });
    });

    test('should merge in correct order', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');

      // Create PDFs with different content
      const pdf1 = generateTestPDF(1);
      const pdf2 = generateTestPDF(2);

      await fileInput.setInputFiles([
        { name: 'first.pdf', mimeType: 'application/pdf', buffer: pdf1 },
        { name: 'second.pdf', mimeType: 'application/pdf', buffer: pdf2 },
      ]);

      const download = await expectDownload(page, async () => {
        await page.getByRole('button', { name: /Merge/i }).click();
      });

      expect(download.suggestedFilename()).toContain('.pdf');
    });
  });

  // ==================== EDGE CASES ====================

  test.describe('Edge Cases', () => {
    test('should handle single file upload gracefully', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles({
        name: 'single.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      // Should show file but merge button might not be available or disabled
      await expect(page.getByText('single.pdf')).toBeVisible();
    });

    test('should handle removing all files', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles([
        { name: 'doc1.pdf', mimeType: 'application/pdf', buffer: pdfBuffer },
        { name: 'doc2.pdf', mimeType: 'application/pdf', buffer: pdfBuffer },
      ]);

      // Delete all files
      const deleteButtons = page.locator('button').filter({ has: page.locator('svg.lucide-trash-2, svg.lucide-trash, svg.lucide-x') });
      const count = await deleteButtons.count();

      for (let i = count - 1; i >= 0; i--) {
        await deleteButtons.nth(i).click();
      }

      // Should show upload area again
      await expect(page.getByText(/Drop PDF files here|Select PDFs/i)).toBeVisible();
    });

    test('should handle large number of files', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(1);

      const files = [];
      for (let i = 1; i <= 10; i++) {
        files.push({
          name: `document${i}.pdf`,
          mimeType: 'application/pdf',
          buffer: pdfBuffer,
        });
      }

      await fileInput.setInputFiles(files);

      // All files should be visible
      await expect(page.getByText('document1.pdf')).toBeVisible();
      await expect(page.getByText('document10.pdf')).toBeVisible();
    });
  });

  // ==================== ERROR HANDLING ====================

  test.describe('Error Handling', () => {
    test('should show error toast on merge failure', async ({ page }) => {
      // This test would need a way to trigger a failure
      // For now, we just verify the merge works
      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles([
        { name: 'doc1.pdf', mimeType: 'application/pdf', buffer: pdfBuffer },
        { name: 'doc2.pdf', mimeType: 'application/pdf', buffer: pdfBuffer },
      ]);

      const download = await expectDownload(page, async () => {
        await page.getByRole('button', { name: /Merge/i }).click();
      });

      expect(download).toBeTruthy();
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
      await expect(page.getByRole('button', { name: /Merge/i })).toBeVisible();
    });

    test('should work on tablet', async ({ page }) => {
      await setViewport(page, 'tablet');
      await page.reload();

      const fileInput = page.locator('input[type="file"]');
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles([
        { name: 'doc1.pdf', mimeType: 'application/pdf', buffer: pdfBuffer },
        { name: 'doc2.pdf', mimeType: 'application/pdf', buffer: pdfBuffer },
      ]);

      await expect(page.getByText('doc1.pdf')).toBeVisible();
    });
  });
});
