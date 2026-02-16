import Tesseract from 'tesseract.js';

// Supported OCR languages
export const OCR_LANGUAGES = [
  { code: 'eng', name: 'English', flag: '🇺🇸' },
  { code: 'spa', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fra', name: 'French', flag: '🇫🇷' },
  { code: 'deu', name: 'German', flag: '🇩🇪' },
  { code: 'ita', name: 'Italian', flag: '🇮🇹' },
  { code: 'por', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'rus', name: 'Russian', flag: '🇷🇺' },
  { code: 'jpn', name: 'Japanese', flag: '🇯🇵' },
  { code: 'kor', name: 'Korean', flag: '🇰🇷' },
  { code: 'chi_sim', name: 'Chinese (Simplified)', flag: '🇨🇳' },
  { code: 'chi_tra', name: 'Chinese (Traditional)', flag: '🇹🇼' },
  { code: 'ara', name: 'Arabic', flag: '🇸🇦' },
  { code: 'hin', name: 'Hindi', flag: '🇮🇳' },
  { code: 'tha', name: 'Thai', flag: '🇹🇭' },
  { code: 'vie', name: 'Vietnamese', flag: '🇻🇳' },
  { code: 'nld', name: 'Dutch', flag: '🇳🇱' },
  { code: 'pol', name: 'Polish', flag: '🇵🇱' },
  { code: 'tur', name: 'Turkish', flag: '🇹🇷' },
  { code: 'ukr', name: 'Ukrainian', flag: '🇺🇦' },
  { code: 'heb', name: 'Hebrew', flag: '🇮🇱' },
] as const;

export type OCRLanguageCode = typeof OCR_LANGUAGES[number]['code'];

export interface OCRWord {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

export interface OCRLine {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  words: OCRWord[];
}

export interface OCRResult {
  lines: OCRLine[];
  fullText: string;
}

/**
 * Extract text with positions from an image using Tesseract OCR
 * @param imageSource - Canvas element, image URL, or base64 string
 * @param onProgress - Progress callback (0-1)
 * @param language - OCR language code (default: 'eng')
 */
export async function extractTextFromImage(
  imageSource: HTMLCanvasElement | string,
  onProgress?: (progress: number) => void,
  language: OCRLanguageCode = 'eng'
): Promise<OCRResult> {
  const result = await Tesseract.recognize(imageSource, language, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(m.progress);
      }
    },
  });

  const lines: OCRLine[] = [];

  // Tesseract v7 structure: Page -> blocks -> paragraphs -> lines -> words
  const blocks = result.data.blocks;
  if (blocks) {
    for (const block of blocks) {
      for (const paragraph of block.paragraphs) {
        for (const line of paragraph.lines) {
          const words: OCRWord[] = line.words.map((word) => ({
            text: word.text,
            x: word.bbox.x0,
            y: word.bbox.y0,
            width: word.bbox.x1 - word.bbox.x0,
            height: word.bbox.y1 - word.bbox.y0,
            confidence: word.confidence,
          }));

          lines.push({
            text: line.text,
            x: line.bbox.x0,
            y: line.bbox.y0,
            width: line.bbox.x1 - line.bbox.x0,
            height: line.bbox.y1 - line.bbox.y0,
            words,
          });
        }
      }
    }
  }

  return {
    lines,
    fullText: result.data.text,
  };
}

/**
 * Convert PDF page canvas to image for OCR processing
 * Returns scaled coordinates converter
 */
export function getCanvasScaleFactor(
  canvas: HTMLCanvasElement,
  pageWidth: number,
  pageHeight: number
): { scaleX: number; scaleY: number } {
  // Canvas might be rendered at higher resolution (devicePixelRatio)
  // We need to convert OCR coordinates back to PDF coordinates
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;

  return {
    scaleX: pageWidth / canvasWidth,
    scaleY: pageHeight / canvasHeight,
  };
}

/**
 * Scale OCR result coordinates to match PDF page coordinates
 */
export function scaleOCRResult(
  result: OCRResult,
  scaleX: number,
  scaleY: number
): OCRResult {
  return {
    fullText: result.fullText,
    lines: result.lines.map((line) => ({
      ...line,
      x: line.x * scaleX,
      y: line.y * scaleY,
      width: line.width * scaleX,
      height: line.height * scaleY,
      words: line.words.map((word) => ({
        ...word,
        x: word.x * scaleX,
        y: word.y * scaleY,
        width: word.width * scaleX,
        height: word.height * scaleY,
      })),
    })),
  };
}
