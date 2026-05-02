// Type definitions for PDF collaboration
// The usePeer hook has been replaced by useSupabaseCollab.
// This file is kept for type exports used throughout the app.

export interface SharedImage {
  id: string;
  dataUrl: string;
  name: string;
  uploadedAt: number;
}

export type PeerMessage =
  | { type: "pdf-data"; data: string } // base64 PDF
  | { type: "add-element"; element: PDFElement }
  | { type: "update-element"; id: string; updates: Partial<PDFElement> }
  | { type: "delete-element"; id: string }
  | { type: "add-page"; pageSize: PageSize }
  | { type: "delete-page"; pageIndex: number }
  | { type: "sync-request" }
  | { type: "sync-response"; state: CollabState }
  | { type: "share-image"; image: SharedImage }
  | { type: "delete-shared-image"; id: string }
  | { type: "peer-count"; count: number };

export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: "left" | "center" | "right" | "justify";
  lineHeight: number;
  listType?: "none" | "bullet" | "numbered";
  heading?: "none" | "h1" | "h2" | "h3";
}

export interface ShapeStyle {
  shapeType: "rectangle" | "circle" | "line" | "arrow" | "triangle";
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
}

export interface PDFElement {
  id: string;
  type: "text" | "image" | "signature" | "shape" | "richtext" | "checkbox";
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string; // text content or base64 image
  // Text formatting
  fontSize?: number;
  fontColor?: string;
  textStyle?: TextStyle;
  // Shape properties
  shapeStyle?: ShapeStyle;
  // For document flow mode
  isFlowText?: boolean;
  // Header/Footer
  isHeader?: boolean;
  isFooter?: boolean;
  // Rotation
  rotation?: number;
  // OCR extracted text
  isOCRText?: boolean;
}

export interface PageSize {
  width: number;
  height: number;
  name: string;
}

export interface CollabState {
  pdfBase64: string | null;
  elements: PDFElement[];
  pages: PageSize[];
  sharedImages?: SharedImage[];
}
