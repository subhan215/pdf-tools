"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft, Type, Image as ImageIcon, PenLine, Trash2, Download, Upload,
  ChevronLeft, ChevronRight, Bold, Italic, Underline, AlignLeft, AlignCenter,
  AlignRight, AlignJustify, List, ListOrdered, Square, Circle, Minus,
  ArrowRight, Triangle, Heading1, Heading2, MousePointer2,
  ZoomIn, ZoomOut, Undo, Redo, Palette, Highlighter, ChevronDown, X,
  Loader2, Table as TableIcon, RotateCw, Pencil, StickyNote, Eraser,
  Keyboard, CheckSquare, Check, FilePlus, FileX, Scaling, Save, FolderOpen,
  Clock, Trash
} from "lucide-react";
import { Rnd } from "react-rnd";
import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
  addElementsToPDF,
  getPDFPageSizes,
  PAGE_SIZES,
  createBlankPDF,
  generateId,
  downloadBlob,
  fileToBase64,
  rotatePDFPages,
  getNextRotation,
  addAnnotationsToPDF,
  type RotationDegrees,
  type DrawPathData,
  type StickyNoteData,
} from "@/lib/pdf-utils";
import {
  getDeviceId,
  saveFullSession,
  loadFullSession,
  listSessionsForDevice,
  deleteFullSession,
  generateSessionId,
  type SessionMetadata,
  type SessionElement,
} from "@/lib/session-storage";
import type { PDFElement, PageSize, TextStyle, ShapeStyle } from "@/hooks/usePeer";
import RichTextEditor, { RichTextEditorRef } from "@/components/RichTextEditor";
import KeyboardShortcutsModal from "@/components/KeyboardShortcutsModal";

type EditorMode = "select" | "text" | "document" | "shape" | "draw" | "highlight" | "note" | "checkbox";

const PAGE_DOCUMENT_PREFIX = "page-document-";

const LINE_SPACINGS = [
  { name: "Single", value: "1.0" },
  { name: "1.15", value: "1.15" },
  { name: "1.5", value: "1.5" },
  { name: "Double", value: "2.0" },
  { name: "2.5", value: "2.5" },
  { name: "Triple", value: "3.0" },
];
type ShapeType = "rectangle" | "circle" | "line" | "arrow" | "triangle";

interface DrawPath {
  points: { x: number; y: number }[];
  color: string;
  width: number;
  isHighlight: boolean;
}

interface StickyNote {
  id: string;
  pageIndex: number;
  x: number;
  y: number;
  text: string;
  color: string;
}

const FONT_FAMILIES = [
  { name: "Arial", value: "Arial, sans-serif" },
  { name: "Times New Roman", value: "Times New Roman, serif" },
  { name: "Georgia", value: "Georgia, serif" },
  { name: "Verdana", value: "Verdana, sans-serif" },
  { name: "Courier New", value: "Courier New, monospace" },
  { name: "Comic Sans", value: "Comic Sans MS, cursive" },
  { name: "Impact", value: "Impact, sans-serif" },
  { name: "Trebuchet", value: "Trebuchet MS, sans-serif" },
];

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72];

const TEXT_COLORS = [
  "#000000", "#434343", "#666666", "#999999", "#b7b7b7", "#cccccc", "#d9d9d9", "#efefef", "#f3f3f3", "#ffffff",
  "#980000", "#ff0000", "#ff9900", "#ffff00", "#00ff00", "#00ffff", "#4a86e8", "#0000ff", "#9900ff", "#ff00ff",
  "#e6b8af", "#f4cccc", "#fce5cd", "#fff2cc", "#d9ead3", "#d0e0e3", "#c9daf8", "#cfe2f3", "#d9d2e9", "#ead1dc",
  "#dd7e6b", "#ea9999", "#f9cb9c", "#ffe599", "#b6d7a8", "#a2c4c9", "#a4c2f4", "#9fc5e8", "#b4a7d6", "#d5a6bd",
  "#cc4125", "#e06666", "#f6b26b", "#ffd966", "#93c47d", "#76a5af", "#6d9eeb", "#6fa8dc", "#8e7cc3", "#c27ba0",
];

const HIGHLIGHT_COLORS = [
  "#ffff00", "#00ff00", "#00ffff", "#ff00ff", "#ff0000", "#0000ff",
  "#fffacd", "#98fb98", "#afeeee", "#dda0dd", "#f08080", "#add8e6",
  "#fff59d", "#a5d6a7", "#80deea", "#ce93d8", "#ef9a9a", "#90caf9",
  "#ffeb3b", "#4caf50", "#00bcd4", "#9c27b0", "#f44336", "#2196f3",
  "#fff176", "#81c784", "#4dd0e1", "#ba68c8", "#e57373", "#64b5f6",
];

const SHAPE_COLORS = [
  "#000000", "#434343", "#666666", "#999999", "#ffffff",
  "#ff0000", "#ff5722", "#ff9800", "#ffc107", "#ffeb3b",
  "#4caf50", "#8bc34a", "#cddc39", "#00bcd4", "#03a9f4",
  "#2196f3", "#3f51b5", "#673ab7", "#9c27b0", "#e91e63",
  "#795548", "#9e9e9e", "#607d8b", "#f44336", "#e91e63",
];

export default function EditPage() {
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [elements, setElements] = useState<PDFElement[]>([]);
  const [pages, setPages] = useState<PageSize[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [fileName, setFileName] = useState("document");
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [editorMode, setEditorMode] = useState<EditorMode>("select");

  // Shape state
  const [shapeType, setShapeType] = useState<ShapeType>("rectangle");
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [fillColor, setFillColor] = useState("transparent");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [isDrawingShape, setIsDrawingShape] = useState(false);
  const [shapeStart, setShapeStart] = useState({ x: 0, y: 0 });
  const [shapePreview, setShapePreview] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // Text formatting state
  const [currentFont, setCurrentFont] = useState("Arial");
  const [currentSize, setCurrentSize] = useState(16);
  const [currentColor, setCurrentColor] = useState("#000000");
  const [currentHighlight, setCurrentHighlight] = useState("transparent");
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);

  // Dropdown menus
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [showSizeMenu, setShowSizeMenu] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);
  const [showStrokeMenu, setShowStrokeMenu] = useState(false);
  const [showFillMenu, setShowFillMenu] = useState(false);
  const [showLineSpacingMenu, setShowLineSpacingMenu] = useState(false);

  // Modals
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showPageSizeModal, setShowPageSizeModal] = useState(false);
  const [showResizePageModal, setShowResizePageModal] = useState(false);
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Bulk delete pages
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [selectedPagesForDelete, setSelectedPagesForDelete] = useState<Set<number>>(new Set());
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);

  // Session management state
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentSessionName, setCurrentSessionName] = useState<string>("Untitled Session");
  const [savedSessions, setSavedSessions] = useState<SessionMetadata[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [sessionNameInput, setSessionNameInput] = useState("");

  // History for undo/redo (unified snapshot)
  interface HistorySnapshot {
    elements: PDFElement[];
    drawPaths: Map<number, DrawPath[]>;
    stickyNotes: StickyNote[];
    pageRotations: Map<number, RotationDegrees>;
  }
  const emptySnapshot: HistorySnapshot = { elements: [], drawPaths: new Map(), stickyNotes: [], pageRotations: new Map() };
  const [history, setHistory] = useState<HistorySnapshot[]>([emptySnapshot]);
  const [historyIndex, setHistoryIndex] = useState(0);


  // Page rotation state - tracks rotation for each page
  const [pageRotations, setPageRotations] = useState<Map<number, RotationDegrees>>(new Map());

  // Annotation state
  const [drawPaths, setDrawPaths] = useState<Map<number, DrawPath[]>>(new Map());
  const [currentPath, setCurrentPath] = useState<DrawPath | null>(null);
  const [isDrawingPath, setIsDrawingPath] = useState(false);
  const [drawColor, setDrawColor] = useState("#ff0000");
  const [drawWidth, setDrawWidth] = useState(3);
  const [highlightColor, setHighlightColor] = useState("rgba(255, 255, 0, 0.4)");
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([]);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [showDrawColorMenu, setShowDrawColorMenu] = useState(false);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const activeEditorRef = useRef<RichTextEditorRef | null>(null);
  const editorRefs = useRef<Map<string, RichTextEditorRef>>(new Map());

  // Build a snapshot of all undoable state
  const buildSnapshot = useCallback((
    elems?: PDFElement[],
    paths?: Map<number, DrawPath[]>,
    notes?: StickyNote[],
    rotations?: Map<number, RotationDegrees>,
  ): HistorySnapshot => ({
    elements: [...(elems ?? elements)],
    drawPaths: new Map((paths ?? drawPaths)),
    stickyNotes: [...(notes ?? stickyNotes)],
    pageRotations: new Map((rotations ?? pageRotations)),
  }), [elements, drawPaths, stickyNotes, pageRotations]);

  // Save state to history for undo/redo
  const saveToHistory = useCallback((snapshot?: HistorySnapshot) => {
    const snap = snapshot ?? buildSnapshot();
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(snap);
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex, buildSnapshot]);

  // Restore a snapshot
  const restoreSnapshot = useCallback((snap: HistorySnapshot) => {
    setElements([...snap.elements]);
    setDrawPaths(new Map(snap.drawPaths));
    setStickyNotes([...snap.stickyNotes]);
    setPageRotations(new Map(snap.pageRotations));
  }, []);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      restoreSnapshot(history[newIndex]);
    }
  }, [historyIndex, history, restoreSnapshot]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      restoreSnapshot(history[newIndex]);
    }
  }, [historyIndex, history, restoreSnapshot]);

  // Rotate current page
  const rotatePage = useCallback(() => {
    const newRotations = new Map(pageRotations);
    const currentRotation = newRotations.get(currentPage) || 0;
    newRotations.set(currentPage, getNextRotation(currentRotation));
    setPageRotations(newRotations);
    saveToHistory(buildSnapshot(undefined, undefined, undefined, newRotations));
  }, [currentPage, pageRotations, saveToHistory, buildSnapshot]);

  // Get current page rotation
  const getCurrentPageRotation = useCallback(() => {
    return pageRotations.get(currentPage) || 0;
  }, [pageRotations, currentPage]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
      if (e.key === 'Delete' && selectedElement) {
        deleteElement(selectedElement);
      }
      if (e.key === 'Escape') {
        setSelectedElement(null);
        setEditorMode("select");
        setShowShortcutsModal(false);
      }
      // R key to rotate current page
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        rotatePage();
      }
      // ? key to show keyboard shortcuts
      if (e.key === '?') {
        e.preventDefault();
        setShowShortcutsModal(true);
      }
      // Ctrl+S to save - opens save modal
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        setShowSaveModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, selectedElement, rotatePage]);

  // Handle PDF upload
  const handlePDFUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name.replace(".pdf", ""));
    const arrayBuffer = await file.arrayBuffer();
    const base64 = arrayBufferToBase64(new Uint8Array(arrayBuffer));
    setPdfBase64(base64);
    const pageSizes = await getPDFPageSizes(new Uint8Array(arrayBuffer));
    setPages(pageSizes);
    setElements([]);
    setDrawPaths(new Map());
    setStickyNotes([]);
    setPageRotations(new Map());
    setCurrentPage(0);
    setHistory([emptySnapshot]);
    setHistoryIndex(0);
    setCurrentSessionId(null);
    setCurrentSessionName("Untitled Session");
    setLastSaved(null);
  };

  // Add text element
  const addTextElement = () => {
    const el: PDFElement = {
      id: generateId(),
      type: "richtext",
      pageIndex: currentPage,
      x: 50,
      y: 50,
      width: 300,
      height: 100,
      content: "<p>Click to edit text...</p>",
    };
    const newElements = [...elements, el];
    setElements(newElements);
    saveToHistory(buildSnapshot(newElements));
    setSelectedElement(el.id);
    setEditorMode("select");
  };

  // Add image
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToBase64(file);
    const el: PDFElement = {
      id: generateId(),
      type: "image",
      pageIndex: currentPage,
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      content: dataUrl,
    };
    const newElements = [...elements, el];
    setElements(newElements);
    saveToHistory(buildSnapshot(newElements));
    setEditorMode("select");
  };

  // Add shape
  const addShape = (startX: number, startY: number, endX: number, endY: number) => {
    const x = Math.min(startX, endX);
    const y = Math.min(startY, endY);
    const width = Math.max(Math.abs(endX - startX), 20);
    const height = Math.max(Math.abs(endY - startY), 20);

    const el: PDFElement = {
      id: generateId(),
      type: "shape",
      pageIndex: currentPage,
      x, y, width, height,
      content: "",
      shapeStyle: { shapeType, strokeColor, fillColor, strokeWidth },
    };
    const newElements = [...elements, el];
    setElements(newElements);
    saveToHistory(buildSnapshot(newElements));
  };

  // Signature handlers
  const startDrawingSignature = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const drawSignature = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000";
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const clearSignatureCanvas = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "white";
    // Use logical dimensions (400x150) not physical pixels
    ctx.fillRect(0, 0, 400, 150);
  };

  const addSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const el: PDFElement = {
      id: generateId(),
      type: "signature",
      pageIndex: currentPage,
      x: 100,
      y: 100,
      width: 200,
      height: 80,
      content: dataUrl,
    };
    const newElements = [...elements, el];
    setElements(newElements);
    saveToHistory(buildSnapshot(newElements));
    setShowSignatureModal(false);
    clearSignatureCanvas();
  };

  // Delete element
  const deleteElement = (id: string) => {
    const newElements = elements.filter((el) => el.id !== id);
    setElements(newElements);
    saveToHistory(buildSnapshot(newElements));
    setSelectedElement(null);
  };

  // Update element
  const updateElement = (id: string, updates: Partial<PDFElement>) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el));
  };


  // Download PDF
  const downloadPDF = async () => {
    if (!pdfBase64) return;
    let pdfBytes = base64ToArrayBuffer(pdfBase64);

    // Apply page rotations if any
    if (pageRotations.size > 0) {
      pdfBytes = new Uint8Array(await rotatePDFPages(pdfBytes, pageRotations));
    }

    // Add elements (text, images, shapes)
    pdfBytes = new Uint8Array(await addElementsToPDF(pdfBytes, elements));

    // Add annotations (drawings and sticky notes)
    if (drawPaths.size > 0 || stickyNotes.length > 0) {
      // Convert to the expected format
      const pathsData = new Map<number, DrawPathData[]>();
      drawPaths.forEach((paths, pageIdx) => {
        pathsData.set(pageIdx, paths);
      });

      pdfBytes = new Uint8Array(await addAnnotationsToPDF(pdfBytes, pathsData, stickyNotes));
    }

    const buffer = new ArrayBuffer(pdfBytes.byteLength);
    new Uint8Array(buffer).set(pdfBytes);
    const blob = new Blob([buffer], { type: "application/pdf" });
    downloadBlob(blob, `${fileName}-edited.pdf`);
  };

  // Page management
  const addPage = async (size: PageSize = PAGE_SIZES.A4) => {
    if (!pdfBase64) return;
    const { PDFDocument } = await import("pdf-lib");
    const doc = await PDFDocument.load(base64ToArrayBuffer(pdfBase64));
    doc.addPage([size.width, size.height]);
    const newBase64 = arrayBufferToBase64(await doc.save());
    setPdfBase64(newBase64);
    setPages(p => [...p, size]);
    setCurrentPage(pages.length);
    saveToHistory(buildSnapshot([...elements]));
  };

  const deletePage = async () => {
    if (!pdfBase64 || pages.length <= 1) return;
    const { PDFDocument } = await import("pdf-lib");
    const doc = await PDFDocument.load(base64ToArrayBuffer(pdfBase64));
    doc.removePage(currentPage);
    const newBase64 = arrayBufferToBase64(await doc.save());
    const newElements = elements.filter(el => el.pageIndex !== currentPage).map(el => ({ ...el, pageIndex: el.pageIndex > currentPage ? el.pageIndex - 1 : el.pageIndex }));
    const newPages = pages.filter((_, i) => i !== currentPage);
    setElements(newElements);
    setPdfBase64(newBase64);
    setPages(newPages);
    setCurrentPage(Math.max(0, currentPage - 1));
    saveToHistory(buildSnapshot(newElements));
  };

  const deleteMultiplePages = async (pageIndices: Set<number>) => {
    if (!pdfBase64 || pageIndices.size === 0 || pageIndices.size >= pages.length) return;
    const { PDFDocument } = await import("pdf-lib");
    const doc = await PDFDocument.load(base64ToArrayBuffer(pdfBase64));
    const sorted = Array.from(pageIndices).sort((a, b) => b - a);
    for (const idx of sorted) {
      doc.removePage(idx);
    }
    const newBase64 = arrayBufferToBase64(await doc.save());
    const newElements = elements
      .filter(el => !pageIndices.has(el.pageIndex))
      .map(el => {
        const shiftBy = sorted.filter(idx => idx < el.pageIndex).length;
        return { ...el, pageIndex: el.pageIndex - shiftBy };
      });
    const newPages = pages.filter((_, i) => !pageIndices.has(i));
    setElements(newElements);
    setPdfBase64(newBase64);
    setPages(newPages);
    setCurrentPage(0);
    setSelectedPagesForDelete(new Set());
    setShowBulkDeleteModal(false);
    saveToHistory(buildSnapshot(newElements));
  };

  const resizePage = async (newSize: PageSize) => {
    if (!pdfBase64) return;
    const { PDFDocument } = await import("pdf-lib");
    const doc = await PDFDocument.load(base64ToArrayBuffer(pdfBase64));
    const page = doc.getPage(currentPage);
    page.setSize(newSize.width, newSize.height);
    const newBase64 = arrayBufferToBase64(await doc.save());
    setPdfBase64(newBase64);
    setPages(p => p.map((s, i) => i === currentPage ? newSize : s));
  };

  // Session management
  const saveSession = useCallback(async (name?: string) => {
    if (!pdfBase64 || isSaving) return;
    setIsSaving(true);
    try {
      const sessionId = currentSessionId || generateSessionId();
      const sessionName = name || currentSessionName;

      const sessionElements: SessionElement[] = elements.map(el => ({
        id: el.id, type: el.type as SessionElement['type'], pageIndex: el.pageIndex,
        x: el.x, y: el.y, width: el.width, height: el.height,
        shapeType: el.shapeStyle?.shapeType, strokeColor: el.shapeStyle?.strokeColor,
        fillColor: el.shapeStyle?.fillColor, strokeWidth: el.shapeStyle?.strokeWidth,
      }));

      await saveFullSession(
        {
          id: sessionId, name: sessionName, deviceId: getDeviceId(),
          pageCount: pages.length,
          pageDimensions: pages.map(p => ({ width: p.width, height: p.height })),
          elements: sessionElements,
        },
        {
          pdfBase64,
          images: elements.filter(el => el.type === 'image').map(el => ({ id: el.id, dataUrl: el.content })),
          signatures: elements.filter(el => el.type === 'signature').map(el => ({ id: el.id, dataUrl: el.content })),
          textContents: elements.filter(el => el.type === 'richtext' || el.type === 'text').map(el => ({ id: el.id, html: el.content })),
        }
      );

      setCurrentSessionId(sessionId);
      setCurrentSessionName(sessionName);
      setLastSaved(new Date());
    } catch (err) {
      console.error("Failed to save session:", err);
    } finally {
      setIsSaving(false);
    }
  }, [pdfBase64, elements, pages, currentSessionId, currentSessionName, isSaving]);

  const loadSession = useCallback(async (sessionId: string) => {
    try {
      const { metadata, content } = await loadFullSession(sessionId);
      if (!metadata || !content) return;

      setPdfBase64(content.pdfBase64);
      setCurrentSessionId(sessionId);
      setCurrentSessionName(metadata.name);

      const restoredPages: PageSize[] = metadata.pageDimensions.map((dim, idx) => ({
        width: dim.width, height: dim.height, name: `Page ${idx + 1}`,
      }));
      setPages(restoredPages);

      const restoredElements: PDFElement[] = metadata.elements.map(el => {
        const base: PDFElement = {
          id: el.id, type: el.type, pageIndex: el.pageIndex,
          x: el.x, y: el.y, width: el.width, height: el.height, content: '',
        };
        if (el.type === 'image') {
          const img = content.images.find(i => i.id === el.id);
          if (img) base.content = img.dataUrl;
        } else if (el.type === 'signature') {
          const sig = content.signatures.find(s => s.id === el.id);
          if (sig) base.content = sig.dataUrl;
        } else if (el.type === 'richtext' || el.type === 'text') {
          const txt = content.textContents.find(t => t.id === el.id);
          if (txt) base.content = txt.html;
        } else if (el.type === 'shape') {
          base.shapeStyle = {
            shapeType: el.shapeType || 'rectangle',
            strokeColor: el.strokeColor || '#000000',
            fillColor: el.fillColor || 'transparent',
            strokeWidth: el.strokeWidth || 2,
          };
        }
        return base;
      });
      setElements(restoredElements);
      setCurrentPage(0);
      setDrawPaths(new Map());
      setStickyNotes([]);
      setPageRotations(new Map());
      setHistory([{ elements: restoredElements, drawPaths: new Map(), stickyNotes: [], pageRotations: new Map() }]);
      setHistoryIndex(0);
      setLastSaved(metadata.lastModified);
      setShowSessionsModal(false);
    } catch (err) {
      console.error("Failed to load session:", err);
    }
  }, []);

  const loadSessions = useCallback(async () => {
    const sessions = await listSessionsForDevice(getDeviceId());
    setSavedSessions(sessions);
  }, []);

  const handleDeleteSession = useCallback(async (sessionId: string) => {
    await deleteFullSession(sessionId);
    setSavedSessions(prev => prev.filter(s => s.id !== sessionId));
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
      setCurrentSessionName("Untitled Session");
    }
  }, [currentSessionId]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!pdfBase64 || !currentSessionId) return;
    const interval = setInterval(() => {
      saveSession();
    }, 30000);
    return () => clearInterval(interval);
  }, [pdfBase64, currentSessionId, saveSession]);

  // Shape drawing handlers
  const handleShapeDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (editorMode !== "shape") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoomLevel;
    const y = (e.clientY - rect.top) / zoomLevel;
    setShapeStart({ x, y });
    setShapePreview({ x, y, width: 0, height: 0 });
    setIsDrawingShape(true);
  };

  const handleShapeMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawingShape || editorMode !== "shape") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const currentX = (e.clientX - rect.left) / zoomLevel;
    const currentY = (e.clientY - rect.top) / zoomLevel;
    setShapePreview({
      x: Math.min(shapeStart.x, currentX),
      y: Math.min(shapeStart.y, currentY),
      width: Math.abs(currentX - shapeStart.x),
      height: Math.abs(currentY - shapeStart.y),
    });
  };

  const handleShapeUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawingShape || editorMode !== "shape") return;
    const rect = e.currentTarget.getBoundingClientRect();
    addShape(shapeStart.x, shapeStart.y, (e.clientX - rect.left) / zoomLevel, (e.clientY - rect.top) / zoomLevel);
    setIsDrawingShape(false);
    setShapePreview(null);
  };

  // Drawing/Annotation handlers
  const handleDrawStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (editorMode !== "draw" && editorMode !== "highlight") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoomLevel;
    const y = (e.clientY - rect.top) / zoomLevel;
    setCurrentPath({
      points: [{ x, y }],
      color: editorMode === "highlight" ? highlightColor : drawColor,
      width: editorMode === "highlight" ? 20 : drawWidth,
      isHighlight: editorMode === "highlight",
    });
    setIsDrawingPath(true);
  };

  const handleDrawMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawingPath || !currentPath) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoomLevel;
    const y = (e.clientY - rect.top) / zoomLevel;
    setCurrentPath(prev => prev ? { ...prev, points: [...prev.points, { x, y }] } : null);
  };

  const handleDrawEnd = () => {
    if (!isDrawingPath || !currentPath) return;
    const newPaths = new Map(drawPaths);
    const pagePaths = newPaths.get(currentPage) || [];
    newPaths.set(currentPage, [...pagePaths, currentPath]);
    setDrawPaths(newPaths);
    setCurrentPath(null);
    setIsDrawingPath(false);
    saveToHistory(buildSnapshot(undefined, newPaths));
  };

  // Add sticky note
  const addStickyNote = (e: React.MouseEvent<HTMLDivElement>) => {
    if (editorMode !== "note") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoomLevel;
    const y = (e.clientY - rect.top) / zoomLevel;
    const note: StickyNote = {
      id: generateId(),
      pageIndex: currentPage,
      x, y,
      text: "",
      color: "#fef08a",
    };
    const newNotes = [...stickyNotes, note];
    setStickyNotes(newNotes);
    setEditingNoteId(note.id);
    setEditorMode("select");
    saveToHistory(buildSnapshot(undefined, undefined, newNotes));
  };

  // Add checkbox
  const addCheckbox = (e: React.MouseEvent<HTMLDivElement>) => {
    if (editorMode !== "checkbox") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoomLevel;
    const y = (e.clientY - rect.top) / zoomLevel;
    const el: PDFElement = {
      id: generateId(),
      type: "checkbox",
      pageIndex: currentPage,
      x, y,
      width: 20,
      height: 20,
      content: "", // empty = unchecked, "checked" = checked
      fontSize: 16,
    };
    const newElements = [...elements, el];
    setElements(newElements);
    saveToHistory(buildSnapshot(newElements));
  };

  // Toggle checkbox
  const toggleCheckbox = (id: string) => {
    const el = elements.find(e => e.id === id);
    if (el?.type === "checkbox") {
      const newContent = el.content === "checked" ? "" : "checked";
      const newElements = elements.map(e => e.id === id ? { ...e, content: newContent } : e);
      setElements(newElements);
      saveToHistory(buildSnapshot(newElements));
    }
  };

  // Clear all drawings on current page
  const clearDrawings = () => {
    const newPaths = new Map(drawPaths);
    newPaths.delete(currentPage);
    setDrawPaths(newPaths);
    saveToHistory(buildSnapshot(undefined, newPaths));
  };

  // Delete sticky note
  const deleteStickyNote = (id: string) => {
    const newNotes = stickyNotes.filter(n => n.id !== id);
    setStickyNotes(newNotes);
    setEditingNoteId(null);
    saveToHistory(buildSnapshot(undefined, undefined, newNotes));
  };

  // Update sticky note text
  const updateNoteText = (id: string, text: string) => {
    const newNotes = stickyNotes.map(n => n.id === id ? { ...n, text } : n);
    setStickyNotes(newNotes);
    saveToHistory(buildSnapshot(undefined, undefined, newNotes));
  };

  // Render PDF
  // Render PDF
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const rotation = getCurrentPageRotation();
  useEffect(() => {
    if (!pdfBase64 || !canvasRef.current) return;
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
      renderTaskRef.current = null;
    }
    const renderPage = async () => {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.4.530/build/pdf.worker.min.mjs`;
      const pdfBytes = base64ToArrayBuffer(pdfBase64);
      const pdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
      const page = await pdf.getPage(currentPage + 1);
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d")!;
      const dpr = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: 1, rotation });
      canvas.width = viewport.width * dpr;
      canvas.height = viewport.height * dpr;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      ctx.scale(dpr, dpr);
      const task = page.render({ canvasContext: ctx, viewport, canvas });
      renderTaskRef.current = task;
      try {
        await task.promise;
      } catch (e: unknown) {
        if (e instanceof Error && e.message === 'Rendering cancelled') return;
        throw e;
      }
    };
    renderPage();
  }, [pdfBase64, currentPage, rotation]);

  // Initialize signature canvas
  useEffect(() => {
    if (showSignatureModal && signatureCanvasRef.current) {
      const canvas = signatureCanvasRef.current;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = 400 * dpr;
      canvas.height = 150 * dpr;
      canvas.style.width = "400px";
      canvas.style.height = "150px";
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, 400, 150);
      }
    }
  }, [showSignatureModal]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClick = () => {
      setShowFontMenu(false);
      setShowSizeMenu(false);
      setShowColorMenu(false);
      setShowHighlightMenu(false);
      setShowStrokeMenu(false);
      setShowFillMenu(false);
      setShowDrawColorMenu(false);
      setShowLineSpacingMenu(false);
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  // Document mode functions
  const getPageDocumentId = (pageIndex: number) => PAGE_DOCUMENT_PREFIX + pageIndex;

  const getPageDocument = (pageIndex: number): PDFElement | undefined => {
    return elements.find(el => el.id === getPageDocumentId(pageIndex));
  };

  const ensurePageDocument = (pageIndex: number): PDFElement => {
    const existing = getPageDocument(pageIndex);
    if (existing) return existing;

    const pageWidth = pages[pageIndex]?.width || 595;
    const pageHeight = pages[pageIndex]?.height || 842;
    const margin = 50;

    const el: PDFElement = {
      id: getPageDocumentId(pageIndex),
      type: "richtext",
      pageIndex,
      x: margin,
      y: margin,
      width: pageWidth - (margin * 2),
      height: pageHeight - (margin * 2),
      content: "<p></p>",
      isFlowText: true,
    };
    const newElements = [...elements, el];
    setElements(newElements);
    saveToHistory(buildSnapshot(newElements));
    return el;
  };

  // Editor commands for rich text
  const editorCommands = {
    bold: () => activeEditorRef.current?.toggleBold(),
    italic: () => activeEditorRef.current?.toggleItalic(),
    underline: () => activeEditorRef.current?.toggleUnderline(),
    align: (align: "left" | "center" | "right" | "justify") => activeEditorRef.current?.setAlign(align),
    bulletList: () => activeEditorRef.current?.toggleBulletList(),
    orderedList: () => activeEditorRef.current?.toggleOrderedList(),
    heading: (level: 1 | 2 | 3) => activeEditorRef.current?.setHeading(level),
    table: (rows: number, cols: number) => activeEditorRef.current?.insertTable(rows, cols),
    setFont: (font: string) => { activeEditorRef.current?.setFontFamily(font); setCurrentFont(font.split(",")[0]); },
    setSize: (size: number) => { activeEditorRef.current?.setFontSize(`${size}px`); setCurrentSize(size); },
    setColor: (color: string) => { activeEditorRef.current?.setColor(color); setCurrentColor(color); },
    setHighlight: (color: string) => { activeEditorRef.current?.toggleHighlight(color); setCurrentHighlight(color); },
    setLineSpacing: (spacing: string) => activeEditorRef.current?.setLineSpacing(spacing),
  };

  // Render shape preview
  const renderShapePreview = () => {
    if (!shapePreview || !isDrawingShape) return null;
    const style: React.CSSProperties = {
      position: "absolute",
      left: shapePreview.x * zoomLevel,
      top: shapePreview.y * zoomLevel,
      width: shapePreview.width * zoomLevel,
      height: shapePreview.height * zoomLevel,
      pointerEvents: "none",
    };
    if (shapeType === "rectangle") {
      return <div style={{ ...style, border: `${strokeWidth}px solid ${strokeColor}`, backgroundColor: fillColor === "transparent" ? "transparent" : fillColor }} />;
    }
    if (shapeType === "circle") {
      return <div style={{ ...style, border: `${strokeWidth}px solid ${strokeColor}`, backgroundColor: fillColor === "transparent" ? "transparent" : fillColor, borderRadius: "50%" }} />;
    }
    if (shapeType === "triangle") {
      return (
        <svg style={style} viewBox={`0 0 ${shapePreview.width} ${shapePreview.height}`}>
          <polygon points={`${shapePreview.width / 2},0 ${shapePreview.width},${shapePreview.height} 0,${shapePreview.height}`} fill={fillColor === "transparent" ? "none" : fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
        </svg>
      );
    }
    if (shapeType === "line" || shapeType === "arrow") {
      return (
        <svg style={style} viewBox={`0 0 ${shapePreview.width || 1} ${shapePreview.height || 1}`}>
          <defs><marker id="arrowhead-preview" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill={strokeColor} /></marker></defs>
          <line x1="0" y1={shapePreview.height} x2={shapePreview.width} y2="0" stroke={strokeColor} strokeWidth={strokeWidth} markerEnd={shapeType === "arrow" ? "url(#arrowhead-preview)" : undefined} />
        </svg>
      );
    }
    return null;
  };

  // Create blank PDF
  const createBlank = async (size: PageSize = PAGE_SIZES.A4) => {
    const bytes = await createBlankPDF([size]);
    setPdfBase64(arrayBufferToBase64(bytes));
    setPages([size]);
    setElements([]);
    setCurrentPage(0);
    setDrawPaths(new Map());
    setStickyNotes([]);
    setPageRotations(new Map());
    setHistory([emptySnapshot]);
    setHistoryIndex(0);
    setFileName("untitled");
  };

  // Upload screen
  if (!pdfBase64) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <Link href="/" className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 w-fit">
              <ArrowLeft className="w-4 h-4" />Back to Tools
            </Link>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-16">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">Edit PDF</h1>
            <p className="text-zinc-600 dark:text-zinc-400">Add text, images, shapes, and signatures to your PDF</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <label className="cursor-pointer">
              <div className="p-8 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 hover:border-orange-500 text-left group h-full transition-all">
                <div className="w-14 h-14 bg-orange-100 dark:bg-orange-900/50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="w-7 h-7 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Upload PDF</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">Edit an existing document from your device</p>
                <span className="text-sm font-medium text-orange-600">Choose file</span>
              </div>
              <input type="file" accept=".pdf" className="hidden" onChange={handlePDFUpload} />
            </label>

            <button onClick={() => createBlank()} className="p-8 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 hover:border-amber-500 text-left group h-full transition-all">
              <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FilePlus className="w-7 h-7 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Create Blank</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">Start with a fresh A4 document</p>
              <span className="text-sm font-medium text-amber-600">Create new</span>
            </button>
          </div>

          <div className="mb-8">
            <button
              onClick={async () => { await loadSessions(); setShowSessionsModal(true); }}
              className="w-full p-6 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 text-left group flex items-center gap-4 transition-all"
            >
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <FolderOpen className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-1">My Sessions</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Continue working on saved sessions</p>
              </div>
            </button>
          </div>
        </main>

        {/* Sessions Modal (on upload screen) */}
        {showSessionsModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-md max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Saved Sessions</h3>
                <button onClick={() => setShowSessionsModal(false)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2">
                {savedSessions.length === 0 ? (
                  <p className="text-center text-zinc-500 py-8">No saved sessions</p>
                ) : (
                  savedSessions.map(session => (
                    <div key={session.id} className="flex items-center justify-between p-3 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800">
                      <button onClick={() => loadSession(session.id)} className="flex-1 text-left">
                        <p className="font-medium text-sm">{session.name}</p>
                        <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {session.lastModified.toLocaleDateString()} {session.lastModified.toLocaleTimeString()}
                          <span className="mx-1">·</span>
                          {session.pageCount} page{session.pageCount !== 1 ? 's' : ''}
                        </p>
                      </button>
                      <button onClick={() => handleDeleteSession(session.id)} className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-500 rounded"><Trash className="w-4 h-4" /></button>
                    </div>
                  ))
                )}
              </div>
              <button onClick={() => setShowSessionsModal(false)} className="w-full mt-4 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-medium">Close</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const currentPageElements = elements.filter(el => el.pageIndex === currentPage);
  const selectedEl = elements.find(e => e.id === selectedElement);

  return (
    <div className="h-screen flex flex-col bg-zinc-100 dark:bg-zinc-950 overflow-hidden">
      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
              <ArrowLeft className="w-4 h-4" /><span className="hidden sm:inline">Exit</span>
            </Link>
            <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800" />
            <span className="text-sm font-medium truncate max-w-[150px]">{fileName}.pdf</span>
            {/* Page Navigation */}
            <div className="flex items-center gap-1 ml-2">
              <button onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-sm px-2">{currentPage + 1} / {pages.length}</span>
              <button onClick={() => setCurrentPage(p => Math.min(pages.length - 1, p + 1))} disabled={currentPage === pages.length - 1} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
              <button onClick={() => setShowPageSizeModal(true)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded" title="Add Page"><FilePlus className="w-4 h-4" /></button>
              <button onClick={() => setShowResizePageModal(true)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded" title="Resize Page"><Scaling className="w-4 h-4" /></button>
              <div className="relative">
                <button
                  onClick={() => setShowDeleteMenu(prev => !prev)}
                  disabled={pages.length <= 1}
                  className="p-1 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-500 rounded disabled:opacity-40 flex items-center gap-0.5"
                  title="Delete Page"
                >
                  <FileX className="w-4 h-4" />
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showDeleteMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowDeleteMenu(false)} />
                    <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg z-50 min-w-[200px]">
                      <button
                        onClick={() => { deletePage(); setShowDeleteMenu(false); }}
                        className="w-full text-left px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 rounded-t-lg flex items-center gap-2 transition-colors"
                      >
                        <FileX className="w-4 h-4" />
                        Delete Current Page
                      </button>
                      <button
                        onClick={() => { setSelectedPagesForDelete(new Set()); setShowBulkDeleteModal(true); setShowDeleteMenu(false); }}
                        className="w-full text-left px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 rounded-b-lg flex items-center gap-2 border-t border-zinc-100 dark:border-zinc-700 transition-colors"
                      >
                        <Trash className="w-4 h-4" />
                        Select &amp; Delete Multiple...
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
            {/* Zoom */}
            <div className="flex items-center gap-1 border-l border-zinc-200 dark:border-zinc-700 pl-2 ml-2">
              <button onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded"><ZoomOut className="w-4 h-4" /></button>
              <span className="text-xs w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
              <button onClick={() => setZoomLevel(z => Math.min(2.0, z + 0.1))} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded"><ZoomIn className="w-4 h-4" /></button>
            </div>
            {/* Rotate */}
            <div className="flex items-center gap-1 border-l border-zinc-200 dark:border-zinc-700 pl-2 ml-2">
              <button
                onClick={rotatePage}
                className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded flex items-center gap-1"
                title="Rotate page (R)"
              >
                <RotateCw className="w-4 h-4" />
                {getCurrentPageRotation() !== 0 && (
                  <span className="text-xs">{getCurrentPageRotation()}°</span>
                )}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {lastSaved && (
              <span className="text-xs text-zinc-400 hidden sm:inline">
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={() => {
                if (currentSessionId) { saveSession(); }
                else { setSessionNameInput(fileName); setShowSaveModal(true); }
              }}
              disabled={isSaving}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
              title="Save Session (Ctrl+S)"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            </button>
            <button onClick={async () => { await loadSessions(); setShowSessionsModal(true); }} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg" title="Load Session">
              <FolderOpen className="w-5 h-5" />
            </button>
            <button onClick={() => setShowShortcutsModal(true)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg" title="Keyboard Shortcuts (?)">
              <Keyboard className="w-5 h-5" />
            </button>
            <button onClick={downloadPDF} className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium">
              <Download className="w-4 h-4" /><span className="hidden sm:inline">Download</span>
            </button>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2 py-1.5 flex items-center gap-1 overflow-x-auto shrink-0">
        {/* Mode Selection */}
        <div className="flex items-center border-r border-zinc-200 dark:border-zinc-600 pr-2 mr-1">
          <button onClick={() => setEditorMode("select")} className={`p-2 rounded ${editorMode === "select" ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600" : "hover:bg-zinc-100 dark:hover:bg-zinc-700"}`} title="Select"><MousePointer2 className="w-4 h-4" /></button>
          <button onClick={() => { setEditorMode("document"); ensurePageDocument(currentPage); setSelectedElement(null); }} className={`p-2 rounded ${editorMode === "document" ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600" : "hover:bg-zinc-100 dark:hover:bg-zinc-700"}`} title="Document Mode - Type on Page"><Type className="w-4 h-4" /></button>
        </div>

        {/* Shapes */}
        <div className="flex items-center border-r border-zinc-200 dark:border-zinc-600 pr-2 mr-1 gap-0.5">
          <button onClick={() => { setEditorMode("shape"); setShapeType("rectangle"); }} className={`p-2 rounded ${editorMode === "shape" && shapeType === "rectangle" ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600" : "hover:bg-zinc-100 dark:hover:bg-zinc-700"}`} title="Rectangle"><Square className="w-4 h-4" /></button>
          <button onClick={() => { setEditorMode("shape"); setShapeType("circle"); }} className={`p-2 rounded ${editorMode === "shape" && shapeType === "circle" ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600" : "hover:bg-zinc-100 dark:hover:bg-zinc-700"}`} title="Circle"><Circle className="w-4 h-4" /></button>
          <button onClick={() => { setEditorMode("shape"); setShapeType("triangle"); }} className={`p-2 rounded ${editorMode === "shape" && shapeType === "triangle" ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600" : "hover:bg-zinc-100 dark:hover:bg-zinc-700"}`} title="Triangle"><Triangle className="w-4 h-4" /></button>
          <button onClick={() => { setEditorMode("shape"); setShapeType("line"); }} className={`p-2 rounded ${editorMode === "shape" && shapeType === "line" ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600" : "hover:bg-zinc-100 dark:hover:bg-zinc-700"}`} title="Line"><Minus className="w-4 h-4" /></button>
          <button onClick={() => { setEditorMode("shape"); setShapeType("arrow"); }} className={`p-2 rounded ${editorMode === "shape" && shapeType === "arrow" ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600" : "hover:bg-zinc-100 dark:hover:bg-zinc-700"}`} title="Arrow"><ArrowRight className="w-4 h-4" /></button>
        </div>

        {/* Undo/Redo */}
        <div className="flex items-center border-r border-zinc-200 dark:border-zinc-600 pr-2 mr-1">
          <button onClick={undo} disabled={historyIndex <= 0} className={`p-2 rounded ${historyIndex <= 0 ? "opacity-40" : "hover:bg-zinc-100 dark:hover:bg-zinc-700"}`} title="Undo"><Undo className="w-4 h-4" /></button>
          <button onClick={redo} disabled={historyIndex >= history.length - 1} className={`p-2 rounded ${historyIndex >= history.length - 1 ? "opacity-40" : "hover:bg-zinc-100 dark:hover:bg-zinc-700"}`} title="Redo"><Redo className="w-4 h-4" /></button>
        </div>

        {/* Annotations */}
        <div className="flex items-center border-r border-zinc-200 dark:border-zinc-600 pr-2 mr-1 gap-0.5">
          <button onClick={() => setEditorMode("draw")} className={`p-2 rounded ${editorMode === "draw" ? "bg-red-100 dark:bg-red-900/50 text-red-600" : "hover:bg-zinc-100 dark:hover:bg-zinc-700"}`} title="Freehand Draw"><Pencil className="w-4 h-4" /></button>
          <button onClick={() => setEditorMode("highlight")} className={`p-2 rounded ${editorMode === "highlight" ? "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-600" : "hover:bg-zinc-100 dark:hover:bg-zinc-700"}`} title="Highlight"><Highlighter className="w-4 h-4" /></button>
          <button onClick={() => setEditorMode("note")} className={`p-2 rounded ${editorMode === "note" ? "bg-amber-100 dark:bg-amber-900/50 text-amber-600" : "hover:bg-zinc-100 dark:hover:bg-zinc-700"}`} title="Sticky Note"><StickyNote className="w-4 h-4" /></button>
          <button onClick={() => setEditorMode("checkbox")} className={`p-2 rounded ${editorMode === "checkbox" ? "bg-green-100 dark:bg-green-900/50 text-green-600" : "hover:bg-zinc-100 dark:hover:bg-zinc-700"}`} title="Checkbox"><CheckSquare className="w-4 h-4" /></button>
          {(drawPaths.get(currentPage)?.length ?? 0) > 0 && (
            <button onClick={clearDrawings} className="p-2 rounded hover:bg-red-100 text-red-500" title="Clear Drawings"><Eraser className="w-4 h-4" /></button>
          )}
        </div>

        {/* Draw Color - Show when drawing */}
        {editorMode === "draw" && (
          <div className="relative border-r border-zinc-200 dark:border-zinc-600 pr-2 mr-1" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowDrawColorMenu(!showDrawColorMenu)} className="flex items-center gap-1 px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-sm">
              <span>Color</span>
              <div className="w-4 h-4 rounded border border-zinc-400" style={{ backgroundColor: drawColor }} />
            </button>
            {showDrawColorMenu && (
              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg p-2 z-50">
                <div className="grid grid-cols-5 gap-1">
                  {SHAPE_COLORS.map(c => (
                    <button key={c} onClick={() => { setDrawColor(c); setShowDrawColorMenu(false); }} className="w-6 h-6 rounded border border-zinc-300 hover:scale-110 transition-transform" style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Draw Width - Show when drawing */}
        {editorMode === "draw" && (
          <div className="flex items-center gap-1 border-r border-zinc-200 dark:border-zinc-600 pr-2 mr-1">
            <span className="text-xs text-zinc-500">Width:</span>
            <input type="range" min="1" max="10" value={drawWidth} onChange={(e) => setDrawWidth(Number(e.target.value))} className="w-16" />
            <span className="text-xs w-4">{drawWidth}</span>
          </div>
        )}

        {/* Text Formatting - Show when richtext is selected or in document mode */}
        {(editorMode === "document" || selectedEl?.type === "richtext") && (
          <>
            {/* Font Family */}
            <div className="relative border-r border-zinc-200 dark:border-zinc-600 pr-2 mr-1" onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowFontMenu(!showFontMenu)} className="flex items-center gap-1 px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-sm min-w-[100px]">
                <span className="truncate">{currentFont}</span><ChevronDown className="w-3 h-3" />
              </button>
              {showFontMenu && (
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg py-1 z-50 max-h-64 overflow-y-auto min-w-[160px]">
                  {FONT_FAMILIES.map(f => (
                    <button key={f.name} onClick={() => { editorCommands.setFont(f.value); setShowFontMenu(false); }} className="w-full px-3 py-1.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 text-sm" style={{ fontFamily: f.value }}>{f.name}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Font Size */}
            <div className="relative border-r border-zinc-200 dark:border-zinc-600 pr-2 mr-1" onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowSizeMenu(!showSizeMenu)} className="flex items-center gap-1 px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-sm min-w-[50px]">
                <span>{currentSize}</span><ChevronDown className="w-3 h-3" />
              </button>
              {showSizeMenu && (
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg py-1 z-50 max-h-64 overflow-y-auto">
                  {FONT_SIZES.map(s => (
                    <button key={s} onClick={() => { editorCommands.setSize(s); setShowSizeMenu(false); }} className="w-full px-3 py-1 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 text-sm">{s}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Text Color */}
            <div className="relative border-r border-zinc-200 dark:border-zinc-600 pr-2 mr-1" onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowColorMenu(!showColorMenu)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded flex items-center gap-1" title="Text Color">
                <Palette className="w-4 h-4" />
                <div className="w-3 h-3 rounded-sm border border-zinc-300" style={{ backgroundColor: currentColor }} />
              </button>
              {showColorMenu && (
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg p-2 z-50">
                  <div className="grid grid-cols-10 gap-1 w-[220px]">
                    {TEXT_COLORS.map(c => (
                      <button key={c} onClick={() => { editorCommands.setColor(c); setShowColorMenu(false); }} className="w-5 h-5 rounded border border-zinc-300 hover:scale-110 transition-transform" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Highlight */}
            <div className="relative border-r border-zinc-200 dark:border-zinc-600 pr-2 mr-1" onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowHighlightMenu(!showHighlightMenu)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded flex items-center gap-1" title="Highlight">
                <Highlighter className="w-4 h-4" />
                <div className="w-3 h-3 rounded-sm border border-zinc-300" style={{ backgroundColor: currentHighlight === "transparent" ? "#fff" : currentHighlight }} />
              </button>
              {showHighlightMenu && (
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg p-2 z-50">
                  <div className="grid grid-cols-6 gap-1">
                    <button onClick={() => { editorCommands.setHighlight("transparent"); setShowHighlightMenu(false); }} className="w-5 h-5 rounded border border-zinc-300 bg-white flex items-center justify-center text-xs">x</button>
                    {HIGHLIGHT_COLORS.map(c => (
                      <button key={c} onClick={() => { editorCommands.setHighlight(c); setShowHighlightMenu(false); }} className="w-5 h-5 rounded border border-zinc-300 hover:scale-110 transition-transform" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bold, Italic, Underline */}
            <div className="flex items-center border-r border-zinc-200 dark:border-zinc-600 pr-2 mr-1">
              <button onClick={editorCommands.bold} className={`p-2 rounded ${isBold ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600" : "hover:bg-zinc-100 dark:hover:bg-zinc-700"}`}><Bold className="w-4 h-4" /></button>
              <button onClick={editorCommands.italic} className={`p-2 rounded ${isItalic ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600" : "hover:bg-zinc-100 dark:hover:bg-zinc-700"}`}><Italic className="w-4 h-4" /></button>
              <button onClick={editorCommands.underline} className={`p-2 rounded ${isUnderline ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600" : "hover:bg-zinc-100 dark:hover:bg-zinc-700"}`}><Underline className="w-4 h-4" /></button>
            </div>

            {/* Alignment */}
            <div className="flex items-center border-r border-zinc-200 dark:border-zinc-600 pr-2 mr-1">
              <button onClick={() => editorCommands.align("left")} className="p-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700"><AlignLeft className="w-4 h-4" /></button>
              <button onClick={() => editorCommands.align("center")} className="p-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700"><AlignCenter className="w-4 h-4" /></button>
              <button onClick={() => editorCommands.align("right")} className="p-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700"><AlignRight className="w-4 h-4" /></button>
              <button onClick={() => editorCommands.align("justify")} className="p-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700"><AlignJustify className="w-4 h-4" /></button>
            </div>

            {/* Lists & Headings */}
            <div className="flex items-center border-r border-zinc-200 dark:border-zinc-600 pr-2 mr-1">
              <button onClick={editorCommands.bulletList} className="p-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700"><List className="w-4 h-4" /></button>
              <button onClick={editorCommands.orderedList} className="p-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700"><ListOrdered className="w-4 h-4" /></button>
              <button onClick={() => editorCommands.heading(1)} className="p-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700"><Heading1 className="w-4 h-4" /></button>
              <button onClick={() => editorCommands.heading(2)} className="p-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700"><Heading2 className="w-4 h-4" /></button>
              <button onClick={() => setShowTableModal(true)} className="p-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700"><TableIcon className="w-4 h-4" /></button>
            </div>

            {/* Line Spacing */}
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowLineSpacingMenu(!showLineSpacingMenu)} className="flex items-center gap-1 px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-xs" title="Line Spacing">
                <span>Spacing</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {showLineSpacingMenu && (
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg py-1 z-50">
                  {LINE_SPACINGS.map(ls => (
                    <button key={ls.value} onClick={() => { editorCommands.setLineSpacing(ls.value); setShowLineSpacingMenu(false); }} className="w-full px-3 py-1.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 text-sm">{ls.name}</button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Shape Colors - Show when in shape mode */}
        {editorMode === "shape" && (
          <>
            <div className="relative border-r border-zinc-200 dark:border-zinc-600 pr-2 mr-1" onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowStrokeMenu(!showStrokeMenu)} className="flex items-center gap-1 px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-sm">
                <span>Stroke</span>
                <div className="w-4 h-4 rounded border border-zinc-400" style={{ backgroundColor: strokeColor }} />
              </button>
              {showStrokeMenu && (
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg p-2 z-50">
                  <div className="grid grid-cols-5 gap-1">
                    {SHAPE_COLORS.map(c => (
                      <button key={c} onClick={() => { setStrokeColor(c); setShowStrokeMenu(false); }} className="w-6 h-6 rounded border border-zinc-300 hover:scale-110 transition-transform" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="relative border-r border-zinc-200 dark:border-zinc-600 pr-2 mr-1" onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowFillMenu(!showFillMenu)} className="flex items-center gap-1 px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-sm">
                <span>Fill</span>
                <div className="w-4 h-4 rounded border border-zinc-400" style={{ backgroundColor: fillColor === "transparent" ? "white" : fillColor, backgroundImage: fillColor === "transparent" ? "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)" : "none", backgroundSize: "8px 8px", backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px" }} />
              </button>
              {showFillMenu && (
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg p-2 z-50">
                  <div className="grid grid-cols-5 gap-1">
                    <button onClick={() => { setFillColor("transparent"); setShowFillMenu(false); }} className="w-6 h-6 rounded border border-zinc-300 bg-white flex items-center justify-center text-xs hover:scale-110 transition-transform" style={{ backgroundImage: "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)", backgroundSize: "8px 8px" }}>x</button>
                    {SHAPE_COLORS.map(c => (
                      <button key={c} onClick={() => { setFillColor(c); setShowFillMenu(false); }} className="w-6 h-6 rounded border border-zinc-300 hover:scale-110 transition-transform" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 border-r border-zinc-200 dark:border-zinc-600 pr-2 mr-1">
              <span className="text-xs text-zinc-500">Width:</span>
              <input type="range" min="1" max="10" value={strokeWidth} onChange={(e) => setStrokeWidth(Number(e.target.value))} className="w-16" />
              <span className="text-xs w-4">{strokeWidth}</span>
            </div>
          </>
        )}

        {/* Tools */}
        <div className="flex items-center gap-1 ml-auto">
          <button onClick={addTextElement} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded" title="Add Text"><Type className="w-4 h-4" /></button>
          <button onClick={() => imageInputRef.current?.click()} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded" title="Add Image"><ImageIcon className="w-4 h-4" /></button>
          <button onClick={() => setShowSignatureModal(true)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded" title="Add Signature"><PenLine className="w-4 h-4" /></button>
          {selectedElement && <button onClick={() => deleteElement(selectedElement)} className="p-2 hover:bg-red-100 text-red-500 rounded" title="Delete"><Trash2 className="w-4 h-4" /></button>}
        </div>
      </div>
      <input type="file" ref={imageInputRef} accept="image/*" className="hidden" onChange={handleImageUpload} />

      {/* Canvas Area */}
      <div className="flex-1 overflow-auto p-4 bg-zinc-200 dark:bg-zinc-950 flex justify-center items-start">
        <div
          className="relative bg-white shadow-lg transition-transform origin-center"
          style={{
            width: rotation === 90 || rotation === 270
              ? pages[currentPage]?.height || 842
              : pages[currentPage]?.width || 595,
            height: rotation === 90 || rotation === 270
              ? pages[currentPage]?.width || 595
              : pages[currentPage]?.height || 842,
            transform: `scale(${zoomLevel})`,
          }}
          onMouseDown={(e) => { handleShapeDown(e); handleDrawStart(e); }}
          onMouseMove={(e) => { handleShapeMove(e); handleDrawMove(e); }}
          onMouseUp={(e) => { handleShapeUp(e); handleDrawEnd(); }}
          onMouseLeave={handleDrawEnd}
          onClick={(e) => {
            if (editorMode === "select") setSelectedElement(null);
            if (editorMode === "select" || editorMode === "document") {
              ensurePageDocument(currentPage);
              setEditorMode("document");
            }
            addStickyNote(e); addCheckbox(e);
          }}
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            style={{ pointerEvents: "none" }}
          />

          {/* Shape Preview */}
          {renderShapePreview()}

          {/* Drawing Layer */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
            {/* Saved paths */}
            {(drawPaths.get(currentPage) || []).map((path, idx) => (
              <path
                key={idx}
                d={path.points.reduce((acc, p, i) =>
                  i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, ""
                )}
                stroke={path.color}
                strokeWidth={path.width}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={path.isHighlight ? 0.4 : 1}
              />
            ))}
            {/* Current path being drawn */}
            {currentPath && (
              <path
                d={currentPath.points.reduce((acc, p, i) =>
                  i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, ""
                )}
                stroke={currentPath.color}
                strokeWidth={currentPath.width}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={currentPath.isHighlight ? 0.4 : 1}
              />
            )}
          </svg>

          {/* Sticky Notes */}
          {stickyNotes.filter(n => n.pageIndex === currentPage).map(note => (
            <div
              key={note.id}
              className="absolute cursor-move"
              style={{
                left: note.x,
                top: note.y,
                width: 150,
                minHeight: 100,
                backgroundColor: note.color,
                borderRadius: 4,
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                zIndex: 10,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-2 py-1 border-b border-black/10">
                <span className="text-xs font-medium text-black/60">Note</span>
                <button
                  onClick={() => deleteStickyNote(note.id)}
                  className="text-black/40 hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <textarea
                value={note.text}
                onChange={(e) => updateNoteText(note.id, e.target.value)}
                placeholder="Add a note..."
                className="w-full p-2 bg-transparent resize-none text-sm text-black focus:outline-none"
                style={{ minHeight: 70 }}
                autoFocus={editingNoteId === note.id}
              />
            </div>
          ))}

          {/* Render Elements */}
          {currentPageElements.map((el) => {
            const isSelected = selectedElement === el.id;
            const isPageDocument = el.id === getPageDocumentId(currentPage);

            // Page document in document mode - full page editable
            if (el.type === "richtext" && isPageDocument && editorMode === "document") {
              return (
                <div
                  key={el.id}
                  className="absolute z-20"
                  style={{ left: el.x, top: el.y, width: el.width, height: el.height }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <RichTextEditor
                    ref={(ref) => {
                      if (ref) {
                        editorRefs.current.set(el.id, ref);
                        activeEditorRef.current = ref;
                      }
                    }}
                    content={el.content}
                    onChange={(html) => updateElement(el.id, { content: html })}
                  />
                </div>
              );
            }

            // Page document when not in document mode - show as static content
            if (el.type === "richtext" && isPageDocument) {
              return (
                <div
                  key={el.id}
                  className="absolute cursor-pointer hover:ring-1 hover:ring-indigo-300 overflow-hidden"
                  style={{ left: el.x, top: el.y, width: el.width, height: el.height }}
                  onClick={(e) => { e.stopPropagation(); setEditorMode("document"); }}
                >
                  <div className="ProseMirror h-full" dangerouslySetInnerHTML={{ __html: el.content }} />
                </div>
              );
            }

            // Regular elements - draggable/resizable
            return (
              <Rnd
                key={el.id}
                size={{ width: el.width, height: el.height }}
                position={{ x: el.x, y: el.y }}
                onDragStop={(e, d) => { updateElement(el.id, { x: d.x, y: d.y }); saveToHistory(buildSnapshot(elements.map(e => e.id === el.id ? { ...e, x: d.x, y: d.y } : e))); }}
                onResizeStop={(e, dir, ref, delta, pos) => {
                  const newWidth = parseFloat(ref.style.width);
                  const newHeight = parseFloat(ref.style.height);
                  updateElement(el.id, { width: newWidth, height: newHeight, x: pos.x, y: pos.y });
                  saveToHistory(buildSnapshot(elements.map(e => e.id === el.id ? { ...e, width: newWidth, height: newHeight, x: pos.x, y: pos.y } : e)));
                }}
                bounds="parent"
                className={`${isSelected ? "ring-2 ring-indigo-500" : ""}`}
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); setSelectedElement(el.id); setEditorMode("select"); }}
                disableDragging={editorMode === "shape"}
              >
                <div className="w-full h-full relative">
                  {el.type === "richtext" && (
                    <RichTextEditor
                      ref={(ref) => {
                        if (ref) {
                          editorRefs.current.set(el.id, ref);
                          if (isSelected) activeEditorRef.current = ref;
                        }
                      }}
                      content={el.content}
                      onChange={(html) => updateElement(el.id, { content: html })}
                      className="w-full h-full overflow-auto p-2 text-sm"
                    />
                  )}
                  {(el.type === "image" || el.type === "signature") && (
                    <img src={el.content} alt="" className="w-full h-full object-contain" draggable={false} />
                  )}
                  {el.type === "checkbox" && (
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleCheckbox(el.id); }}
                      className={`w-full h-full border-2 rounded flex items-center justify-center transition-colors ${el.content === "checked" ? "bg-indigo-500 border-indigo-500 text-white" : "bg-white border-zinc-400 hover:border-indigo-400"}`}
                    >
                      {el.content === "checked" ? <Check className="w-4 h-4" /> : null}
                    </button>
                  )}
                  {el.type === "shape" && el.shapeStyle && (
                    <div className="w-full h-full">
                      {el.shapeStyle.shapeType === "rectangle" && (
                        <div className="w-full h-full" style={{ border: `${el.shapeStyle.strokeWidth}px solid ${el.shapeStyle.strokeColor}`, backgroundColor: el.shapeStyle.fillColor === "transparent" ? "transparent" : el.shapeStyle.fillColor }} />
                      )}
                      {el.shapeStyle.shapeType === "circle" && (
                        <div className="w-full h-full rounded-full" style={{ border: `${el.shapeStyle.strokeWidth}px solid ${el.shapeStyle.strokeColor}`, backgroundColor: el.shapeStyle.fillColor === "transparent" ? "transparent" : el.shapeStyle.fillColor }} />
                      )}
                      {el.shapeStyle.shapeType === "triangle" && (
                        <svg className="w-full h-full" viewBox={`0 0 ${el.width} ${el.height}`} preserveAspectRatio="none">
                          <polygon points={`${el.width / 2},0 ${el.width},${el.height} 0,${el.height}`} fill={el.shapeStyle.fillColor === "transparent" ? "none" : el.shapeStyle.fillColor} stroke={el.shapeStyle.strokeColor} strokeWidth={el.shapeStyle.strokeWidth} />
                        </svg>
                      )}
                      {(el.shapeStyle.shapeType === "line" || el.shapeStyle.shapeType === "arrow") && (
                        <svg className="w-full h-full" viewBox={`0 0 ${el.width} ${el.height}`} preserveAspectRatio="none">
                          <defs>
                            <marker id={`arrow-${el.id}`} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                              <polygon points="0 0, 10 3.5, 0 7" fill={el.shapeStyle.strokeColor} />
                            </marker>
                          </defs>
                          <line x1="0" y1={el.height} x2={el.width} y2="0" stroke={el.shapeStyle.strokeColor} strokeWidth={el.shapeStyle.strokeWidth} markerEnd={el.shapeStyle.shapeType === "arrow" ? `url(#arrow-${el.id})` : undefined} />
                        </svg>
                      )}
                    </div>
                  )}
                  {isSelected && (
                    <button onClick={(e) => { e.stopPropagation(); deleteElement(el.id); }} className="absolute -top-3 -right-3 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 z-10">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </Rnd>
            );
          })}
        </div>
      </div>

      {/* Signature Modal */}
      {showSignatureModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Draw Signature</h3>
              <button onClick={() => setShowSignatureModal(false)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl mb-4 overflow-hidden flex justify-center bg-white">
              <canvas
                ref={signatureCanvasRef}
                className="cursor-crosshair touch-none"
                style={{ width: '400px', height: '150px' }}
                onMouseDown={startDrawingSignature}
                onMouseMove={drawSignature}
                onMouseUp={() => setIsDrawing(false)}
                onMouseLeave={() => setIsDrawing(false)}
                onTouchStart={startDrawingSignature}
                onTouchMove={drawSignature}
                onTouchEnd={() => setIsDrawing(false)}
              />
            </div>
            <div className="flex gap-3">
              <button onClick={clearSignatureCanvas} className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl font-medium">Clear</button>
              <button onClick={() => setShowSignatureModal(false)} className="flex-1 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl font-medium">Cancel</button>
              <button onClick={addSignature} className="flex-1 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium">Add</button>
            </div>
          </div>
        </div>
      )}

      {/* Table Modal */}
      {showTableModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Insert Table</h3>
              <button onClick={() => setShowTableModal(false)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Rows: {tableRows}</label>
                <input type="range" min="1" max="10" value={tableRows} onChange={(e) => setTableRows(Number(e.target.value))} className="w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Columns: {tableCols}</label>
                <input type="range" min="1" max="10" value={tableCols} onChange={(e) => setTableCols(Number(e.target.value))} className="w-full" />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowTableModal(false)} className="flex-1 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-medium">Cancel</button>
              <button onClick={() => { editorCommands.table(tableRows, tableCols); setShowTableModal(false); }} className="flex-1 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium">Insert</button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal isOpen={showShortcutsModal} onClose={() => setShowShortcutsModal(false)} />

      {/* Add Page Modal */}
      {showPageSizeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add New Page</h3>
              <button onClick={() => setShowPageSizeModal(false)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {Object.entries(PAGE_SIZES).map(([key, size]) => (
                <button key={key} onClick={() => { addPage(size); setShowPageSizeModal(false); }} className="p-3 text-left rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors">
                  <span className="font-medium text-sm">{size.name}</span>
                  <span className="text-xs text-zinc-500 block">{Math.round(size.width)}x{Math.round(size.height)} pt</span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowPageSizeModal(false)} className="w-full mt-4 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-medium">Cancel</button>
          </div>
        </div>
      )}

      {/* Resize Page Modal */}
      {showResizePageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Resize Current Page</h3>
                <p className="text-sm text-zinc-500">Current: {Math.round(pages[currentPage]?.width || 595)}x{Math.round(pages[currentPage]?.height || 842)} pt</p>
              </div>
              <button onClick={() => setShowResizePageModal(false)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {Object.entries(PAGE_SIZES).map(([key, size]) => (
                <button key={key} onClick={() => { resizePage(size); setShowResizePageModal(false); }} className={`p-3 text-left rounded-lg border transition-colors ${pages[currentPage]?.width === size.width && pages[currentPage]?.height === size.height ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30" : "border-zinc-200 dark:border-zinc-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"}`}>
                  <span className="font-medium text-sm">{size.name}</span>
                  <span className="text-xs text-zinc-500 block">{Math.round(size.width)}x{Math.round(size.height)} pt</span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowResizePageModal(false)} className="w-full mt-4 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-medium">Cancel</button>
          </div>
        </div>
      )}

      {/* Bulk Delete Pages Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Select Pages to Delete</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (selectedPagesForDelete.size === pages.length - 1) {
                      setSelectedPagesForDelete(new Set());
                    } else {
                      const all = new Set(pages.map((_, i) => i));
                      setSelectedPagesForDelete(all);
                    }
                  }}
                  className="text-xs px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                >
                  {selectedPagesForDelete.size === pages.length - 1 ? "Deselect All" : "Select All"}
                </button>
                <button onClick={() => setShowBulkDeleteModal(false)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <p className="text-sm text-zinc-500 mb-3">Click pages to select them for deletion. At least one page must remain.</p>
            <div className="grid grid-cols-5 gap-3 max-h-[400px] overflow-y-auto p-1">
              {pages.map((page, idx) => {
                const isSelected = selectedPagesForDelete.has(idx);
                const wouldDeleteAll = isSelected ? false : selectedPagesForDelete.size >= pages.length - 1;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      const next = new Set(selectedPagesForDelete);
                      if (isSelected) {
                        next.delete(idx);
                      } else if (!wouldDeleteAll) {
                        next.add(idx);
                      }
                      setSelectedPagesForDelete(next);
                    }}
                    disabled={!isSelected && wouldDeleteAll}
                    className={`relative rounded-lg border-2 p-2 transition-all ${
                      isSelected
                        ? "border-red-500 bg-red-50 dark:bg-red-950/30"
                        : wouldDeleteAll
                          ? "border-zinc-200 dark:border-zinc-700 opacity-40 cursor-not-allowed"
                          : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500"
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <div
                      className="w-full bg-zinc-100 dark:bg-zinc-800 rounded flex items-center justify-center"
                      style={{ aspectRatio: `${page.width} / ${page.height}` }}
                    >
                      <span className="text-lg font-bold text-zinc-400">{idx + 1}</span>
                    </div>
                    <p className="text-xs text-center mt-1 text-zinc-500">Page {idx + 1}</p>
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowBulkDeleteModal(false)} className="flex-1 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-medium">Cancel</button>
              <button
                onClick={() => deleteMultiplePages(selectedPagesForDelete)}
                disabled={selectedPagesForDelete.size === 0}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:hover:bg-red-500 text-white rounded-xl font-medium flex items-center justify-center gap-2"
              >
                <Trash className="w-4 h-4" />
                {selectedPagesForDelete.size > 0 ? `Delete ${selectedPagesForDelete.size} Page${selectedPagesForDelete.size > 1 ? "s" : ""}` : "Select pages"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sessions Modal */}
      {showSessionsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Saved Sessions</h3>
              <button onClick={() => setShowSessionsModal(false)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {savedSessions.length === 0 ? (
                <p className="text-center text-zinc-500 py-8">No saved sessions</p>
              ) : (
                savedSessions.map(session => (
                  <div key={session.id} className="flex items-center justify-between p-3 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800">
                    <button onClick={() => loadSession(session.id)} className="flex-1 text-left">
                      <p className="font-medium text-sm">{session.name}</p>
                      <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {session.lastModified.toLocaleDateString()} {session.lastModified.toLocaleTimeString()}
                        <span className="mx-1">·</span>
                        {session.pageCount} page{session.pageCount !== 1 ? 's' : ''}
                      </p>
                    </button>
                    <button onClick={() => handleDeleteSession(session.id)} className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-500 rounded"><Trash className="w-4 h-4" /></button>
                  </div>
                ))
              )}
            </div>
            <button onClick={() => setShowSessionsModal(false)} className="w-full mt-4 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-medium">Close</button>
          </div>
        </div>
      )}

      {/* Save Modal (name input) */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Save Session</h3>
              <button onClick={() => setShowSaveModal(false)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"><X className="w-5 h-5" /></button>
            </div>
            <input
              type="text"
              value={sessionNameInput}
              onChange={(e) => setSessionNameInput(e.target.value)}
              placeholder="Session name..."
              className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-transparent mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') { saveSession(sessionNameInput || "Untitled Session"); setShowSaveModal(false); } }}
            />
            <div className="flex gap-2">
              <button onClick={() => setShowSaveModal(false)} className="flex-1 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-medium">Cancel</button>
              <button onClick={() => { saveSession(sessionNameInput || "Untitled Session"); setShowSaveModal(false); }} className="flex-1 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
