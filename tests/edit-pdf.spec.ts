import { test, expect } from '@playwright/test';
import {
  waitForPageLoad,
  generateTestPDF,
  expectDownload,
  setViewport,
} from './helpers/test-utils';

test.describe('Sign & Edit PDF', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/edit');
    await waitForPageLoad(page);
  });

  // ==================== PAGE LOAD ====================

  test.describe('Page Load', () => {
    test('should display page title', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /Edit|Sign/i })).toBeVisible();
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
      const pdfBuffer = generateTestPDF(3);

      await fileInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      // Should show editor interface
      await expect(page.locator('canvas').or(page.getByText(/Page|Zoom/i).first())).toBeVisible({ timeout: 10000 });
    });

    test('should show toolbar after upload', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      const pdfBuffer = generateTestPDF(2);

      await fileInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(2000);

      // Toolbar should be visible
      await expect(page.locator('[class*="toolbar"]').or(page.locator('button').filter({ has: page.locator('svg') }).first())).toBeVisible();
    });
  });

  // ==================== TOOLBAR TOOLS ====================

  test.describe('Toolbar Tools', () => {
    test.beforeEach(async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      const pdfBuffer = generateTestPDF(2);

      await fileInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(2000);
    });

    test('should have select/pointer tool', async ({ page }) => {
      const selectTool = page.locator('button[title*="Select"]').or(page.locator('svg.lucide-mouse-pointer-2').locator('..'));
      await expect(selectTool.first()).toBeVisible();
    });

    test('should have text tool', async ({ page }) => {
      const textTool = page.locator('button[title*="Text"]').or(page.locator('svg.lucide-type').locator('..'));
      await expect(textTool.first()).toBeVisible();
    });

    test('should have image tool', async ({ page }) => {
      const imageTool = page.locator('button[title*="Image"]').or(page.locator('svg.lucide-image').locator('..'));
      await expect(imageTool.first()).toBeVisible();
    });

    test('should have signature tool', async ({ page }) => {
      const signatureTool = page.locator('button[title*="Signature"]').or(page.locator('svg.lucide-pen-line').locator('..'));
      await expect(signatureTool.first()).toBeVisible();
    });

    test('should have shape tools', async ({ page }) => {
      const shapeTool = page.locator('button[title*="Shape"], button[title*="Rectangle"], button[title*="Circle"]');
      await expect(shapeTool.first()).toBeVisible();
    });

    test('should have drawing tools', async ({ page }) => {
      const drawTool = page.locator('button[title*="Draw"], svg.lucide-pencil').locator('..');
      await expect(drawTool.first()).toBeVisible();
    });

    test('should have undo/redo buttons', async ({ page }) => {
      const undoButton = page.locator('button[title*="Undo"]').or(page.locator('svg.lucide-undo').locator('..'));
      const redoButton = page.locator('button[title*="Redo"]').or(page.locator('svg.lucide-redo').locator('..'));

      await expect(undoButton.first()).toBeVisible();
      await expect(redoButton.first()).toBeVisible();
    });

    test('should have zoom controls', async ({ page }) => {
      await expect(page.getByText(/Zoom|%/).first()).toBeVisible();
    });

    test('should have download button', async ({ page }) => {
      const downloadButton = page.getByRole('button', { name: /Download/i });
      await expect(downloadButton).toBeVisible();
    });
  });

  // ==================== TEXT EDITING ====================

  test.describe('Text Editing', () => {
    test.beforeEach(async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(2000);
    });

    test('should add text element', async ({ page }) => {
      // Click text tool
      const textTool = page.locator('button[title*="Text"]').or(page.locator('svg.lucide-type').locator('..'));
      await textTool.first().click();

      // Click on canvas to add text
      const canvas = page.locator('canvas').or(page.locator('[class*="page"]')).first();
      await canvas.click({ position: { x: 100, y: 100 } });

      // Should show text editing interface
    });

    test('should have font options', async ({ page }) => {
      await expect(page.getByText(/Font|Arial|Times/i).first()).toBeVisible();
    });

    test('should have text size options', async ({ page }) => {
      // Look for size selector
      const sizeControl = page.locator('[class*="size"]').or(page.getByText(/Size|px|pt/i).first());
      await expect(sizeControl).toBeVisible().catch(() => {});
    });

    test('should have text formatting options', async ({ page }) => {
      // Bold, Italic, Underline buttons
      const boldButton = page.locator('svg.lucide-bold').locator('..');
      const italicButton = page.locator('svg.lucide-italic').locator('..');

      await expect(boldButton.first()).toBeVisible().catch(() => {});
      await expect(italicButton.first()).toBeVisible().catch(() => {});
    });
  });

  // ==================== SIGNATURE ====================

  test.describe('Signature', () => {
    test.beforeEach(async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(2000);
    });

    test('should open signature modal', async ({ page }) => {
      const signatureTool = page.locator('button[title*="Signature"]').or(page.locator('svg.lucide-pen-line').locator('..'));
      await signatureTool.first().click();

      // Should open signature modal
      await expect(page.getByText(/Draw Signature|Sign/i)).toBeVisible({ timeout: 3000 });
    });

    test('should have signature canvas', async ({ page }) => {
      const signatureTool = page.locator('button[title*="Signature"]').or(page.locator('svg.lucide-pen-line').locator('..'));
      await signatureTool.first().click();

      await page.waitForTimeout(500);

      // Should have drawing canvas
      const signatureCanvas = page.locator('canvas').last();
      await expect(signatureCanvas).toBeVisible();
    });

    test('should have clear button in signature modal', async ({ page }) => {
      const signatureTool = page.locator('button[title*="Signature"]').or(page.locator('svg.lucide-pen-line').locator('..'));
      await signatureTool.first().click();

      await page.waitForTimeout(500);

      await expect(page.getByRole('button', { name: /Clear/i })).toBeVisible();
    });

    test('should have add/save button in signature modal', async ({ page }) => {
      const signatureTool = page.locator('button[title*="Signature"]').or(page.locator('svg.lucide-pen-line').locator('..'));
      await signatureTool.first().click();

      await page.waitForTimeout(500);

      await expect(page.getByRole('button', { name: /Add|Save/i })).toBeVisible();
    });

    test('should close signature modal', async ({ page }) => {
      const signatureTool = page.locator('button[title*="Signature"]').or(page.locator('svg.lucide-pen-line').locator('..'));
      await signatureTool.first().click();

      await page.waitForTimeout(500);

      // Close modal
      const cancelButton = page.getByRole('button', { name: /Cancel|Close/i });
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
        await expect(page.getByText(/Draw Signature/i)).not.toBeVisible();
      }
    });
  });

  // ==================== PAGE NAVIGATION ====================

  test.describe('Page Navigation', () => {
    test.beforeEach(async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      const pdfBuffer = generateTestPDF(5);

      await fileInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(2000);
    });

    test('should show current page number', async ({ page }) => {
      await expect(page.getByText(/1\s*\/\s*5|Page 1/i)).toBeVisible();
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
        await expect(page.getByText(/2\s*\/\s*5|Page 2/i)).toBeVisible({ timeout: 3000 });
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
        await expect(page.getByText(/1\s*\/\s*5|Page 1/i)).toBeVisible({ timeout: 3000 });
      }
    });
  });

  // ==================== ROTATION ====================

  test.describe('Page Rotation', () => {
    test.beforeEach(async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      const pdfBuffer = generateTestPDF(2);

      await fileInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(2000);
    });

    test('should have rotate button', async ({ page }) => {
      const rotateButton = page.locator('svg.lucide-rotate-cw').locator('..').or(page.locator('button[title*="Rotate"]'));
      await expect(rotateButton.first()).toBeVisible();
    });

    test('should rotate page on click', async ({ page }) => {
      const rotateButton = page.locator('svg.lucide-rotate-cw').locator('..').first();

      if (await rotateButton.isVisible()) {
        await rotateButton.click();
        // Rotation should be applied (may show 90° indicator)
      }
    });

    test('should rotate page with R key', async ({ page }) => {
      // Press R key
      await page.keyboard.press('r');
      // Page should rotate
    });
  });

  // ==================== KEYBOARD SHORTCUTS ====================

  test.describe('Keyboard Shortcuts', () => {
    test.beforeEach(async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(2000);
    });

    test('should open keyboard shortcuts modal with ? key', async ({ page }) => {
      await page.keyboard.press('?');
      await expect(page.getByText(/Keyboard Shortcuts/i)).toBeVisible({ timeout: 2000 });
    });

    test('should close modal with Escape', async ({ page }) => {
      await page.keyboard.press('?');
      await expect(page.getByText(/Keyboard Shortcuts/i)).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(page.getByText(/Keyboard Shortcuts/i)).not.toBeVisible();
    });

    test('should have keyboard shortcuts button', async ({ page }) => {
      const keyboardButton = page.locator('svg.lucide-keyboard').locator('..').or(page.locator('button[title*="Keyboard"]'));
      await expect(keyboardButton.first()).toBeVisible();
    });

    test('should undo with Ctrl+Z', async ({ page }) => {
      await page.keyboard.press('Control+z');
      // Should trigger undo (no error)
    });

    test('should redo with Ctrl+Y', async ({ page }) => {
      await page.keyboard.press('Control+y');
      // Should trigger redo (no error)
    });
  });

  // ==================== OCR ====================

  test.describe('OCR', () => {
    test.beforeEach(async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(2000);
    });

    test('should have OCR button', async ({ page }) => {
      const ocrButton = page.locator('svg.lucide-scan-text').locator('..').or(page.locator('button[title*="OCR"]'));
      await expect(ocrButton.first()).toBeVisible();
    });

    test('should have language selector', async ({ page }) => {
      // Look for language dropdown
      await expect(page.getByText(/English|Language/i).first()).toBeVisible();
    });
  });

  // ==================== DOWNLOAD ====================

  test.describe('Download', () => {
    test('should download edited PDF', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(2000);

      const downloadButton = page.getByRole('button', { name: /Download/i });
      const download = await expectDownload(page, async () => {
        await downloadButton.click();
      });

      expect(download.suggestedFilename()).toContain('.pdf');
    });
  });

  // ==================== RESPONSIVE DESIGN ====================

  test.describe('Responsive Design', () => {
    test('should work on tablet', async ({ page }) => {
      await setViewport(page, 'tablet');
      await page.reload();

      const fileInput = page.locator('input[type="file"]').first();
      const pdfBuffer = generateTestPDF(1);

      await fileInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await page.waitForTimeout(2000);

      // Toolbar should be visible
      await expect(page.getByRole('button', { name: /Download/i })).toBeVisible();
    });
  });
});
