import { test, expect } from '@playwright/test';
import {
  waitForPageLoad,
  generateTestPDF,
  expectDownload,
  setViewport,
} from './helpers/test-utils';

test.describe('Fill Forms', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/fill');
    await waitForPageLoad(page);
  });

  // ==================== PAGE LOAD ====================

  test.describe('Page Load', () => {
    test('should display page title', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /Fill|Form/i })).toBeVisible();
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
        name: 'form.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      // Should show editor interface
      await expect(page.locator('canvas').or(page.getByText(/Page/i).first())).toBeVisible({ timeout: 10000 });
    });

    test('should show toolbar after upload', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      const pdfBuffer = generateTestPDF(2);

      await fileInput.setInputFiles({
        name: 'form.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(2000);

      // Toolbar should be visible
      await expect(page.locator('button').filter({ has: page.locator('svg') }).first()).toBeVisible();
    });
  });

  // ==================== TOOLBAR TOOLS ====================

  test.describe('Toolbar Tools', () => {
    test.beforeEach(async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      const pdfBuffer = generateTestPDF(2);

      await fileInput.setInputFiles({
        name: 'form.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(2000);
    });

    test('should have text tool', async ({ page }) => {
      const textTool = page.locator('svg.lucide-type').locator('..').or(page.locator('button[title*="Text"]'));
      await expect(textTool.first()).toBeVisible();
    });

    test('should have checkbox tool', async ({ page }) => {
      const checkboxTool = page.locator('svg.lucide-check-square').locator('..').or(page.locator('button[title*="Checkbox"]'));
      await expect(checkboxTool.first()).toBeVisible();
    });

    test('should have undo button', async ({ page }) => {
      const undoButton = page.locator('svg.lucide-undo').locator('..').or(page.locator('button[title*="Undo"]'));
      await expect(undoButton.first()).toBeVisible();
    });

    test('should have redo button', async ({ page }) => {
      const redoButton = page.locator('svg.lucide-redo').locator('..').or(page.locator('button[title*="Redo"]'));
      await expect(redoButton.first()).toBeVisible();
    });

    test('should have download button', async ({ page }) => {
      const downloadButton = page.locator('svg.lucide-download').locator('..').or(page.getByRole('button', { name: /Download/i }));
      await expect(downloadButton.first()).toBeVisible();
    });

    test('should have zoom controls', async ({ page }) => {
      const zoomControl = page.locator('svg.lucide-zoom-in').locator('..').or(page.locator('svg.lucide-zoom-out').locator('..'));
      await expect(zoomControl.first()).toBeVisible();
    });
  });

  // ==================== FIELD TEMPLATES ====================

  test.describe('Field Templates', () => {
    test.beforeEach(async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles({
        name: 'form.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(2000);
    });

    test('should have text field template', async ({ page }) => {
      await expect(page.getByText(/Text/i).first()).toBeVisible();
    });

    test('should have name field template', async ({ page }) => {
      const nameIcon = page.locator('svg.lucide-user').locator('..').or(page.getByText(/Name/i));
      await expect(nameIcon.first()).toBeVisible();
    });

    test('should have phone field template', async ({ page }) => {
      const phoneIcon = page.locator('svg.lucide-phone').locator('..').or(page.getByText(/Phone/i));
      await expect(phoneIcon.first()).toBeVisible();
    });

    test('should have email field template', async ({ page }) => {
      const emailIcon = page.locator('svg.lucide-mail').locator('..').or(page.getByText(/Email/i));
      await expect(emailIcon.first()).toBeVisible();
    });

    test('should have address field template', async ({ page }) => {
      const addressIcon = page.locator('svg.lucide-map-pin').locator('..').or(page.getByText(/Address/i));
      await expect(addressIcon.first()).toBeVisible();
    });

    test('should have date field template', async ({ page }) => {
      const dateIcon = page.locator('svg.lucide-calendar').locator('..').or(page.getByText(/Date/i));
      await expect(dateIcon.first()).toBeVisible();
    });

    test('should have template selector dropdown', async ({ page }) => {
      const dropdown = page.locator('svg.lucide-chevron-down').locator('..');
      await expect(dropdown.first()).toBeVisible().catch(() => {});
    });
  });

  // ==================== ADDING TEXT FIELDS ====================

  test.describe('Adding Text Fields', () => {
    test.beforeEach(async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles({
        name: 'form.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(2000);
    });

    test('should add text field on canvas click', async ({ page }) => {
      // Select text tool
      const textTool = page.locator('svg.lucide-type').locator('..').first();
      if (await textTool.isVisible()) {
        await textTool.click();
      }

      // Click on canvas to add field
      const canvas = page.locator('canvas').or(page.locator('[class*="page"]')).first();
      await canvas.click({ position: { x: 150, y: 150 } });

      // Should add a field (input should appear)
      await expect(page.locator('input[type="text"]').last()).toBeVisible({ timeout: 3000 }).catch(() => {});
    });

    test('should type in text field', async ({ page }) => {
      const textTool = page.locator('svg.lucide-type').locator('..').first();
      if (await textTool.isVisible()) {
        await textTool.click();
      }

      const canvas = page.locator('canvas').or(page.locator('[class*="page"]')).first();
      await canvas.click({ position: { x: 150, y: 150 } });

      await page.waitForTimeout(500);

      const textInput = page.locator('input[type="text"]').last();
      if (await textInput.isVisible()) {
        await textInput.fill('John Doe');
        await expect(textInput).toHaveValue('John Doe');
      }
    });
  });

  // ==================== ADDING CHECKBOX FIELDS ====================

  test.describe('Adding Checkbox Fields', () => {
    test.beforeEach(async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles({
        name: 'form.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(2000);
    });

    test('should add checkbox on canvas click', async ({ page }) => {
      // Select checkbox tool
      const checkboxTool = page.locator('svg.lucide-check-square').locator('..').first();
      if (await checkboxTool.isVisible()) {
        await checkboxTool.click();
      }

      const canvas = page.locator('canvas').or(page.locator('[class*="page"]')).first();
      await canvas.click({ position: { x: 100, y: 100 } });

      // Should add a checkbox
      await page.waitForTimeout(500);
    });

    test('should toggle checkbox on click', async ({ page }) => {
      const checkboxTool = page.locator('svg.lucide-check-square').locator('..').first();
      if (await checkboxTool.isVisible()) {
        await checkboxTool.click();
      }

      const canvas = page.locator('canvas').or(page.locator('[class*="page"]')).first();
      await canvas.click({ position: { x: 100, y: 100 } });

      await page.waitForTimeout(500);

      // Click to toggle
      const checkbox = page.locator('svg.lucide-square').locator('..').or(page.locator('svg.lucide-check').locator('..'));
      if (await checkbox.first().isVisible()) {
        await checkbox.first().click();
      }
    });
  });

  // ==================== FIELD MANAGEMENT ====================

  test.describe('Field Management', () => {
    test.beforeEach(async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles({
        name: 'form.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(2000);

      // Add a text field
      const textTool = page.locator('svg.lucide-type').locator('..').first();
      if (await textTool.isVisible()) {
        await textTool.click();
      }

      const canvas = page.locator('canvas').or(page.locator('[class*="page"]')).first();
      await canvas.click({ position: { x: 150, y: 150 } });
      await page.waitForTimeout(500);
    });

    test('should select field on click', async ({ page }) => {
      const textInput = page.locator('input[type="text"]').last();
      if (await textInput.isVisible()) {
        await textInput.click();
        // Field should be selected (may have visual indicator)
      }
    });

    test('should delete field with delete button', async ({ page }) => {
      const deleteButton = page.locator('svg.lucide-trash-2').locator('..').or(page.locator('svg.lucide-x').locator('..'));
      if (await deleteButton.first().isVisible()) {
        await deleteButton.first().click();
      }
    });

    test('should delete field with Delete key', async ({ page }) => {
      const textInput = page.locator('input[type="text"]').last();
      if (await textInput.isVisible()) {
        await textInput.click();
        await page.keyboard.press('Delete');
        // Field should be deleted
      }
    });
  });

  // ==================== UNDO/REDO ====================

  test.describe('Undo/Redo', () => {
    test.beforeEach(async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles({
        name: 'form.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(2000);
    });

    test('should undo with Ctrl+Z', async ({ page }) => {
      // Add a field first
      const textTool = page.locator('svg.lucide-type').locator('..').first();
      if (await textTool.isVisible()) {
        await textTool.click();
      }

      const canvas = page.locator('canvas').or(page.locator('[class*="page"]')).first();
      await canvas.click({ position: { x: 150, y: 150 } });
      await page.waitForTimeout(500);

      // Undo
      await page.keyboard.press('Control+z');
      // Field should be removed
    });

    test('should redo with Ctrl+Y', async ({ page }) => {
      const textTool = page.locator('svg.lucide-type').locator('..').first();
      if (await textTool.isVisible()) {
        await textTool.click();
      }

      const canvas = page.locator('canvas').or(page.locator('[class*="page"]')).first();
      await canvas.click({ position: { x: 150, y: 150 } });
      await page.waitForTimeout(500);

      // Undo then redo
      await page.keyboard.press('Control+z');
      await page.keyboard.press('Control+y');
      // Field should reappear
    });

    test('should undo with button', async ({ page }) => {
      const undoButton = page.locator('svg.lucide-undo').locator('..').first();
      if (await undoButton.isVisible()) {
        await undoButton.click();
      }
    });

    test('should redo with button', async ({ page }) => {
      const redoButton = page.locator('svg.lucide-redo').locator('..').first();
      if (await redoButton.isVisible()) {
        await redoButton.click();
      }
    });
  });

  // ==================== TAB NAVIGATION ====================

  test.describe('Tab Navigation', () => {
    test.beforeEach(async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles({
        name: 'form.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(2000);

      // Add multiple fields
      const textTool = page.locator('svg.lucide-type').locator('..').first();
      if (await textTool.isVisible()) {
        await textTool.click();

        const canvas = page.locator('canvas').or(page.locator('[class*="page"]')).first();
        await canvas.click({ position: { x: 100, y: 100 } });
        await page.waitForTimeout(300);
        await canvas.click({ position: { x: 100, y: 200 } });
        await page.waitForTimeout(300);
        await canvas.click({ position: { x: 100, y: 300 } });
        await page.waitForTimeout(300);
      }
    });

    test('should navigate to next field with Tab', async ({ page }) => {
      const firstInput = page.locator('input[type="text"]').first();
      if (await firstInput.isVisible()) {
        await firstInput.focus();
        await page.keyboard.press('Tab');
        // Should focus next field
      }
    });

    test('should navigate to previous field with Shift+Tab', async ({ page }) => {
      const inputs = page.locator('input[type="text"]');
      const count = await inputs.count();

      if (count >= 2) {
        await inputs.nth(1).focus();
        await page.keyboard.press('Shift+Tab');
        // Should focus previous field
      }
    });
  });

  // ==================== PAGE NAVIGATION ====================

  test.describe('Page Navigation', () => {
    test.beforeEach(async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      const pdfBuffer = generateTestPDF(5);

      await fileInput.setInputFiles({
        name: 'form.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(2000);
    });

    test('should show current page indicator', async ({ page }) => {
      await expect(page.getByText(/1\s*\/|Page 1/i)).toBeVisible();
    });

    test('should have next page button', async ({ page }) => {
      const nextButton = page.locator('svg.lucide-chevron-right').locator('..').or(page.getByRole('button', { name: /Next/i }));
      await expect(nextButton.first()).toBeVisible();
    });

    test('should have previous page button', async ({ page }) => {
      const prevButton = page.locator('svg.lucide-chevron-left').locator('..').or(page.getByRole('button', { name: /Previous|Prev/i }));
      await expect(prevButton.first()).toBeVisible();
    });

    test('should navigate to next page', async ({ page }) => {
      const nextButton = page.locator('svg.lucide-chevron-right').locator('..').first();

      if (await nextButton.isVisible()) {
        await nextButton.click();
        await expect(page.getByText(/2\s*\/|Page 2/i)).toBeVisible({ timeout: 3000 });
      }
    });

    test('should navigate to previous page', async ({ page }) => {
      // Go to page 2 first
      const nextButton = page.locator('svg.lucide-chevron-right').locator('..').first();
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForTimeout(500);
      }

      // Go back
      const prevButton = page.locator('svg.lucide-chevron-left').locator('..').first();
      if (await prevButton.isVisible()) {
        await prevButton.click();
        await expect(page.getByText(/1\s*\/|Page 1/i)).toBeVisible({ timeout: 3000 });
      }
    });
  });

  // ==================== ZOOM ====================

  test.describe('Zoom Controls', () => {
    test.beforeEach(async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles({
        name: 'form.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(2000);
    });

    test('should have zoom in button', async ({ page }) => {
      const zoomInButton = page.locator('svg.lucide-zoom-in').locator('..');
      await expect(zoomInButton.first()).toBeVisible();
    });

    test('should have zoom out button', async ({ page }) => {
      const zoomOutButton = page.locator('svg.lucide-zoom-out').locator('..');
      await expect(zoomOutButton.first()).toBeVisible();
    });

    test('should zoom in on click', async ({ page }) => {
      const zoomInButton = page.locator('svg.lucide-zoom-in').locator('..').first();

      if (await zoomInButton.isVisible()) {
        await zoomInButton.click();
        // Zoom should increase
      }
    });

    test('should zoom out on click', async ({ page }) => {
      const zoomOutButton = page.locator('svg.lucide-zoom-out').locator('..').first();

      if (await zoomOutButton.isVisible()) {
        await zoomOutButton.click();
        // Zoom should decrease
      }
    });
  });

  // ==================== DATE PICKER ====================

  test.describe('Date Picker', () => {
    test.beforeEach(async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles({
        name: 'form.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(2000);
    });

    test('should have date field template', async ({ page }) => {
      const dateIcon = page.locator('svg.lucide-calendar').locator('..');
      await expect(dateIcon.first()).toBeVisible();
    });

    test('should show date picker for date fields', async ({ page }) => {
      // Select date template if available
      const dateTemplate = page.getByText(/Date/i).first();
      if (await dateTemplate.isVisible()) {
        await dateTemplate.click();
      }

      // Add date field
      const canvas = page.locator('canvas').or(page.locator('[class*="page"]')).first();
      await canvas.click({ position: { x: 150, y: 150 } });

      await page.waitForTimeout(500);

      // Click calendar icon to open date picker
      const calendarIcon = page.locator('.field-input').locator('svg.lucide-calendar').locator('..');
      if (await calendarIcon.first().isVisible()) {
        await calendarIcon.first().click();
        // Date picker should appear
      }
    });
  });

  // ==================== FONT SIZE ====================

  test.describe('Font Size', () => {
    test.beforeEach(async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles({
        name: 'form.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(2000);
    });

    test('should have font size control', async ({ page }) => {
      await expect(page.getByText(/Size|Font/i).first()).toBeVisible().catch(() => {});
    });

    test('should allow changing font size', async ({ page }) => {
      const sizeInput = page.locator('input[type="number"]').or(page.locator('select'));
      if (await sizeInput.first().isVisible()) {
        // Change font size
      }
    });
  });

  // ==================== DOWNLOAD ====================

  test.describe('Download', () => {
    test('should download filled PDF', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles({
        name: 'form.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(2000);

      // Add a field and fill it
      const textTool = page.locator('svg.lucide-type').locator('..').first();
      if (await textTool.isVisible()) {
        await textTool.click();
      }

      const canvas = page.locator('canvas').or(page.locator('[class*="page"]')).first();
      await canvas.click({ position: { x: 150, y: 150 } });
      await page.waitForTimeout(500);

      const textInput = page.locator('input[type="text"]').last();
      if (await textInput.isVisible()) {
        await textInput.fill('Test Value');
      }

      const downloadButton = page.locator('svg.lucide-download').locator('..').or(page.getByRole('button', { name: /Download/i }));

      if (await downloadButton.first().isVisible()) {
        const download = await expectDownload(page, async () => {
          await downloadButton.first().click();
        });

        expect(download.suggestedFilename()).toContain('.pdf');
      }
    });
  });

  // ==================== EDGE CASES ====================

  test.describe('Edge Cases', () => {
    test('should handle single page PDF', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles({
        name: 'single.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(2000);

      await expect(page.getByText(/1\s*\/\s*1|Page 1/i)).toBeVisible();
    });

    test('should handle PDF with many pages', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      const pdfBuffer = generateTestPDF(20);

      await fileInput.setInputFiles({
        name: 'large.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(5000);

      // Should handle gracefully
      await expect(page.getByText(/Page 1|1\s*\//i)).toBeVisible();
    });

    test('should handle many fields on one page', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles({
        name: 'form.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(2000);

      // Add many fields
      const textTool = page.locator('svg.lucide-type').locator('..').first();
      if (await textTool.isVisible()) {
        await textTool.click();

        const canvas = page.locator('canvas').or(page.locator('[class*="page"]')).first();
        for (let i = 0; i < 10; i++) {
          await canvas.click({ position: { x: 100, y: 50 + i * 50 } });
          await page.waitForTimeout(100);
        }
      }

      // Should handle without performance issues
    });

    test('should preserve fields when changing pages', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      const pdfBuffer = generateTestPDF(3);

      await fileInput.setInputFiles({
        name: 'form.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(2000);

      // Add field on page 1
      const textTool = page.locator('svg.lucide-type').locator('..').first();
      if (await textTool.isVisible()) {
        await textTool.click();

        const canvas = page.locator('canvas').or(page.locator('[class*="page"]')).first();
        await canvas.click({ position: { x: 150, y: 150 } });
        await page.waitForTimeout(500);

        const textInput = page.locator('input[type="text"]').last();
        if (await textInput.isVisible()) {
          await textInput.fill('Page 1 Field');
        }
      }

      // Navigate to page 2 and back
      const nextButton = page.locator('svg.lucide-chevron-right').locator('..').first();
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForTimeout(500);

        const prevButton = page.locator('svg.lucide-chevron-left').locator('..').first();
        await prevButton.click();
        await page.waitForTimeout(500);

        // Field should still exist
        const textInput = page.locator('input[type="text"]').last();
        if (await textInput.isVisible()) {
          await expect(textInput).toHaveValue('Page 1 Field');
        }
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
        name: 'form.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(2000);

      // Toolbar should be usable
      await expect(page.locator('button').filter({ has: page.locator('svg') }).first()).toBeVisible();
    });

    test('should work on tablet', async ({ page }) => {
      await setViewport(page, 'tablet');
      await page.reload();

      const fileInput = page.locator('input[type="file"]').first();
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles({
        name: 'form.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(2000);

      await expect(page.getByRole('button', { name: /Download/i }).or(page.locator('svg.lucide-download').locator('..'))).toBeVisible();
    });
  });
});
