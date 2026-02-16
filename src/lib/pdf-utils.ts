import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage, degrees } from "pdf-lib";
import type { PDFElement, PageSize } from "@/hooks/usePeer";

// Page rotation type
export type RotationDegrees = 0 | 90 | 180 | 270;

// Styled text segment for rich text rendering
interface StyledSegment {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  color: string;
  fontSize: number;
  highlight?: string;
}

// Parse HTML content into styled segments
function parseHtmlToSegments(html: string, defaultFontSize: number = 12): StyledSegment[] {
  const segments: StyledSegment[] = [];

  // Create a temporary element to parse HTML
  if (typeof document === "undefined") {
    // Server-side fallback - just strip HTML
    return [{ text: html.replace(/<[^>]*>/g, ''), bold: false, italic: false, underline: false, color: "#000000", fontSize: defaultFontSize }];
  }

  const container = document.createElement("div");
  container.innerHTML = html;

  function processNode(node: Node, inheritedStyle: Partial<StyledSegment>) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || "";
      if (text) {
        segments.push({
          text,
          bold: inheritedStyle.bold || false,
          italic: inheritedStyle.italic || false,
          underline: inheritedStyle.underline || false,
          color: inheritedStyle.color || "#000000",
          fontSize: inheritedStyle.fontSize || defaultFontSize,
          highlight: inheritedStyle.highlight,
        });
      }
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node as HTMLElement;
    const tagName = el.tagName.toLowerCase();
    const style = { ...inheritedStyle };

    // Handle formatting tags
    if (tagName === "strong" || tagName === "b") style.bold = true;
    if (tagName === "em" || tagName === "i") style.italic = true;
    if (tagName === "u") style.underline = true;
    if (tagName === "h1") { style.bold = true; style.fontSize = 24; }
    if (tagName === "h2") { style.bold = true; style.fontSize = 20; }
    if (tagName === "h3") { style.bold = true; style.fontSize = 16; }

    // Handle inline styles
    const inlineColor = el.style.color;
    if (inlineColor) {
      style.color = colorToHex(inlineColor);
    }

    const inlineFontSize = el.style.fontSize;
    if (inlineFontSize) {
      const size = parseInt(inlineFontSize);
      if (!isNaN(size)) style.fontSize = size;
    }

    const inlineBackground = el.style.backgroundColor;
    if (inlineBackground && inlineBackground !== "transparent") {
      style.highlight = colorToHex(inlineBackground);
    }

    // Handle mark (highlight) tag
    if (tagName === "mark") {
      style.highlight = el.style.backgroundColor ? colorToHex(el.style.backgroundColor) : "#ffff00";
    }

    // Handle span with data attributes or classes
    if (el.dataset.color) style.color = el.dataset.color;

    // Handle line breaks and paragraphs
    if (tagName === "br") {
      segments.push({ text: "\n", bold: false, italic: false, underline: false, color: "#000000", fontSize: defaultFontSize });
      return;
    }

    if (tagName === "p" && segments.length > 0) {
      // Add newline before paragraph (except first)
      const lastSeg = segments[segments.length - 1];
      if (lastSeg && !lastSeg.text.endsWith("\n")) {
        segments.push({ text: "\n", bold: false, italic: false, underline: false, color: "#000000", fontSize: defaultFontSize });
      }
    }

    // Handle list items
    if (tagName === "li") {
      if (segments.length > 0) {
        segments.push({ text: "\n", bold: false, italic: false, underline: false, color: "#000000", fontSize: defaultFontSize });
      }
      // Check if parent is ol or ul
      const parent = el.parentElement;
      if (parent?.tagName.toLowerCase() === "ol") {
        const index = Array.from(parent.children).indexOf(el) + 1;
        segments.push({ text: `${index}. `, bold: false, italic: false, underline: false, color: style.color || "#000000", fontSize: style.fontSize || defaultFontSize });
      } else {
        segments.push({ text: "• ", bold: false, italic: false, underline: false, color: style.color || "#000000", fontSize: style.fontSize || defaultFontSize });
      }
    }

    // Process children
    for (const child of Array.from(node.childNodes)) {
      processNode(child, style);
    }

    // Add newline after block elements
    if (tagName === "p" || tagName === "div" || tagName === "h1" || tagName === "h2" || tagName === "h3") {
      if (segments.length > 0) {
        const lastSeg = segments[segments.length - 1];
        if (lastSeg && !lastSeg.text.endsWith("\n")) {
          segments.push({ text: "\n", bold: false, italic: false, underline: false, color: "#000000", fontSize: defaultFontSize });
        }
      }
    }
  }

  processNode(container, { fontSize: defaultFontSize, color: "#000000" });

  // Clean up: merge adjacent segments with same style and remove trailing newlines
  const cleaned: StyledSegment[] = [];
  for (const seg of segments) {
    if (cleaned.length > 0) {
      const last = cleaned[cleaned.length - 1];
      if (last.bold === seg.bold && last.italic === seg.italic && last.underline === seg.underline &&
          last.color === seg.color && last.fontSize === seg.fontSize && last.highlight === seg.highlight) {
        last.text += seg.text;
        continue;
      }
    }
    cleaned.push({ ...seg });
  }

  // Remove trailing newlines
  while (cleaned.length > 0 && cleaned[cleaned.length - 1].text === "\n") {
    cleaned.pop();
  }

  return cleaned.length > 0 ? cleaned : [{ text: "", bold: false, italic: false, underline: false, color: "#000000", fontSize: defaultFontSize }];
}

// Convert various color formats to hex
function colorToHex(color: string): string {
  if (color.startsWith("#")) return color;

  // Handle rgb/rgba
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]).toString(16).padStart(2, "0");
    const g = parseInt(rgbMatch[2]).toString(16).padStart(2, "0");
    const b = parseInt(rgbMatch[3]).toString(16).padStart(2, "0");
    return `#${r}${g}${b}`;
  }

  // Handle named colors (basic set)
  const namedColors: Record<string, string> = {
    black: "#000000", white: "#ffffff", red: "#ff0000", green: "#00ff00",
    blue: "#0000ff", yellow: "#ffff00", cyan: "#00ffff", magenta: "#ff00ff",
  };
  return namedColors[color.toLowerCase()] || "#000000";
}

// Font cache for PDF rendering
interface FontSet {
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
  boldItalic: PDFFont;
}

async function loadFonts(pdfDoc: PDFDocument): Promise<FontSet> {
  return {
    regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    italic: await pdfDoc.embedFont(StandardFonts.HelveticaOblique),
    boldItalic: await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique),
  };
}

function getFont(fonts: FontSet, bold: boolean, italic: boolean): PDFFont {
  if (bold && italic) return fonts.boldItalic;
  if (bold) return fonts.bold;
  if (italic) return fonts.italic;
  return fonts.regular;
}

// Draw rich text on PDF page
function drawRichText(
  page: PDFPage,
  segments: StyledSegment[],
  x: number,
  y: number,
  maxWidth: number,
  fonts: FontSet
) {
  const pageHeight = page.getHeight();
  let currentX = x;
  let currentY = pageHeight - y;
  const lineHeight = 1.4;
  let currentLineHeight = 0;

  for (const segment of segments) {
    if (!segment.text) continue;

    const font = getFont(fonts, segment.bold, segment.italic);
    const fontSize = segment.fontSize;
    const color = hexToRgb(segment.color);
    const rgbColor = rgb(color.r / 255, color.g / 255, color.b / 255);

    currentLineHeight = Math.max(currentLineHeight, fontSize * lineHeight);

    // Split text by newlines
    const lines = segment.text.split("\n");

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const lineText = lines[lineIdx];

      if (lineIdx > 0) {
        // Move to next line
        currentX = x;
        currentY -= currentLineHeight;
        currentLineHeight = fontSize * lineHeight;
      }

      if (!lineText) continue;

      // Word wrap within maxWidth
      const words = lineText.split(" ");
      let currentLine = "";

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = font.widthOfTextAtSize(testLine, fontSize);

        if (testWidth > maxWidth && currentLine) {
          // Draw highlight if present
          if (segment.highlight) {
            const highlightColor = hexToRgb(segment.highlight);
            const lineWidth = font.widthOfTextAtSize(currentLine, fontSize);
            page.drawRectangle({
              x: currentX,
              y: currentY - fontSize * 0.2,
              width: lineWidth,
              height: fontSize * 1.2,
              color: rgb(highlightColor.r / 255, highlightColor.g / 255, highlightColor.b / 255),
            });
          }

          // Draw current line
          page.drawText(currentLine, {
            x: currentX,
            y: currentY - fontSize,
            size: fontSize,
            font,
            color: rgbColor,
          });

          // Draw underline if needed
          if (segment.underline) {
            const lineWidth = font.widthOfTextAtSize(currentLine, fontSize);
            page.drawLine({
              start: { x: currentX, y: currentY - fontSize - 1 },
              end: { x: currentX + lineWidth, y: currentY - fontSize - 1 },
              thickness: 0.5,
              color: rgbColor,
            });
          }

          currentX = x;
          currentY -= currentLineHeight;
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }

      // Draw remaining text
      if (currentLine) {
        // Draw highlight if present
        if (segment.highlight) {
          const highlightColor = hexToRgb(segment.highlight);
          const lineWidth = font.widthOfTextAtSize(currentLine, fontSize);
          page.drawRectangle({
            x: currentX,
            y: currentY - fontSize * 0.2,
            width: lineWidth,
            height: fontSize * 1.2,
            color: rgb(highlightColor.r / 255, highlightColor.g / 255, highlightColor.b / 255),
          });
        }

        page.drawText(currentLine, {
          x: currentX,
          y: currentY - fontSize,
          size: fontSize,
          font,
          color: rgbColor,
        });

        // Draw underline if needed
        if (segment.underline) {
          const lineWidth = font.widthOfTextAtSize(currentLine, fontSize);
          page.drawLine({
            start: { x: currentX, y: currentY - fontSize - 1 },
            end: { x: currentX + lineWidth, y: currentY - fontSize - 1 },
            thickness: 0.5,
            color: rgbColor,
          });
        }

        currentX += font.widthOfTextAtSize(currentLine + " ", fontSize);
      }
    }
  }
}

// Standard page sizes (in points, 72 points = 1 inch)
export const PAGE_SIZES: Record<string, PageSize> = {
  // A Series (ISO)
  A3: { width: 841.89, height: 1190.55, name: "A3" },
  A4: { width: 595.28, height: 841.89, name: "A4" },
  A5: { width: 419.53, height: 595.28, name: "A5" },
  A6: { width: 297.64, height: 419.53, name: "A6" },

  // US Sizes
  Letter: { width: 612, height: 792, name: "Letter" },
  Legal: { width: 612, height: 1008, name: "Legal" },
  Tabloid: { width: 792, height: 1224, name: "Tabloid" },

  // Landscape versions
  "A4 Landscape": { width: 841.89, height: 595.28, name: "A4 Landscape" },
  "Letter Landscape": { width: 792, height: 612, name: "Letter Landscape" },

  // Other common sizes
  Executive: { width: 522, height: 756, name: "Executive" },
  B5: { width: 498.90, height: 708.66, name: "B5" },

  // Social Media / Digital
  "Square (8x8)": { width: 576, height: 576, name: "Square (8x8)" },
  "Instagram Post": { width: 612, height: 612, name: "Instagram Post" },
  "Presentation (16:9)": { width: 842, height: 474, name: "Presentation (16:9)" },
};

// Create a blank PDF with specified pages
export async function createBlankPDF(pages: PageSize[]): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  for (const pageSize of pages) {
    pdfDoc.addPage([pageSize.width, pageSize.height]);
  }

  return await pdfDoc.save();
}

// Convert Uint8Array to base64
export function arrayBufferToBase64(buffer: Uint8Array): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert base64 to Uint8Array
export function base64ToArrayBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Add elements to PDF and return modified PDF bytes
export async function addElementsToPDF(
  pdfBytes: Uint8Array,
  elements: PDFElement[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const fonts = await loadFonts(pdfDoc);

  for (const element of elements) {
    const page = pages[element.pageIndex];
    if (!page) continue;

    const pageHeight = page.getHeight();

    if (element.type === "text") {
      const fontSize = element.fontSize || 16;
      const color = hexToRgb(element.fontColor || "#000000");

      page.drawText(element.content, {
        x: element.x,
        y: pageHeight - element.y - fontSize,
        size: fontSize,
        font: fonts.regular,
        color: rgb(color.r / 255, color.g / 255, color.b / 255),
      });
    } else if (element.type === "richtext") {
      // Parse HTML and render with formatting preserved
      const defaultFontSize = element.textStyle?.fontSize || 12;
      const segments = parseHtmlToSegments(element.content, defaultFontSize);
      drawRichText(page, segments, element.x, element.y, element.width, fonts);
    } else if (element.type === "image" || element.type === "signature") {
      try {
        const imageData = element.content;
        let image;

        if (imageData.includes("image/png") || imageData.startsWith("data:image/png")) {
          const base64Data = imageData.split(",")[1] || imageData;
          image = await pdfDoc.embedPng(base64ToArrayBuffer(base64Data));
        } else {
          const base64Data = imageData.split(",")[1] || imageData;
          image = await pdfDoc.embedJpg(base64ToArrayBuffer(base64Data));
        }

        page.drawImage(image, {
          x: element.x,
          y: pageHeight - element.y - element.height,
          width: element.width,
          height: element.height,
        });
      } catch (err) {
        console.error("Error embedding image:", err);
      }
    } else if (element.type === "checkbox") {
      // Render checkbox as ✓ if checked (content === "checked")
      if (element.content === "checked") {
        const fontSize = element.fontSize || 16;
        page.drawText("✓", {
          x: element.x + 2,
          y: pageHeight - element.y - fontSize,
          size: fontSize,
          font: fonts.regular,
          color: rgb(0, 0, 0),
        });
      }
      // Draw checkbox border
      page.drawRectangle({
        x: element.x,
        y: pageHeight - element.y - element.height,
        width: element.width,
        height: element.height,
        borderColor: rgb(0.4, 0.4, 0.4),
        borderWidth: 1.5,
      });
    } else if (element.type === "shape" && element.shapeStyle) {
      // Basic shape rendering (Rectangle/Circle/Line handled as approx)
      // Note: pdf-lib has limited shape drawing, using SVG paths or simple rects/circles
      const { shapeType, strokeColor, fillColor, strokeWidth } = element.shapeStyle;
      const sc = hexToRgb(strokeColor);
      const fc = fillColor !== "transparent" ? hexToRgb(fillColor) : undefined;
      const color = rgb(sc.r / 255, sc.g / 255, sc.b / 255);
      const fill = fc ? rgb(fc.r / 255, fc.g / 255, fc.b / 255) : undefined;

      if (shapeType === "rectangle") {
        page.drawRectangle({
          x: element.x,
          y: pageHeight - element.y - element.height,
          width: element.width,
          height: element.height,
          borderColor: color,
          borderWidth: strokeWidth,
          color: fill,
        });
      } else if (shapeType === "circle") {
        // Ellipse not natively supported easily in this version without creating path? 
        // pdf-lib supports drawEllipse since 1.16? Let's check docs or keep simple.
        // We'll skip complex shapes for now or use drawCircle if width~height
        page.drawEllipse({
          x: element.x + element.width / 2,
          y: pageHeight - element.y - element.height / 2,
          xScale: element.width / 2,
          yScale: element.height / 2,
          borderColor: color,
          borderWidth: strokeWidth,
          color: fill,
        });
      }
      // Other shapes omitted for simplicity in this pass
    }
  }

  return await pdfDoc.save();
}

function stripHtml(html: string): string {
  if (typeof document === "undefined") return html.replace(/<[^>]*>?/gm, "");
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html.replace(/<p>/g, "\n").replace(/<br>/g, "\n").replace(/<\/p>/g, "").replace(/<li>/g, "\n• ");
  return tmp.textContent || tmp.innerText || "";
}

// Get PDF page count
export async function getPDFPageCount(pdfBytes: Uint8Array): Promise<number> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  return pdfDoc.getPageCount();
}

// Get PDF page sizes
export async function getPDFPageSizes(pdfBytes: Uint8Array): Promise<PageSize[]> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();

  return pages.map((page, index) => ({
    width: page.getWidth(),
    height: page.getHeight(),
    name: `Page ${index + 1}`,
  }));
}

// Helper: hex to rgb
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    }
    : { r: 0, g: 0, b: 0 };
}

// Generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Download blob
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// File to base64
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Rotate a single page in PDF
export async function rotatePDFPage(
  pdfBytes: Uint8Array,
  pageIndex: number,
  rotation: RotationDegrees
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();

  if (pageIndex >= 0 && pageIndex < pages.length) {
    const page = pages[pageIndex];
    const currentRotation = page.getRotation().angle;
    page.setRotation(degrees((currentRotation + rotation) % 360));
  }

  return await pdfDoc.save();
}

// Rotate multiple pages in PDF
export async function rotatePDFPages(
  pdfBytes: Uint8Array,
  pageRotations: Map<number, RotationDegrees>
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();

  for (const [pageIndex, rotation] of pageRotations) {
    if (pageIndex >= 0 && pageIndex < pages.length && rotation !== 0) {
      const page = pages[pageIndex];
      const currentRotation = page.getRotation().angle;
      page.setRotation(degrees((currentRotation + rotation) % 360));
    }
  }

  return await pdfDoc.save();
}

// Get next rotation value (cycles through 0 -> 90 -> 180 -> 270 -> 0)
export function getNextRotation(current: RotationDegrees): RotationDegrees {
  const rotations: RotationDegrees[] = [0, 90, 180, 270];
  const currentIndex = rotations.indexOf(current);
  return rotations[(currentIndex + 1) % 4];
}

// Drawing path interface
export interface DrawPathData {
  points: { x: number; y: number }[];
  color: string;
  width: number;
  isHighlight: boolean;
}

// Sticky note interface
export interface StickyNoteData {
  id: string;
  pageIndex: number;
  x: number;
  y: number;
  text: string;
  color: string;
}

// Add drawings and sticky notes to PDF
export async function addAnnotationsToPDF(
  pdfBytes: Uint8Array,
  drawPaths: Map<number, DrawPathData[]>,
  stickyNotes: StickyNoteData[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Draw paths on each page
  for (const [pageIndex, paths] of drawPaths) {
    const page = pages[pageIndex];
    if (!page) continue;

    const pageHeight = page.getHeight();

    for (const path of paths) {
      if (path.points.length < 2) continue;

      const color = hexToRgbInternal(path.color);
      const rgbColor = rgb(color.r / 255, color.g / 255, color.b / 255);

      // Draw line segments between points
      for (let i = 0; i < path.points.length - 1; i++) {
        const start = path.points[i];
        const end = path.points[i + 1];

        if (path.isHighlight) {
          // For highlights, draw a semi-transparent rectangle
          const minX = Math.min(start.x, end.x);
          const maxX = Math.max(start.x, end.x);
          const y = pageHeight - Math.max(start.y, end.y) - path.width / 2;

          page.drawRectangle({
            x: minX,
            y: y,
            width: Math.max(maxX - minX, 2),
            height: path.width,
            color: rgbColor,
            opacity: 0.4,
          });
        } else {
          // For regular drawings, draw lines
          page.drawLine({
            start: { x: start.x, y: pageHeight - start.y },
            end: { x: end.x, y: pageHeight - end.y },
            thickness: path.width,
            color: rgbColor,
            opacity: 1,
          });
        }
      }
    }
  }

  // Add sticky notes as text annotations
  for (const note of stickyNotes) {
    const page = pages[note.pageIndex];
    if (!page || !note.text.trim()) continue;

    const pageHeight = page.getHeight();
    const noteColor = hexToRgbInternal(note.color);
    const bgColor = rgb(noteColor.r / 255, noteColor.g / 255, noteColor.b / 255);

    // Draw note background
    const noteWidth = 120;
    const noteHeight = Math.max(60, note.text.length * 0.8 + 30);
    const noteY = pageHeight - note.y - noteHeight;

    page.drawRectangle({
      x: note.x,
      y: noteY,
      width: noteWidth,
      height: noteHeight,
      color: bgColor,
      borderColor: rgb(0.7, 0.7, 0.5),
      borderWidth: 1,
    });

    // Draw note text
    const fontSize = 9;
    const lines = wrapText(note.text, noteWidth - 10, font, fontSize);
    let textY = noteY + noteHeight - 15;

    for (const line of lines) {
      if (textY < noteY + 5) break;
      page.drawText(line, {
        x: note.x + 5,
        y: textY,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
      textY -= fontSize + 2;
    }
  }

  return await pdfDoc.save();
}

// Helper to wrap text for sticky notes
function wrapText(text: string, maxWidth: number, font: PDFFont, fontSize: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);

    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

// Internal hex to RGB (to avoid naming conflict)
function hexToRgbInternal(hex: string): { r: number; g: number; b: number } {
  // Handle rgba format
  if (hex.startsWith('rgba')) {
    const match = hex.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) };
    }
  }

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}
