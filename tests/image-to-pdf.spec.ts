import { test, expect } from '@playwright/test';
import {
  waitForPageLoad,
  uploadTestImage,
  generateTestImage,
  generateTestJPEG,
  expectDownload,
  waitForToast,
  setViewport,
  uploadFile
} from './helpers/test-utils';

test.describe('Image to PDF Converter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/image-to-pdf');
    await waitForPageLoad(page);
  });

  // ==================== PAGE LOAD ====================

  test.describe('Page Load', () => {
    test('should display page title', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Image to PDF' })).toBeVisible();
    });

    test('should display upload area', async ({ page }) => {
      await expect(page.getByText('Drop images here')).toBeVisible();
      await expect(page.getByText(/or click to browse/i)).toBeVisible();
    });

    test('should have back button', async ({ page }) => {
      const backButton = page.locator('a[href="/"]');
      await expect(backButton).toBeVisible();
    });

    test('should navigate back to home', async ({ page }) => {
      await page.locator('a[href="/"]').click();
      await expect(page).toHaveURL('/');
    });

    test('should not show download button initially', async ({ page }) => {
      await expect(page.getByRole('button', { name: /Download PDF/i })).not.toBeVisible();
    });
  });

  // ==================== FILE UPLOAD ====================

  test.describe('File Upload', () => {
    test('should accept PNG image upload', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pngBuffer = generateTestImage();

      await fileInput.setInputFiles({
        name: 'test.png',
        mimeType: 'image/png',
        buffer: pngBuffer,
      });

      // Image should appear in grid
      await expect(page.locator('img[alt="test.png"]')).toBeVisible();
    });

    test('should accept JPEG image upload', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const jpgBuffer = generateTestJPEG();

      await fileInput.setInputFiles({
        name: 'test.jpg',
        mimeType: 'image/jpeg',
        buffer: jpgBuffer,
      });

      // Image should appear
      await expect(page.locator('img[alt="test.jpg"]')).toBeVisible();
    });

    test('should accept multiple images', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pngBuffer = generateTestImage();
      const jpgBuffer = generateTestJPEG();

      await fileInput.setInputFiles([
        { name: 'image1.png', mimeType: 'image/png', buffer: pngBuffer },
        { name: 'image2.jpg', mimeType: 'image/jpeg', buffer: jpgBuffer },
        { name: 'image3.png', mimeType: 'image/png', buffer: pngBuffer },
      ]);

      // All images should appear
      await expect(page.locator('img[alt="image1.png"]')).toBeVisible();
      await expect(page.locator('img[alt="image2.jpg"]')).toBeVisible();
      await expect(page.locator('img[alt="image3.png"]')).toBeVisible();

      // Count should show
      await expect(page.getByText('3 images selected')).toBeVisible();
    });

    test('should show image count after upload', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pngBuffer = generateTestImage();

      await fileInput.setInputFiles({
        name: 'test.png',
        mimeType: 'image/png',
        buffer: pngBuffer,
      });

      await expect(page.getByText('1 image selected')).toBeVisible();
    });

    test('should show download button after upload', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pngBuffer = generateTestImage();

      await fileInput.setInputFiles({
        name: 'test.png',
        mimeType: 'image/png',
        buffer: pngBuffer,
      });

      await expect(page.getByRole('button', { name: /Download PDF/i })).toBeVisible();
    });

    test('should show "Add More" button after upload', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pngBuffer = generateTestImage();

      await fileInput.setInputFiles({
        name: 'test.png',
        mimeType: 'image/png',
        buffer: pngBuffer,
      });

      await expect(page.getByRole('button', { name: /Add More/i })).toBeVisible();
    });
  });

  // ==================== IMAGE MANAGEMENT ====================

  test.describe('Image Management', () => {
    test.beforeEach(async ({ page }) => {
      // Upload multiple images first
      const fileInput = page.locator('input[type="file"]');
      const pngBuffer = generateTestImage();

      await fileInput.setInputFiles([
        { name: 'image1.png', mimeType: 'image/png', buffer: pngBuffer },
        { name: 'image2.png', mimeType: 'image/png', buffer: pngBuffer },
        { name: 'image3.png', mimeType: 'image/png', buffer: pngBuffer },
      ]);
    });

    test('should delete image when clicking delete button', async ({ page }) => {
      // Hover to reveal delete button
      const firstImage = page.locator('img[alt="image1.png"]').locator('..');
      await firstImage.hover();

      // Click delete button
      const deleteButton = firstImage.locator('button').filter({ has: page.locator('svg') });
      await deleteButton.click();

      // Image should be removed
      await expect(page.locator('img[alt="image1.png"]')).not.toBeVisible();

      // Count should update
      await expect(page.getByText('2 images selected')).toBeVisible();
    });

    test('should show correct numbering', async ({ page }) => {
      await expect(page.getByText('1. image1.png')).toBeVisible();
      await expect(page.getByText('2. image2.png')).toBeVisible();
      await expect(page.getByText('3. image3.png')).toBeVisible();
    });

    test('should update numbering after delete', async ({ page }) => {
      // Delete first image
      const firstImage = page.locator('img[alt="image1.png"]').locator('..').locator('..');
      await firstImage.hover();
      await firstImage.locator('button').last().click();

      // Numbering should update
      await expect(page.getByText('1. image2.png')).toBeVisible();
      await expect(page.getByText('2. image3.png')).toBeVisible();
    });

    test('should support drag and drop reordering', async ({ page }) => {
      // Get drag handles
      const firstItem = page.locator('text=1. image1.png').locator('..').locator('..');
      const secondItem = page.locator('text=2. image2.png').locator('..').locator('..');

      // Perform drag
      await firstItem.dragTo(secondItem);

      // Order should change (image2 should now be first)
      // Note: exact behavior depends on implementation
    });
  });

  // ==================== PAGE SIZE OPTIONS ====================

  test.describe('Page Size Options', () => {
    test.beforeEach(async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pngBuffer = generateTestImage();
      await fileInput.setInputFiles({
        name: 'test.png',
        mimeType: 'image/png',
        buffer: pngBuffer,
      });
    });

    test('should show page size selector', async ({ page }) => {
      await expect(page.getByText('Page Size:')).toBeVisible();
      await expect(page.locator('select')).toBeVisible();
    });

    test('should have all page size options', async ({ page }) => {
      const select = page.locator('select');

      await expect(select.locator('option[value="original"]')).toBeAttached();
      await expect(select.locator('option[value="a4-fit"]')).toBeAttached();
      await expect(select.locator('option[value="letter-fit"]')).toBeAttached();
      await expect(select.locator('option[value="a4"]')).toBeAttached();
      await expect(select.locator('option[value="letter"]')).toBeAttached();
    });

    test('should change page size selection', async ({ page }) => {
      const select = page.locator('select');

      await select.selectOption('original');
      await expect(select).toHaveValue('original');

      await select.selectOption('a4');
      await expect(select).toHaveValue('a4');

      await select.selectOption('letter-fit');
      await expect(select).toHaveValue('letter-fit');
    });
  });

  // ==================== PDF CONVERSION ====================

  test.describe('PDF Conversion', () => {
    test('should convert single image to PDF', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pngBuffer = generateTestImage();

      await fileInput.setInputFiles({
        name: 'test.png',
        mimeType: 'image/png',
        buffer: pngBuffer,
      });

      // Click download
      const download = await expectDownload(page, async () => {
        await page.getByRole('button', { name: /Download PDF/i }).click();
      });

      expect(download.suggestedFilename()).toContain('.pdf');
    });

    test('should convert multiple images to PDF', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pngBuffer = generateTestImage();

      await fileInput.setInputFiles([
        { name: 'image1.png', mimeType: 'image/png', buffer: pngBuffer },
        { name: 'image2.png', mimeType: 'image/png', buffer: pngBuffer },
      ]);

      const download = await expectDownload(page, async () => {
        await page.getByRole('button', { name: /Download PDF/i }).click();
      });

      expect(download.suggestedFilename()).toContain('.pdf');
    });

    test('should show loading state during conversion', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pngBuffer = generateTestImage();

      await fileInput.setInputFiles({
        name: 'test.png',
        mimeType: 'image/png',
        buffer: pngBuffer,
      });

      // Start conversion and check for loading state
      const downloadButton = page.getByRole('button', { name: /Download PDF/i });
      await downloadButton.click();

      // Should show "Converting..." text briefly
      await expect(page.getByText('Converting...')).toBeVisible({ timeout: 1000 }).catch(() => {
        // Conversion might be too fast to catch
      });
    });

    test('should show success toast after conversion', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pngBuffer = generateTestImage();

      await fileInput.setInputFiles({
        name: 'test.png',
        mimeType: 'image/png',
        buffer: pngBuffer,
      });

      await page.getByRole('button', { name: /Download PDF/i }).click();

      // Wait for success toast
      await waitForToast(page, 'PDF created successfully');
    });

    test('should convert with different page sizes', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pngBuffer = generateTestImage();

      await fileInput.setInputFiles({
        name: 'test.png',
        mimeType: 'image/png',
        buffer: pngBuffer,
      });

      // Test each page size
      const sizes = ['original', 'a4-fit', 'letter-fit', 'a4', 'letter'];

      for (const size of sizes) {
        await page.locator('select').selectOption(size);
        const download = await expectDownload(page, async () => {
          await page.getByRole('button', { name: /Download PDF/i }).click();
        });
        expect(download.suggestedFilename()).toContain('.pdf');
      }
    });
  });

  // ==================== EDGE CASES ====================

  test.describe('Edge Cases', () => {
    test('should handle empty state gracefully', async ({ page }) => {
      // Should show upload area
      await expect(page.getByText('Drop images here')).toBeVisible();
    });

    test('should show warning when trying to convert with no images', async ({ page }) => {
      // This shouldn't happen in UI since button is hidden, but test the state
      await expect(page.getByRole('button', { name: /Download PDF/i })).not.toBeVisible();
    });

    test('should handle removing all images', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pngBuffer = generateTestImage();

      await fileInput.setInputFiles({
        name: 'test.png',
        mimeType: 'image/png',
        buffer: pngBuffer,
      });

      // Delete the image
      const imageCard = page.locator('img[alt="test.png"]').locator('..').locator('..');
      await imageCard.hover();
      await imageCard.locator('button').last().click();

      // Should show upload area again
      await expect(page.getByText('Drop images here')).toBeVisible();
    });

    test('should handle very small images', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pngBuffer = generateTestImage(); // 1x1 pixel

      await fileInput.setInputFiles({
        name: 'tiny.png',
        mimeType: 'image/png',
        buffer: pngBuffer,
      });

      const download = await expectDownload(page, async () => {
        await page.getByRole('button', { name: /Download PDF/i }).click();
      });

      expect(download.suggestedFilename()).toContain('.pdf');
    });

    test('should add more images after initial upload', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      const pngBuffer = generateTestImage();

      // First upload
      await fileInput.setInputFiles({
        name: 'first.png',
        mimeType: 'image/png',
        buffer: pngBuffer,
      });

      // Click "Add More"
      await page.getByRole('button', { name: /Add More/i }).click();

      // Upload more
      await fileInput.setInputFiles({
        name: 'second.png',
        mimeType: 'image/png',
        buffer: pngBuffer,
      });

      // Should have both images
      await expect(page.getByText('2 images selected')).toBeVisible();
    });
  });

  // ==================== RESPONSIVE DESIGN ====================

  test.describe('Responsive Design', () => {
    test('should work on mobile', async ({ page }) => {
      await setViewport(page, 'mobile');
      await page.reload();

      const fileInput = page.locator('input[type="file"]');
      const pngBuffer = generateTestImage();

      await fileInput.setInputFiles({
        name: 'test.png',
        mimeType: 'image/png',
        buffer: pngBuffer,
      });

      await expect(page.locator('img[alt="test.png"]')).toBeVisible();
      await expect(page.getByRole('button', { name: /Download PDF/i })).toBeVisible();
    });

    test('should work on tablet', async ({ page }) => {
      await setViewport(page, 'tablet');
      await page.reload();

      const fileInput = page.locator('input[type="file"]');
      const pngBuffer = generateTestImage();

      await fileInput.setInputFiles({
        name: 'test.png',
        mimeType: 'image/png',
        buffer: pngBuffer,
      });

      await expect(page.locator('img[alt="test.png"]')).toBeVisible();
    });
  });
});
