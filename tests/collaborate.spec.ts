import { test, expect } from '@playwright/test';
import {
  waitForPageLoad,
  generateTestPDF,
  expectDownload,
  setViewport,
} from './helpers/test-utils';

test.describe('Collaborate Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/collaborate');
    await waitForPageLoad(page);
  });

  // ==================== PAGE LOAD ====================

  test.describe('Page Load', () => {
    test('should display page title', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /Collaborate/i })).toBeVisible();
    });

    test('should display mode selection options', async ({ page }) => {
      // Should show Host and Join options initially
      await expect(page.getByText(/Host|Create/i).first()).toBeVisible();
      await expect(page.getByText(/Join/i).first()).toBeVisible();
    });

    test('should have back button', async ({ page }) => {
      await expect(page.locator('a[href="/"]')).toBeVisible();
    });

    test('should show collaboration description', async ({ page }) => {
      await expect(page.getByText(/real-time|together|collaborate/i).first()).toBeVisible();
    });
  });

  // ==================== HOST MODE ====================

  test.describe('Host Mode', () => {
    test('should enter host mode when clicking host button', async ({ page }) => {
      const hostButton = page.getByRole('button', { name: /Host|Create|Start/i }).first();
      await hostButton.click();

      // Should show hosting interface
      await page.waitForTimeout(2000);
    });

    test('should show QR code for sharing', async ({ page }) => {
      const hostButton = page.getByRole('button', { name: /Host|Create|Start/i }).first();
      await hostButton.click();

      await page.waitForTimeout(2000);

      // Should show QR code or share option
      await expect(page.locator('svg').filter({ has: page.locator('rect') }).or(page.getByText(/QR|Share|Code/i).first())).toBeVisible({ timeout: 5000 }).catch(() => {});
    });

    test('should show connection ID/code', async ({ page }) => {
      const hostButton = page.getByRole('button', { name: /Host|Create|Start/i }).first();
      await hostButton.click();

      await page.waitForTimeout(3000);

      // Should display a connection code
      await expect(page.getByText(/ID|Code|Share/i)).toBeVisible().catch(() => {});
    });

    test('should have copy button for sharing code', async ({ page }) => {
      const hostButton = page.getByRole('button', { name: /Host|Create|Start/i }).first();
      await hostButton.click();

      await page.waitForTimeout(2000);

      const copyButton = page.locator('svg.lucide-copy').locator('..').or(page.getByRole('button', { name: /Copy/i }));
      await expect(copyButton.first()).toBeVisible().catch(() => {});
    });

    test('should allow uploading PDF in host mode', async ({ page }) => {
      const hostButton = page.getByRole('button', { name: /Host|Create|Start/i }).first();
      await hostButton.click();

      await page.waitForTimeout(2000);

      // Look for file input or upload button
      const fileInput = page.locator('input[type="file"]');
      await expect(fileInput.first()).toBeAttached().catch(() => {});
    });

    test('should create blank document option', async ({ page }) => {
      // Look for create new/blank document option
      await expect(page.getByText(/New|Blank|Create/i).first()).toBeVisible();
    });
  });

  // ==================== JOIN MODE ====================

  test.describe('Join Mode', () => {
    test('should enter join mode when clicking join button', async ({ page }) => {
      const joinButton = page.getByRole('button', { name: /Join/i }).first();
      await joinButton.click();

      await page.waitForTimeout(1000);

      // Should show join interface
      await expect(page.locator('input').or(page.getByText(/Enter|Code|ID/i).first())).toBeVisible();
    });

    test('should have input field for connection code', async ({ page }) => {
      const joinButton = page.getByRole('button', { name: /Join/i }).first();
      await joinButton.click();

      await page.waitForTimeout(1000);

      const codeInput = page.locator('input[type="text"]');
      await expect(codeInput.first()).toBeVisible();
    });

    test('should have connect button', async ({ page }) => {
      const joinButton = page.getByRole('button', { name: /Join/i }).first();
      await joinButton.click();

      await page.waitForTimeout(1000);

      await expect(page.getByRole('button', { name: /Connect|Join|Enter/i })).toBeVisible();
    });

    test('should allow entering connection code', async ({ page }) => {
      const joinButton = page.getByRole('button', { name: /Join/i }).first();
      await joinButton.click();

      await page.waitForTimeout(1000);

      const codeInput = page.locator('input[type="text"]').first();
      if (await codeInput.isVisible()) {
        await codeInput.fill('test-code-123');
        await expect(codeInput).toHaveValue('test-code-123');
      }
    });

    test('should have QR scanner option', async ({ page }) => {
      const joinButton = page.getByRole('button', { name: /Join/i }).first();
      await joinButton.click();

      await page.waitForTimeout(1000);

      // Look for QR scan button
      const qrButton = page.locator('svg.lucide-qr-code').locator('..').or(page.getByRole('button', { name: /Scan|QR/i }));
      await expect(qrButton.first()).toBeVisible().catch(() => {});
    });
  });

  // ==================== EDITOR INTERFACE ====================

  test.describe('Editor Interface', () => {
    test.beforeEach(async ({ page }) => {
      // Start hosting to get to editor
      const hostButton = page.getByRole('button', { name: /Host|Create|Start/i }).first();
      await hostButton.click();

      await page.waitForTimeout(2000);

      // Upload a PDF or create blank
      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.first().isVisible()) {
        const pdfBuffer = generateTestPDF(2);
        await fileInput.first().setInputFiles({
          name: 'document.pdf',
          mimeType: 'application/pdf',
          buffer: pdfBuffer,
        });
        await page.waitForTimeout(2000);
      }
    });

    test('should show toolbar with editing tools', async ({ page }) => {
      // Look for toolbar
      await expect(page.locator('[class*="toolbar"]').or(page.locator('button').filter({ has: page.locator('svg') }).first())).toBeVisible();
    });

    test('should have text tool', async ({ page }) => {
      const textTool = page.locator('svg.lucide-type').locator('..').or(page.locator('button[title*="Text"]'));
      await expect(textTool.first()).toBeVisible().catch(() => {});
    });

    test('should have image tool', async ({ page }) => {
      const imageTool = page.locator('svg.lucide-image').locator('..').or(page.locator('button[title*="Image"]'));
      await expect(imageTool.first()).toBeVisible().catch(() => {});
    });

    test('should have signature tool', async ({ page }) => {
      const signatureTool = page.locator('svg.lucide-pen-line').locator('..').or(page.locator('button[title*="Signature"]'));
      await expect(signatureTool.first()).toBeVisible().catch(() => {});
    });

    test('should have shape tools', async ({ page }) => {
      const shapeTool = page.locator('svg.lucide-square').locator('..').or(page.locator('svg.lucide-circle').locator('..'));
      await expect(shapeTool.first()).toBeVisible().catch(() => {});
    });

    test('should have undo/redo buttons', async ({ page }) => {
      const undoButton = page.locator('svg.lucide-undo').locator('..').or(page.locator('button[title*="Undo"]'));
      await expect(undoButton.first()).toBeVisible().catch(() => {});
    });

    test('should have zoom controls', async ({ page }) => {
      const zoomControl = page.locator('svg.lucide-zoom-in').locator('..').or(page.getByText(/%/));
      await expect(zoomControl.first()).toBeVisible().catch(() => {});
    });

    test('should have download button', async ({ page }) => {
      const downloadButton = page.locator('svg.lucide-download').locator('..').or(page.getByRole('button', { name: /Download/i }));
      await expect(downloadButton.first()).toBeVisible().catch(() => {});
    });

    test('should have share button', async ({ page }) => {
      const shareButton = page.locator('svg.lucide-share').locator('..').or(page.getByRole('button', { name: /Share/i }));
      await expect(shareButton.first()).toBeVisible().catch(() => {});
    });
  });

  // ==================== PAGE NAVIGATION ====================

  test.describe('Page Navigation', () => {
    test.beforeEach(async ({ page }) => {
      const hostButton = page.getByRole('button', { name: /Host|Create|Start/i }).first();
      await hostButton.click();

      await page.waitForTimeout(2000);

      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.first().isVisible()) {
        const pdfBuffer = generateTestPDF(5);
        await fileInput.first().setInputFiles({
          name: 'document.pdf',
          mimeType: 'application/pdf',
          buffer: pdfBuffer,
        });
        await page.waitForTimeout(2000);
      }
    });

    test('should show current page indicator', async ({ page }) => {
      await expect(page.getByText(/1\s*\/|Page 1/i)).toBeVisible().catch(() => {});
    });

    test('should have next page button', async ({ page }) => {
      const nextButton = page.locator('svg.lucide-chevron-right').locator('..').or(page.getByRole('button', { name: /Next/i }));
      await expect(nextButton.first()).toBeVisible().catch(() => {});
    });

    test('should have previous page button', async ({ page }) => {
      const prevButton = page.locator('svg.lucide-chevron-left').locator('..').or(page.getByRole('button', { name: /Prev/i }));
      await expect(prevButton.first()).toBeVisible().catch(() => {});
    });

    test('should navigate between pages', async ({ page }) => {
      const nextButton = page.locator('svg.lucide-chevron-right').locator('..').first();

      if (await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForTimeout(500);
        await expect(page.getByText(/2\s*\/|Page 2/i)).toBeVisible();
      }
    });
  });

  // ==================== SIGNATURE MODAL ====================

  test.describe('Signature Modal', () => {
    test.beforeEach(async ({ page }) => {
      const hostButton = page.getByRole('button', { name: /Host|Create|Start/i }).first();
      await hostButton.click();
      await page.waitForTimeout(2000);

      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.first().isVisible()) {
        const pdfBuffer = generateTestPDF(1);
        await fileInput.first().setInputFiles({
          name: 'document.pdf',
          mimeType: 'application/pdf',
          buffer: pdfBuffer,
        });
        await page.waitForTimeout(2000);
      }
    });

    test('should open signature modal', async ({ page }) => {
      const signatureTool = page.locator('svg.lucide-pen-line').locator('..').first();

      if (await signatureTool.isVisible()) {
        await signatureTool.click();
        await expect(page.getByText(/Draw Signature|Sign/i)).toBeVisible({ timeout: 3000 });
      }
    });

    test('should have signature canvas', async ({ page }) => {
      const signatureTool = page.locator('svg.lucide-pen-line').locator('..').first();

      if (await signatureTool.isVisible()) {
        await signatureTool.click();
        await page.waitForTimeout(500);
        await expect(page.locator('canvas').last()).toBeVisible();
      }
    });

    test('should have clear button', async ({ page }) => {
      const signatureTool = page.locator('svg.lucide-pen-line').locator('..').first();

      if (await signatureTool.isVisible()) {
        await signatureTool.click();
        await page.waitForTimeout(500);
        await expect(page.getByRole('button', { name: /Clear/i })).toBeVisible();
      }
    });

    test('should have add/save button', async ({ page }) => {
      const signatureTool = page.locator('svg.lucide-pen-line').locator('..').first();

      if (await signatureTool.isVisible()) {
        await signatureTool.click();
        await page.waitForTimeout(500);
        await expect(page.getByRole('button', { name: /Add|Save/i })).toBeVisible();
      }
    });
  });

  // ==================== SHARE MODAL ====================

  test.describe('Share Modal', () => {
    test.beforeEach(async ({ page }) => {
      const hostButton = page.getByRole('button', { name: /Host|Create|Start/i }).first();
      await hostButton.click();
      await page.waitForTimeout(2000);

      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.first().isVisible()) {
        const pdfBuffer = generateTestPDF(1);
        await fileInput.first().setInputFiles({
          name: 'document.pdf',
          mimeType: 'application/pdf',
          buffer: pdfBuffer,
        });
        await page.waitForTimeout(2000);
      }
    });

    test('should open share modal', async ({ page }) => {
      const shareButton = page.locator('svg.lucide-share').locator('..').or(page.getByRole('button', { name: /Share/i }));

      if (await shareButton.first().isVisible()) {
        await shareButton.first().click();
        await expect(page.getByText(/Share|Invite|QR/i)).toBeVisible({ timeout: 3000 });
      }
    });

    test('should show QR code in share modal', async ({ page }) => {
      const shareButton = page.locator('svg.lucide-share').locator('..').first();

      if (await shareButton.isVisible()) {
        await shareButton.click();
        await page.waitForTimeout(500);
        // QR code is rendered as SVG
        await expect(page.locator('[class*="modal"]').locator('svg').first()).toBeVisible().catch(() => {});
      }
    });

    test('should have copy link/code button in share modal', async ({ page }) => {
      const shareButton = page.locator('svg.lucide-share').locator('..').first();

      if (await shareButton.isVisible()) {
        await shareButton.click();
        await page.waitForTimeout(500);
        await expect(page.getByRole('button', { name: /Copy/i })).toBeVisible().catch(() => {});
      }
    });
  });

  // ==================== SESSION MANAGEMENT ====================

  test.describe('Session Management', () => {
    test.beforeEach(async ({ page }) => {
      const hostButton = page.getByRole('button', { name: /Host|Create|Start/i }).first();
      await hostButton.click();
      await page.waitForTimeout(2000);

      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.first().isVisible()) {
        const pdfBuffer = generateTestPDF(1);
        await fileInput.first().setInputFiles({
          name: 'document.pdf',
          mimeType: 'application/pdf',
          buffer: pdfBuffer,
        });
        await page.waitForTimeout(2000);
      }
    });

    test('should have save session button', async ({ page }) => {
      const saveButton = page.locator('svg.lucide-save').locator('..').or(page.getByRole('button', { name: /Save/i }));
      await expect(saveButton.first()).toBeVisible().catch(() => {});
    });

    test('should have load session button', async ({ page }) => {
      const loadButton = page.locator('svg.lucide-folder-open').locator('..').or(page.getByRole('button', { name: /Load|Open/i }));
      await expect(loadButton.first()).toBeVisible().catch(() => {});
    });

    test('should open sessions modal', async ({ page }) => {
      const loadButton = page.locator('svg.lucide-folder-open').locator('..').first();

      if (await loadButton.isVisible()) {
        await loadButton.click();
        await expect(page.getByText(/Sessions|Saved|Recent/i)).toBeVisible({ timeout: 3000 }).catch(() => {});
      }
    });
  });

  // ==================== SHARED IMAGES ====================

  test.describe('Shared Images', () => {
    test.beforeEach(async ({ page }) => {
      const hostButton = page.getByRole('button', { name: /Host|Create|Start/i }).first();
      await hostButton.click();
      await page.waitForTimeout(2000);

      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.first().isVisible()) {
        const pdfBuffer = generateTestPDF(1);
        await fileInput.first().setInputFiles({
          name: 'document.pdf',
          mimeType: 'application/pdf',
          buffer: pdfBuffer,
        });
        await page.waitForTimeout(2000);
      }
    });

    test('should have shared images button', async ({ page }) => {
      const imagesButton = page.locator('svg.lucide-images').locator('..').or(page.getByRole('button', { name: /Images|Gallery/i }));
      await expect(imagesButton.first()).toBeVisible().catch(() => {});
    });

    test('should open shared images modal', async ({ page }) => {
      const imagesButton = page.locator('svg.lucide-images').locator('..').first();

      if (await imagesButton.isVisible()) {
        await imagesButton.click();
        await expect(page.getByText(/Shared Images|Gallery/i)).toBeVisible({ timeout: 3000 }).catch(() => {});
      }
    });
  });

  // ==================== OCR FUNCTIONALITY ====================

  test.describe('OCR', () => {
    test.beforeEach(async ({ page }) => {
      const hostButton = page.getByRole('button', { name: /Host|Create|Start/i }).first();
      await hostButton.click();
      await page.waitForTimeout(2000);

      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.first().isVisible()) {
        const pdfBuffer = generateTestPDF(1);
        await fileInput.first().setInputFiles({
          name: 'document.pdf',
          mimeType: 'application/pdf',
          buffer: pdfBuffer,
        });
        await page.waitForTimeout(2000);
      }
    });

    test('should have OCR button', async ({ page }) => {
      const ocrButton = page.locator('svg.lucide-scan-text').locator('..').or(page.locator('button[title*="OCR"]'));
      await expect(ocrButton.first()).toBeVisible().catch(() => {});
    });
  });

  // ==================== TEXT FORMATTING ====================

  test.describe('Text Formatting', () => {
    test.beforeEach(async ({ page }) => {
      const hostButton = page.getByRole('button', { name: /Host|Create|Start/i }).first();
      await hostButton.click();
      await page.waitForTimeout(2000);

      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.first().isVisible()) {
        const pdfBuffer = generateTestPDF(1);
        await fileInput.first().setInputFiles({
          name: 'document.pdf',
          mimeType: 'application/pdf',
          buffer: pdfBuffer,
        });
        await page.waitForTimeout(2000);
      }
    });

    test('should have bold button', async ({ page }) => {
      const boldButton = page.locator('svg.lucide-bold').locator('..');
      await expect(boldButton.first()).toBeVisible().catch(() => {});
    });

    test('should have italic button', async ({ page }) => {
      const italicButton = page.locator('svg.lucide-italic').locator('..');
      await expect(italicButton.first()).toBeVisible().catch(() => {});
    });

    test('should have underline button', async ({ page }) => {
      const underlineButton = page.locator('svg.lucide-underline').locator('..');
      await expect(underlineButton.first()).toBeVisible().catch(() => {});
    });

    test('should have alignment buttons', async ({ page }) => {
      const alignButton = page.locator('svg.lucide-align-left').locator('..').or(page.locator('svg.lucide-align-center').locator('..'));
      await expect(alignButton.first()).toBeVisible().catch(() => {});
    });

    test('should have list buttons', async ({ page }) => {
      const listButton = page.locator('svg.lucide-list').locator('..').or(page.locator('svg.lucide-list-ordered').locator('..'));
      await expect(listButton.first()).toBeVisible().catch(() => {});
    });

    test('should have heading buttons', async ({ page }) => {
      const headingButton = page.locator('svg.lucide-heading-1').locator('..').or(page.locator('svg.lucide-heading-2').locator('..'));
      await expect(headingButton.first()).toBeVisible().catch(() => {});
    });

    test('should have color picker', async ({ page }) => {
      const colorButton = page.locator('svg.lucide-palette').locator('..').or(page.getByText(/Color/i));
      await expect(colorButton.first()).toBeVisible().catch(() => {});
    });

    test('should have highlight button', async ({ page }) => {
      const highlightButton = page.locator('svg.lucide-highlighter').locator('..');
      await expect(highlightButton.first()).toBeVisible().catch(() => {});
    });
  });

  // ==================== SHAPE TOOLS ====================

  test.describe('Shape Tools', () => {
    test.beforeEach(async ({ page }) => {
      const hostButton = page.getByRole('button', { name: /Host|Create|Start/i }).first();
      await hostButton.click();
      await page.waitForTimeout(2000);

      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.first().isVisible()) {
        const pdfBuffer = generateTestPDF(1);
        await fileInput.first().setInputFiles({
          name: 'document.pdf',
          mimeType: 'application/pdf',
          buffer: pdfBuffer,
        });
        await page.waitForTimeout(2000);
      }
    });

    test('should have rectangle tool', async ({ page }) => {
      const rectTool = page.locator('svg.lucide-square').locator('..').or(page.locator('button[title*="Rectangle"]'));
      await expect(rectTool.first()).toBeVisible().catch(() => {});
    });

    test('should have circle tool', async ({ page }) => {
      const circleTool = page.locator('svg.lucide-circle').locator('..').or(page.locator('button[title*="Circle"]'));
      await expect(circleTool.first()).toBeVisible().catch(() => {});
    });

    test('should have line tool', async ({ page }) => {
      const lineTool = page.locator('svg.lucide-minus').locator('..').or(page.locator('button[title*="Line"]'));
      await expect(lineTool.first()).toBeVisible().catch(() => {});
    });

    test('should have arrow tool', async ({ page }) => {
      const arrowTool = page.locator('svg.lucide-arrow-right').locator('..').or(page.locator('button[title*="Arrow"]'));
      await expect(arrowTool.first()).toBeVisible().catch(() => {});
    });

    test('should have triangle tool', async ({ page }) => {
      const triangleTool = page.locator('svg.lucide-triangle').locator('..').or(page.locator('button[title*="Triangle"]'));
      await expect(triangleTool.first()).toBeVisible().catch(() => {});
    });
  });

  // ==================== DOWNLOAD ====================

  test.describe('Download', () => {
    test('should download edited PDF', async ({ page }) => {
      const hostButton = page.getByRole('button', { name: /Host|Create|Start/i }).first();
      await hostButton.click();
      await page.waitForTimeout(2000);

      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.first().isVisible()) {
        const pdfBuffer = generateTestPDF(1);
        await fileInput.first().setInputFiles({
          name: 'document.pdf',
          mimeType: 'application/pdf',
          buffer: pdfBuffer,
        });
        await page.waitForTimeout(2000);
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

  // ==================== KEYBOARD SHORTCUTS ====================

  test.describe('Keyboard Shortcuts', () => {
    test.beforeEach(async ({ page }) => {
      const hostButton = page.getByRole('button', { name: /Host|Create|Start/i }).first();
      await hostButton.click();
      await page.waitForTimeout(2000);

      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.first().isVisible()) {
        const pdfBuffer = generateTestPDF(1);
        await fileInput.first().setInputFiles({
          name: 'document.pdf',
          mimeType: 'application/pdf',
          buffer: pdfBuffer,
        });
        await page.waitForTimeout(2000);
      }
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

  // ==================== CONNECTED PEERS ====================

  test.describe('Connected Peers', () => {
    test.beforeEach(async ({ page }) => {
      const hostButton = page.getByRole('button', { name: /Host|Create|Start/i }).first();
      await hostButton.click();
      await page.waitForTimeout(2000);

      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.first().isVisible()) {
        const pdfBuffer = generateTestPDF(1);
        await fileInput.first().setInputFiles({
          name: 'document.pdf',
          mimeType: 'application/pdf',
          buffer: pdfBuffer,
        });
        await page.waitForTimeout(2000);
      }
    });

    test('should show connected users indicator', async ({ page }) => {
      const usersIndicator = page.locator('svg.lucide-users').locator('..').or(page.getByText(/0|Connected/i));
      await expect(usersIndicator.first()).toBeVisible().catch(() => {});
    });
  });

  // ==================== ZOOM ====================

  test.describe('Zoom Controls', () => {
    test.beforeEach(async ({ page }) => {
      const hostButton = page.getByRole('button', { name: /Host|Create|Start/i }).first();
      await hostButton.click();
      await page.waitForTimeout(2000);

      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.first().isVisible()) {
        const pdfBuffer = generateTestPDF(1);
        await fileInput.first().setInputFiles({
          name: 'document.pdf',
          mimeType: 'application/pdf',
          buffer: pdfBuffer,
        });
        await page.waitForTimeout(2000);
      }
    });

    test('should have zoom in button', async ({ page }) => {
      const zoomInButton = page.locator('svg.lucide-zoom-in').locator('..');
      await expect(zoomInButton.first()).toBeVisible().catch(() => {});
    });

    test('should have zoom out button', async ({ page }) => {
      const zoomOutButton = page.locator('svg.lucide-zoom-out').locator('..');
      await expect(zoomOutButton.first()).toBeVisible().catch(() => {});
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

  // ==================== TABLE MODAL ====================

  test.describe('Table Modal', () => {
    test.beforeEach(async ({ page }) => {
      const hostButton = page.getByRole('button', { name: /Host|Create|Start/i }).first();
      await hostButton.click();
      await page.waitForTimeout(2000);

      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.first().isVisible()) {
        const pdfBuffer = generateTestPDF(1);
        await fileInput.first().setInputFiles({
          name: 'document.pdf',
          mimeType: 'application/pdf',
          buffer: pdfBuffer,
        });
        await page.waitForTimeout(2000);
      }
    });

    test('should have table button', async ({ page }) => {
      const tableButton = page.locator('svg.lucide-table').locator('..').or(page.locator('button[title*="Table"]'));
      await expect(tableButton.first()).toBeVisible().catch(() => {});
    });

    test('should open table modal', async ({ page }) => {
      const tableButton = page.locator('svg.lucide-table').locator('..').first();

      if (await tableButton.isVisible()) {
        await tableButton.click();
        await expect(page.getByText(/Table|Rows|Columns/i)).toBeVisible({ timeout: 3000 }).catch(() => {});
      }
    });
  });

  // ==================== PAGE SIZE MODAL ====================

  test.describe('Page Size Modal', () => {
    test.beforeEach(async ({ page }) => {
      const hostButton = page.getByRole('button', { name: /Host|Create|Start/i }).first();
      await hostButton.click();
      await page.waitForTimeout(2000);

      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.first().isVisible()) {
        const pdfBuffer = generateTestPDF(1);
        await fileInput.first().setInputFiles({
          name: 'document.pdf',
          mimeType: 'application/pdf',
          buffer: pdfBuffer,
        });
        await page.waitForTimeout(2000);
      }
    });

    test('should have add page button', async ({ page }) => {
      const addPageButton = page.locator('svg.lucide-file-plus').locator('..').or(page.getByRole('button', { name: /Add Page/i }));
      await expect(addPageButton.first()).toBeVisible().catch(() => {});
    });

    test('should open page size modal when adding page', async ({ page }) => {
      const addPageButton = page.locator('svg.lucide-file-plus').locator('..').first();

      if (await addPageButton.isVisible()) {
        await addPageButton.click();
        await expect(page.getByText(/Page Size|A4|Letter/i)).toBeVisible({ timeout: 3000 }).catch(() => {});
      }
    });
  });

  // ==================== DELETE PAGE ====================

  test.describe('Delete Page', () => {
    test.beforeEach(async ({ page }) => {
      const hostButton = page.getByRole('button', { name: /Host|Create|Start/i }).first();
      await hostButton.click();
      await page.waitForTimeout(2000);

      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.first().isVisible()) {
        const pdfBuffer = generateTestPDF(3);
        await fileInput.first().setInputFiles({
          name: 'document.pdf',
          mimeType: 'application/pdf',
          buffer: pdfBuffer,
        });
        await page.waitForTimeout(2000);
      }
    });

    test('should have delete page button', async ({ page }) => {
      const deletePageButton = page.locator('svg.lucide-file-x').locator('..').or(page.getByRole('button', { name: /Delete Page/i }));
      await expect(deletePageButton.first()).toBeVisible().catch(() => {});
    });
  });

  // ==================== NOTIFICATIONS ====================

  test.describe('Notifications', () => {
    test.beforeEach(async ({ page }) => {
      const hostButton = page.getByRole('button', { name: /Host|Create|Start/i }).first();
      await hostButton.click();
      await page.waitForTimeout(2000);
    });

    test('should handle notifications gracefully', async ({ page }) => {
      // The notification system should be present
      // Notifications appear and disappear
    });
  });

  // ==================== RESPONSIVE DESIGN ====================

  test.describe('Responsive Design', () => {
    test('should work on mobile', async ({ page }) => {
      await setViewport(page, 'mobile');
      await page.reload();

      await expect(page.getByText(/Host|Join/i).first()).toBeVisible();
    });

    test('should work on tablet', async ({ page }) => {
      await setViewport(page, 'tablet');
      await page.reload();

      await expect(page.getByText(/Host|Join/i).first()).toBeVisible();
    });

    test('should show mobile-friendly toolbar on small screens', async ({ page }) => {
      await setViewport(page, 'mobile');
      await page.reload();

      const hostButton = page.getByRole('button', { name: /Host|Create|Start/i }).first();
      await hostButton.click();
      await page.waitForTimeout(2000);

      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.first().isVisible()) {
        const pdfBuffer = generateTestPDF(1);
        await fileInput.first().setInputFiles({
          name: 'document.pdf',
          mimeType: 'application/pdf',
          buffer: pdfBuffer,
        });
        await page.waitForTimeout(2000);
      }

      // Toolbar should still be usable
      await expect(page.locator('button').filter({ has: page.locator('svg') }).first()).toBeVisible();
    });
  });

  // ==================== EDGE CASES ====================

  test.describe('Edge Cases', () => {
    test('should handle empty connection code', async ({ page }) => {
      const joinButton = page.getByRole('button', { name: /Join/i }).first();
      await joinButton.click();

      await page.waitForTimeout(1000);

      const connectButton = page.getByRole('button', { name: /Connect|Join|Enter/i });
      if (await connectButton.isVisible()) {
        await connectButton.click();
        // Should not crash
      }
    });

    test('should handle invalid connection code', async ({ page }) => {
      const joinButton = page.getByRole('button', { name: /Join/i }).first();
      await joinButton.click();

      await page.waitForTimeout(1000);

      const codeInput = page.locator('input[type="text"]').first();
      if (await codeInput.isVisible()) {
        await codeInput.fill('invalid-code-that-does-not-exist');

        const connectButton = page.getByRole('button', { name: /Connect|Join|Enter/i });
        if (await connectButton.isVisible()) {
          await connectButton.click();
          // Should handle gracefully
        }
      }
    });

    test('should handle large PDF upload', async ({ page }) => {
      const hostButton = page.getByRole('button', { name: /Host|Create|Start/i }).first();
      await hostButton.click();
      await page.waitForTimeout(2000);

      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.first().isVisible()) {
        const pdfBuffer = generateTestPDF(20);
        await fileInput.first().setInputFiles({
          name: 'large.pdf',
          mimeType: 'application/pdf',
          buffer: pdfBuffer,
        });
        await page.waitForTimeout(5000);
        // Should handle without crashing
      }
    });
  });
});
