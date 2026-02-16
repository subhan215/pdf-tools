"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft, Type, Image as ImageIcon, PenLine, Trash2, Download, Users,
  Smartphone, Copy, Check, Upload, ChevronLeft, ChevronRight, QrCode,
  FilePlus, FileX, Bold, Italic, Underline, AlignLeft, AlignCenter,
  AlignRight, AlignJustify, List, ListOrdered, Square, Circle, Minus,
  ArrowRight, Triangle, Heading1, Heading2, MousePointer2,
  ZoomIn, ZoomOut, Table as TableIcon,
  Undo, Redo, Share, Palette, Highlighter, ChevronDown, ScanText, Loader2, X,
  Save, FolderOpen, Clock, Trash, Images, Plus, Scaling
} from "lucide-react";
import {
  getDeviceId,
  saveFullSession,
  loadFullSession,
  listSessionsForDevice,
  deleteFullSession,
  generateSessionId,
  updateSessionPeerId,
  type SessionMetadata,
  type SessionElement,
} from "@/lib/session-storage";
import { Rnd } from "react-rnd";
import { usePeer, type PDFElement, type PeerMessage, type PageSize, type TextStyle, type ShapeStyle, type SharedImage } from "@/hooks/usePeer";
import { createBlankPDF, arrayBufferToBase64, base64ToArrayBuffer, addElementsToPDF, getPDFPageSizes, PAGE_SIZES, generateId, downloadBlob, fileToBase64 } from "@/lib/pdf-utils";
import RichTextEditor, { RichTextEditorRef } from "@/components/RichTextEditor";
import { extractTextFromImage, scaleOCRResult, type OCRLine } from "@/lib/ocr-utils";

// Import extracted components
import {
  SignatureModal,
  ShareModal,
  SessionsModal,
  SharedImagesModal,
  PageSizeModal,
  TableModal,
  SaveModal,
} from "@/components/collaborate";

// Import constants
import {
  FONT_FAMILIES,
  FONT_SIZES,
  LINE_SPACINGS,
  TEXT_COLORS,
  HIGHLIGHT_COLORS,
  SHAPE_COLORS,
  DEFAULT_TEXT_STYLE,
  PAGE_DOCUMENT_PREFIX,
} from "./constants";

type Mode = "select" | "host" | "join" | "editor";
type EditorMode = "select" | "document" | "shape";
type ShapeType = "rectangle" | "circle" | "line" | "arrow" | "triangle";

export default function CollaboratePage() {
  const [mode, setMode] = useState<Mode>("select");
  const [editorMode, setEditorMode] = useState<EditorMode>("select");
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [elements, setElements] = useState<PDFElement[]>([]);
  const [pages, setPages] = useState<PageSize[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [textStyle, setTextStyle] = useState<TextStyle>(DEFAULT_TEXT_STYLE);
  const [shapeType, setShapeType] = useState<ShapeType>("rectangle");
  const [shapeStroke, setShapeStroke] = useState("#000000");
  const [shapeFill, setShapeFill] = useState("transparent");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPageSizeModal, setShowPageSizeModal] = useState(false);
  const [showResizePageModal, setShowResizePageModal] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [shapePreview, setShapePreview] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [showSizeMenu, setShowSizeMenu] = useState(false);
  const [showLineSpacingMenu, setShowLineSpacingMenu] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);
  const [showStrokeMenu, setShowStrokeMenu] = useState(false);
  const [showFillMenu, setShowFillMenu] = useState(false);
  const [currentFont, setCurrentFont] = useState("Arial");
  const [currentSize, setCurrentSize] = useState("16px");
  const [currentColor, setCurrentColor] = useState("#000000");
  const [currentHighlight, setCurrentHighlight] = useState("#ffff00");

  // Active formatting state
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    alignLeft: true,
    alignCenter: false,
    alignRight: false,
    alignJustify: false,
    bulletList: false,
    orderedList: false,
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const activeEditorRef = useRef<RichTextEditorRef>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [isDrawingShape, setIsDrawingShape] = useState(false);
  const [shapeStart, setShapeStart] = useState({ x: 0, y: 0 });

  // History for undo/redo (unified snapshot)
  interface HistorySnapshot {
    elements: PDFElement[];
    pdfBase64: string | null;
    pages: PageSize[];
    currentPage: number;
  }
  const emptySnapshot: HistorySnapshot = { elements: [], pdfBase64: null, pages: [], currentPage: 0 };
  const [history, setHistory] = useState<HistorySnapshot[]>([emptySnapshot]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // OCR state
  const [isOCRProcessing, setIsOCRProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrLines, setOcrLines] = useState<Map<number, OCRLine[]>>(new Map()); // pageIndex -> lines

  // Session management state
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentSessionName, setCurrentSessionName] = useState<string>("Untitled Session");
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [savedSessions, setSavedSessions] = useState<SessionMetadata[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [sessionNameInput, setSessionNameInput] = useState("");

  // Shared images state (P2P image gallery)
  const [sharedImages, setSharedImages] = useState<SharedImage[]>([]);
  const [showSharedImagesModal, setShowSharedImagesModal] = useState(false);
  const sharedImageInputRef = useRef<HTMLInputElement>(null);

  const { peerId, isConnecting, isConnected, connectedPeers, initPeer, connectToPeer, broadcast, sendTo } = usePeer({
    onMessage: handlePeerMessage,
    onPeerConnect: (id) => { handlePeerConnect(id); notify("Someone joined!"); },
    onPeerDisconnect: () => notify("Someone left"),
  });

  const notify = (msg: string) => { setNotification(msg); setTimeout(() => setNotification(null), 3000); };

  // Build a snapshot of all undoable state
  const buildSnapshot = useCallback((
    elems?: PDFElement[],
    pdf?: string | null,
    pg?: PageSize[],
    cp?: number,
  ): HistorySnapshot => ({
    elements: [...(elems ?? elements)],
    pdfBase64: pdf !== undefined ? pdf : pdfBase64,
    pages: [...(pg ?? pages)],
    currentPage: cp ?? currentPage,
  }), [elements, pdfBase64, pages, currentPage]);

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

  // Restore a snapshot and broadcast changes
  const restoreSnapshot = useCallback((snap: HistorySnapshot) => {
    setElements([...snap.elements]);
    if (snap.pdfBase64 !== pdfBase64) {
      setPdfBase64(snap.pdfBase64);
      if (snap.pdfBase64) broadcast({ type: "pdf-data", data: snap.pdfBase64 });
    }
    setPages([...snap.pages]);
    setCurrentPage(snap.currentPage);
    // Broadcast element state
    snap.elements.forEach(el => {
      broadcast({ type: "update-element", id: el.id, updates: el });
    });
  }, [pdfBase64, broadcast]);

  const globalUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      restoreSnapshot(history[newIndex]);
    }
  }, [historyIndex, history, restoreSnapshot]);

  const globalRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      restoreSnapshot(history[newIndex]);
    }
  }, [historyIndex, history, restoreSnapshot]);

  function handlePeerMessage(message: PeerMessage, fromId: string) {
    switch (message.type) {
      case "pdf-data": setPdfBase64(message.data); break;
      case "add-element": setElements(p => [...p, message.element]); break;
      case "update-element": setElements(p => p.map(el => el.id === message.id ? { ...el, ...message.updates } : el)); break;
      case "delete-element": setElements(p => p.filter(el => el.id !== message.id)); break;
      case "sync-request": sendTo(fromId, { type: "sync-response", state: { pdfBase64, elements, pages, sharedImages } }); break;
      case "sync-response":
        setPdfBase64(message.state.pdfBase64);
        setElements(message.state.elements);
        setPages(message.state.pages);
        if (message.state.sharedImages) setSharedImages(message.state.sharedImages);
        break;
      case "share-image":
        setSharedImages(p => [...p, message.image]);
        notify("New image shared!");
        break;
      case "delete-shared-image":
        setSharedImages(p => p.filter(img => img.id !== message.id));
        break;
    }
  }
  function handlePeerConnect(remoteId: string) { sendTo(remoteId, { type: "sync-response", state: { pdfBase64, elements, pages, sharedImages } }); }

  const startHosting = useCallback(async (createNew: boolean) => {
    initPeer();
    if (createNew) { const bytes = await createBlankPDF([PAGE_SIZES.A4]); setPdfBase64(arrayBufferToBase64(bytes)); setPages([PAGE_SIZES.A4]); }
    setMode("host");
  }, [initPeer]);

  const joinSession = useCallback(() => { initPeer(); setMode("join"); }, [initPeer]);
  const connectToHost = useCallback(() => { if (joinCode.trim()) { connectToPeer(joinCode.trim()); setTimeout(() => broadcast({ type: "sync-request" }), 1000); setMode("editor"); } }, [joinCode, connectToPeer, broadcast]);

  const handlePDFUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const base64 = arrayBufferToBase64(bytes); setPdfBase64(base64);
    setPages(await getPDFPageSizes(bytes));
    broadcast({ type: "pdf-data", data: base64 });
    if (mode === "host") setMode("editor");
    setZoomLevel(1.0);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const el: PDFElement = { id: generateId(), type: "image", pageIndex: currentPage, x: 100, y: 100, width: 200, height: 150, content: await fileToBase64(file) };
    const newElements = [...elements, el];
    setElements(newElements); saveToHistory(buildSnapshot(newElements)); broadcast({ type: "add-element", element: el }); setEditorMode("select");
  };

  // Shared Images Functions (P2P Gallery)
  const handleShareImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const dataUrl = await fileToBase64(file);
    const sharedImage: SharedImage = {
      id: generateId(),
      dataUrl,
      name: file.name,
      uploadedAt: Date.now(),
    };

    setSharedImages(prev => [...prev, sharedImage]);
    broadcast({ type: "share-image", image: sharedImage });
    notify("Image shared with collaborators!");

    // Reset input
    if (sharedImageInputRef.current) {
      sharedImageInputRef.current.value = '';
    }
  };

  const deleteSharedImage = (imageId: string) => {
    setSharedImages(prev => prev.filter(img => img.id !== imageId));
    broadcast({ type: "delete-shared-image", id: imageId });
  };

  const insertSharedImageToDocument = (sharedImage: SharedImage) => {
    const el: PDFElement = {
      id: generateId(),
      type: "image",
      pageIndex: currentPage,
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      content: sharedImage.dataUrl,
    };
    const newElements = [...elements, el];
    setElements(newElements);
    saveToHistory(buildSnapshot(newElements));
    broadcast({ type: "add-element", element: el });
    setShowSharedImagesModal(false);
    setEditorMode("select");
    notify("Image added to document!");
  };

  // Get or create page document element for document mode
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
      textStyle: { ...textStyle },
      isFlowText: true
    };
    setElements(p => [...p, el]);
    broadcast({ type: "add-element", element: el });
    return el;
  };

  const addShape = (x1: number, y1: number, x2: number, y2: number) => {
    const w = Math.abs(x2 - x1), h = Math.abs(y2 - y1); if (w < 10 || h < 10) return;
    const el: PDFElement = { id: generateId(), type: "shape", pageIndex: currentPage, x: Math.min(x1, x2), y: Math.min(y1, y2), width: w, height: h, content: "", shapeStyle: { shapeType, strokeColor: shapeStroke, fillColor: shapeFill, strokeWidth } };
    const newElements = [...elements, el];
    setElements(newElements); saveToHistory(buildSnapshot(newElements)); broadcast({ type: "add-element", element: el });
  };

  const addSignature = () => {
    const canvas = signatureCanvasRef.current; if (!canvas) return;
    const el: PDFElement = { id: generateId(), type: "signature", pageIndex: currentPage, x: 100, y: 100, width: 200, height: 80, content: canvas.toDataURL("image/png") };
    const newElements = [...elements, el];
    setElements(newElements); saveToHistory(buildSnapshot(newElements)); broadcast({ type: "add-element", element: el }); setShowSignatureModal(false);
    const ctx = canvas.getContext("2d"); ctx?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const deleteEl = (id: string) => {
    const newElements = elements.filter(el => el.id !== id);
    setElements(newElements); saveToHistory(buildSnapshot(newElements)); broadcast({ type: "delete-element", id }); setSelectedElement(null);
  };

  const updateElement = (id: string, updates: Partial<PDFElement>, skipHistory = false) => {
    const newElements = elements.map(el => el.id === id ? { ...el, ...updates } : el);
    setElements(newElements);
    if (!skipHistory) saveToHistory(buildSnapshot(newElements));
    broadcast({ type: "update-element", id, updates });
  };

  // OCR - Extract text from current page
  const runOCR = async () => {
    if (!canvasRef.current || isOCRProcessing) return;

    setIsOCRProcessing(true);
    setOcrProgress(0);
    notify("Extracting text from page...");

    try {
      const canvas = canvasRef.current;
      const pageWidth = pages[currentPage]?.width || 595;
      const pageHeight = pages[currentPage]?.height || 842;

      // Get scale factors to convert OCR coordinates to PDF coordinates
      const scaleX = pageWidth / canvas.width;
      const scaleY = pageHeight / canvas.height;

      const result = await extractTextFromImage(canvas, (progress) => {
        setOcrProgress(progress);
      });

      // Scale coordinates to match PDF page
      const scaledResult = scaleOCRResult(result, scaleX, scaleY);

      // Store OCR lines for this page
      setOcrLines(prev => {
        const newMap = new Map(prev);
        newMap.set(currentPage, scaledResult.lines);
        return newMap;
      });

      // Create editable text elements from OCR lines
      const newElements: PDFElement[] = [];
      for (const line of scaledResult.lines) {
        if (line.text.trim()) {
          const el: PDFElement = {
            id: generateId(),
            type: "text",
            pageIndex: currentPage,
            x: line.x,
            y: line.y,
            width: line.width + 20, // Add padding
            height: line.height + 10,
            content: line.text,
            textStyle: {
              ...DEFAULT_TEXT_STYLE,
              fontSize: Math.max(10, Math.round(line.height * 0.8)), // Estimate font size from line height
            },
            isOCRText: true, // Mark as OCR-extracted
          };
          newElements.push(el);
        }
      }

      // Add all OCR elements
      if (newElements.length > 0) {
        const allElements = [...elements, ...newElements];
        setElements(allElements);
        saveToHistory(buildSnapshot(allElements));
        newElements.forEach(el => broadcast({ type: "add-element", element: el }));
        notify(`Extracted ${newElements.length} text blocks!`);
      } else {
        notify("No text found on this page");
      }
    } catch (error) {
      console.error("OCR Error:", error);
      notify("OCR failed. Please try again.");
    } finally {
      setIsOCRProcessing(false);
      setOcrProgress(0);
    }
  };

  const addPage = async (size: PageSize = PAGE_SIZES.A4) => {
    if (!pdfBase64) return;
    const { PDFDocument } = await import("pdf-lib");
    const doc = await PDFDocument.load(base64ToArrayBuffer(pdfBase64));
    doc.addPage([size.width, size.height]);
    const newBase64 = arrayBufferToBase64(await doc.save());
    const newPages = [...pages, size];
    const newCurrentPage = pages.length;
    setPdfBase64(newBase64); setPages(newPages); setCurrentPage(newCurrentPage);
    broadcast({ type: "pdf-data", data: newBase64 });
    saveToHistory(buildSnapshot(undefined, newBase64, newPages, newCurrentPage));
  };

  const deletePage = async () => {
    if (!pdfBase64 || pages.length <= 1) return;
    const { PDFDocument } = await import("pdf-lib");
    const doc = await PDFDocument.load(base64ToArrayBuffer(pdfBase64));
    doc.removePage(currentPage);
    const newBase64 = arrayBufferToBase64(await doc.save());
    const newElements = elements.filter(el => el.pageIndex !== currentPage).map(el => ({ ...el, pageIndex: el.pageIndex > currentPage ? el.pageIndex - 1 : el.pageIndex }));
    const newPages = pages.filter((_, i) => i !== currentPage);
    const newCurrentPage = Math.max(0, currentPage - 1);
    setElements(newElements);
    setPdfBase64(newBase64); setPages(newPages); setCurrentPage(newCurrentPage);
    broadcast({ type: "pdf-data", data: newBase64 });
    saveToHistory(buildSnapshot(newElements, newBase64, newPages, newCurrentPage));
  };

  const resizePage = async (newSize: PageSize) => {
    if (!pdfBase64) return;
    const { PDFDocument } = await import("pdf-lib");
    const doc = await PDFDocument.load(base64ToArrayBuffer(pdfBase64));
    const page = doc.getPage(currentPage);
    page.setSize(newSize.width, newSize.height);
    const newBase64 = arrayBufferToBase64(await doc.save());
    const newPages = pages.map((s, i) => i === currentPage ? newSize : s);
    setPdfBase64(newBase64);
    setPages(newPages);
    broadcast({ type: "pdf-data", data: newBase64 });
    saveToHistory(buildSnapshot(undefined, newBase64, newPages));
  };

  // Session Management Functions
  const saveSession = useCallback(async (name?: string, silent: boolean = false) => {
    if (!pdfBase64 || isSaving) return;

    setIsSaving(true);
    try {
      const deviceId = getDeviceId();
      const sessionId = currentSessionId || generateSessionId();
      const sessionName = name || currentSessionName;

      // Convert elements to session elements (metadata only)
      const sessionElements: SessionElement[] = elements.map(el => ({
        id: el.id,
        type: el.type as 'image' | 'signature' | 'shape' | 'text' | 'richtext',
        pageIndex: el.pageIndex,
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height,
        shapeType: el.shapeStyle?.shapeType as 'rectangle' | 'circle' | 'line' | 'arrow' | 'triangle' | undefined,
        strokeColor: el.shapeStyle?.strokeColor,
        fillColor: el.shapeStyle?.fillColor,
        strokeWidth: el.shapeStyle?.strokeWidth,
      }));

      // Separate content for local storage
      const images = elements
        .filter(el => el.type === 'image')
        .map(el => ({ id: el.id, dataUrl: el.content }));

      const signatures = elements
        .filter(el => el.type === 'signature')
        .map(el => ({ id: el.id, dataUrl: el.content }));

      const textContents = elements
        .filter(el => el.type === 'richtext' || el.type === 'text')
        .map(el => ({ id: el.id, html: el.content }));

      await saveFullSession(
        {
          id: sessionId,
          name: sessionName,
          deviceId,
          peerId: peerId || undefined,
          pageCount: pages.length,
          pageDimensions: pages.map(p => ({ width: p.width, height: p.height })),
          elements: sessionElements,
        },
        {
          pdfBase64,
          images,
          signatures,
          textContents,
        }
      );

      setCurrentSessionId(sessionId);
      setCurrentSessionName(sessionName);
      setLastSaved(new Date());
      if (!silent) notify("Session saved!");
    } catch (error) {
      console.error("Failed to save session:", error);
      if (!silent) notify("Failed to save session");
    } finally {
      setIsSaving(false);
    }
  }, [pdfBase64, elements, pages, currentSessionId, currentSessionName, peerId, isSaving]);

  const loadSavedSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    try {
      const deviceId = getDeviceId();
      const sessions = await listSessionsForDevice(deviceId);
      setSavedSessions(sessions);
    } catch (error) {
      console.error("Failed to load sessions:", error);
      notify("Failed to load sessions");
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  const loadSession = useCallback(async (sessionId: string) => {
    setIsLoadingSessions(true);
    try {
      const { metadata, content } = await loadFullSession(sessionId);

      if (!metadata || !content) {
        notify("Session not found or content missing");
        return;
      }

      // Restore PDF
      setPdfBase64(content.pdfBase64);

      // Restore page dimensions
      const restoredPages: PageSize[] = metadata.pageDimensions.map((dim, idx) => ({
        name: `Page ${idx + 1}`,
        width: dim.width,
        height: dim.height,
      }));
      setPages(restoredPages);

      // Restore elements with content
      const restoredElements: PDFElement[] = metadata.elements.map(el => {
        let elementContent = '';
        let textStyle: TextStyle | undefined;
        let shapeStyle: ShapeStyle | undefined;

        if (el.type === 'image') {
          const img = content.images.find(i => i.id === el.id);
          elementContent = img?.dataUrl || '';
        } else if (el.type === 'signature') {
          const sig = content.signatures.find(s => s.id === el.id);
          elementContent = sig?.dataUrl || '';
        } else if (el.type === 'text' || el.type === 'richtext') {
          const txt = content.textContents.find(t => t.id === el.id);
          elementContent = txt?.html || '';
        } else if (el.type === 'shape') {
          shapeStyle = {
            shapeType: el.shapeType || 'rectangle',
            strokeColor: el.strokeColor || '#000000',
            fillColor: el.fillColor || 'transparent',
            strokeWidth: el.strokeWidth || 2,
          };
        }

        return {
          id: el.id,
          type: el.type === 'text' ? 'text' : el.type === 'shape' ? 'shape' : el.type === 'image' ? 'image' : el.type === 'signature' ? 'signature' : 'richtext',
          pageIndex: el.pageIndex,
          x: el.x,
          y: el.y,
          width: el.width,
          height: el.height,
          content: elementContent,
          textStyle,
          shapeStyle,
        };
      });

      setElements(restoredElements);
      setCurrentSessionId(metadata.id);
      setCurrentSessionName(metadata.name);
      setLastSaved(metadata.lastModified);
      setShowSessionsModal(false);
      setMode("editor");
      notify("Session loaded!");
    } catch (error) {
      console.error("Failed to load session:", error);
      notify("Failed to load session");
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      await deleteFullSession(sessionId);
      setSavedSessions(prev => prev.filter(s => s.id !== sessionId));
      notify("Session deleted");
    } catch (error) {
      console.error("Failed to delete session:", error);
      notify("Failed to delete session");
    }
  }, []);

  // Update peer ID in Supabase when it changes
  useEffect(() => {
    if (currentSessionId && peerId) {
      updateSessionPeerId(currentSessionId, peerId).catch(console.error);
    }
  }, [currentSessionId, peerId]);

  // Auto-save after first manual save (debounced)
  useEffect(() => {
    // Only auto-save if session has been saved at least once
    if (!currentSessionId || !pdfBase64) return;

    const autoSaveTimer = setTimeout(() => {
      saveSession(undefined, true); // Silent auto-save
    }, 3000); // Auto-save 3 seconds after changes

    return () => clearTimeout(autoSaveTimer);
  }, [elements, pages, pdfBase64, currentSessionId, saveSession]);

  const downloadPDF = async () => { if (!pdfBase64) return; const bytes = await addElementsToPDF(base64ToArrayBuffer(pdfBase64), elements); downloadBlob(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }), "document.pdf"); };
  const copyId = () => { if (peerId) { navigator.clipboard.writeText(peerId); setCopied(true); setTimeout(() => setCopied(false), 2000); } };

  const handleCanvasClick = () => {
    // Click on page to start typing - enter document mode
    if (editorMode === "select" || editorMode === "document") {
      ensurePageDocument(currentPage);
      setEditorMode("document");
    }
  };

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
      height: Math.abs(currentY - shapeStart.y)
    });
  };

  const handleShapeUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawingShape || editorMode !== "shape") return;
    const rect = e.currentTarget.getBoundingClientRect();
    addShape(shapeStart.x, shapeStart.y, (e.clientX - rect.left) / zoomLevel, (e.clientY - rect.top) / zoomLevel);
    setIsDrawingShape(false);
    setShapePreview(null);
    // Stay in shape mode - don't switch back to select
  };

  const sigDown = (e: React.MouseEvent | React.TouchEvent) => { setIsDrawing(true); const canvas = signatureCanvasRef.current; if (!canvas) return; const ctx = canvas.getContext("2d"); if (!ctx) return; const rect = canvas.getBoundingClientRect(); const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left; const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top; ctx.beginPath(); ctx.moveTo(x, y); };
  const sigMove = (e: React.MouseEvent | React.TouchEvent) => { if (!isDrawing) return; const canvas = signatureCanvasRef.current; if (!canvas) return; const ctx = canvas.getContext("2d"); if (!ctx) return; const rect = canvas.getBoundingClientRect(); const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left; const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.strokeStyle = "#000"; ctx.lineTo(x, y); ctx.stroke(); };
  const sigUp = () => setIsDrawing(false);

  useEffect(() => {
    if (!pdfBase64 || !canvasRef.current) return;
    const render = async () => {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "https://unpkg.com/pdfjs-dist@5.4.530/build/pdf.worker.min.mjs";
      const pdf = await (await pdfjsLib.getDocument({ data: base64ToArrayBuffer(pdfBase64) })).promise;
      const page = await pdf.getPage(currentPage + 1);
      const canvas = canvasRef.current!; const ctx = canvas.getContext("2d")!;
      const dpr = window.devicePixelRatio || 1;

      // Use actual page dimensions for display, high DPR for crispness
      const pageWidth = pages[currentPage]?.width || 595;
      const pageHeight = pages[currentPage]?.height || 842;
      const vp = page.getViewport({ scale: 1 });

      // Scale to match our container size
      const scale = pageWidth / vp.width;
      const scaledVp = page.getViewport({ scale });

      canvas.width = pageWidth * dpr;
      canvas.height = pageHeight * dpr;
      canvas.style.width = pageWidth + "px";
      canvas.style.height = pageHeight + "px";
      ctx.scale(dpr, dpr);
      await page.render({ canvasContext: ctx, viewport: scaledVp } as any).promise;
    };
    render(); window.addEventListener("resize", render); return () => window.removeEventListener("resize", render);
  }, [pdfBase64, currentPage, pages]); // Re-render when page changes, but not on zoom (CSS transform handles zoom)

  useEffect(() => {
    if (showSignatureModal && signatureCanvasRef.current) {
      const c = signatureCanvasRef.current; const dpr = window.devicePixelRatio || 1;
      c.width = 400 * dpr; c.height = 150 * dpr; c.style.width = "400px"; c.style.height = "150px";
      const ctx = c.getContext("2d"); if (ctx) { ctx.scale(dpr, dpr); ctx.fillStyle = "white"; ctx.fillRect(0, 0, 400, 150); }
    }
  }, [showSignatureModal]);

  const getSessionUrl = () => typeof window !== "undefined" && peerId ? window.location.origin + "/collaborate?join=" + peerId : "";

  useEffect(() => {
    if (typeof window !== "undefined") {
      const join = new URLSearchParams(window.location.search).get("join");
      if (join) { setJoinCode(join); joinSession(); setTimeout(() => { connectToPeer(join); setTimeout(() => broadcast({ type: "sync-request" }), 1000); setMode("editor"); }, 1000); }
    }
  }, []);

  // Global keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        globalUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        globalRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [globalUndo, globalRedo]);

  // Update active formats when editor selection changes
  const updateActiveFormats = useCallback(() => {
    const editor = activeEditorRef.current?.getEditor();
    if (!editor) return;

    setActiveFormats({
      bold: editor.isActive('bold'),
      italic: editor.isActive('italic'),
      underline: editor.isActive('underline'),
      strike: editor.isActive('strike'),
      alignLeft: editor.isActive({ textAlign: 'left' }),
      alignCenter: editor.isActive({ textAlign: 'center' }),
      alignRight: editor.isActive({ textAlign: 'right' }),
      alignJustify: editor.isActive({ textAlign: 'justify' }),
      bulletList: editor.isActive('bulletList'),
      orderedList: editor.isActive('orderedList'),
    });
  }, []);

  // Poll for format changes when in document mode
  useEffect(() => {
    if (editorMode !== 'document') return;
    const interval = setInterval(updateActiveFormats, 100);
    return () => clearInterval(interval);
  }, [editorMode, updateActiveFormats]);

  const renderShape = (el: PDFElement) => {
    const style = el.shapeStyle;
    if (!style) return null;

    const { shapeType, strokeColor, fillColor, strokeWidth: lineWidth } = style;
    const width = el.width;
    const height = el.height;

    if (shapeType === "rectangle") {
      return (
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
          <rect x={lineWidth / 2} y={lineWidth / 2} width={width - lineWidth} height={height - lineWidth} fill={fillColor} stroke={strokeColor} strokeWidth={lineWidth} />
        </svg>
      );
    }
    if (shapeType === "circle") {
      return (
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
          <ellipse cx={width / 2} cy={height / 2} rx={width / 2 - lineWidth / 2} ry={height / 2 - lineWidth / 2} fill={fillColor} stroke={strokeColor} strokeWidth={lineWidth} />
        </svg>
      );
    }
    if (shapeType === "triangle") {
      return (
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
          <polygon points={`${width / 2},${lineWidth} ${width - lineWidth},${height - lineWidth} ${lineWidth},${height - lineWidth}`} fill={fillColor} stroke={strokeColor} strokeWidth={lineWidth} />
        </svg>
      );
    }
    if (shapeType === "line") {
      return (
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
          <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke={strokeColor} strokeWidth={lineWidth} />
        </svg>
      );
    }
    if (shapeType === "arrow") {
      return (
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill={strokeColor} />
            </marker>
          </defs>
          <line x1={0} y1={height / 2} x2={width - 10} y2={height / 2} stroke={strokeColor} strokeWidth={lineWidth} markerEnd="url(#arrowhead)" />
        </svg>
      );
    }
    return null;
  };

  const editorCommands = {
    bold: () => activeEditorRef.current?.toggleBold(),
    italic: () => activeEditorRef.current?.toggleItalic(),
    underline: () => activeEditorRef.current?.toggleUnderline(),
    strike: () => activeEditorRef.current?.toggleStrike(),
    h1: () => activeEditorRef.current?.setHeading(1),
    h2: () => activeEditorRef.current?.setHeading(2),
    h3: () => activeEditorRef.current?.setHeading(3),
    left: () => activeEditorRef.current?.setAlign('left'),
    center: () => activeEditorRef.current?.setAlign('center'),
    right: () => activeEditorRef.current?.setAlign('right'),
    justify: () => activeEditorRef.current?.setAlign('justify'),
    bullet: () => activeEditorRef.current?.toggleBulletList(),
    number: () => activeEditorRef.current?.toggleOrderedList(),
    undo: () => activeEditorRef.current?.undo(),
    redo: () => activeEditorRef.current?.redo(),
    table: (rows?: number, cols?: number) => activeEditorRef.current?.insertTable(rows, cols),
    setFont: (font: string) => { activeEditorRef.current?.setFontFamily(font); setCurrentFont(font.split(',')[0]); },
    setSize: (size: string) => { activeEditorRef.current?.setFontSize(size); setCurrentSize(size); },
    setColor: (color: string) => { activeEditorRef.current?.setColor(color); setCurrentColor(color); },
    setHighlight: (color: string) => { activeEditorRef.current?.toggleHighlight(color); setCurrentHighlight(color); },
    setLineSpacing: (spacing: string) => activeEditorRef.current?.setLineSpacing(spacing),
  };

  if (mode === "select") {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <Link href="/" className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 w-fit"><ArrowLeft className="w-4 h-4" />Back</Link>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-16">
          <div className="text-center mb-12"><h1 className="text-3xl font-bold mb-4">Collaborate</h1><p className="text-zinc-600 dark:text-zinc-400">Create documents together in real-time</p></div>
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <button onClick={() => startHosting(true)} className="p-8 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 text-left group">
              <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><FilePlus className="w-7 h-7 text-indigo-600 dark:text-indigo-400" /></div>
              <h3 className="text-xl font-semibold mb-2">Start New</h3><p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">Create a blank document</p>
              <span className="text-sm font-medium text-indigo-600">Create document</span>
            </button>
            <button onClick={joinSession} className="p-8 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 hover:border-violet-500 text-left group">
              <div className="w-14 h-14 bg-violet-100 dark:bg-violet-900/50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Smartphone className="w-7 h-7 text-violet-600 dark:text-violet-400" /></div>
              <h3 className="text-xl font-semibold mb-2">Join Session</h3><p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">Enter session code</p>
              <span className="text-sm font-medium text-violet-600">Join</span>
            </button>
          </div>

          {/* My Sessions Button */}
          <div className="mb-8">
            <button
              onClick={() => { loadSavedSessions(); setShowSessionsModal(true); }}
              className="w-full p-6 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 text-left group flex items-center gap-4"
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

          <div className="text-center"><p className="text-sm text-zinc-500 mb-3">or</p>
            <label className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl"><Upload className="w-4 h-4" /><span className="font-medium">Upload PDF</span>
              <input type="file" accept=".pdf" className="hidden" onChange={(e) => { handlePDFUpload(e); startHosting(false); }} /></label>
          </div>
        </main>

        {/* Sessions Modal */}
        {showSessionsModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-lg max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">My Sessions</h3>
                <button onClick={() => setShowSessionsModal(false)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {isLoadingSessions ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
                </div>
              ) : savedSessions.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                  <FolderOpen className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mb-3" />
                  <p className="text-zinc-500 dark:text-zinc-400 mb-1">No saved sessions</p>
                  <p className="text-sm text-zinc-400 dark:text-zinc-500">Start a new session and save it to see it here</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-2">
                  {savedSessions.map(session => (
                    <div
                      key={session.id}
                      className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{session.name}</h4>
                          <div className="flex items-center gap-3 mt-1 text-sm text-zinc-500">
                            <span>{session.pageCount} page{session.pageCount !== 1 ? 's' : ''}</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {session.lastModified.toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            onClick={() => loadSession(session.id)}
                            className="p-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 rounded-lg"
                            title="Open"
                          >
                            <FolderOpen className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteSession(session.id)}
                            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-500 rounded-lg"
                            title="Delete"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setShowSessionsModal(false)}
                className="mt-4 w-full px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-medium"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (mode === "host" && !pdfBase64) {
    // ... existing host code ...
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"><div className="max-w-6xl mx-auto px-4 py-4"><button onClick={() => setMode("select")} className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400"><ArrowLeft className="w-4 h-4" />Back</button></div></header>
        <main className="max-w-xl mx-auto px-4 py-16 text-center">
          {isConnecting ? (<div className="animate-pulse"><div className="w-16 h-16 bg-zinc-200 dark:bg-zinc-800 rounded-full mx-auto mb-4" /><p className="text-zinc-600">Setting up...</p></div>) : (
            <><div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 mb-6">
              <QRCodeSVG value={getSessionUrl()} size={200} className="mx-auto mb-6" />
              <p className="text-sm text-zinc-600 mb-4">Scan to join</p>
              <div className="flex items-center justify-center gap-2 p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg"><code className="text-sm font-mono">{peerId}</code><button onClick={copyId} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded">{copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}</button></div>
            </div>
              <div className="flex items-center justify-center gap-4 text-sm text-zinc-500"><Users className="w-4 h-4" />{connectedPeers.length} connected</div>
              <button onClick={() => setMode("editor")} className="mt-8 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium">Continue to Editor</button></>
          )}
        </main>
      </div>
    );
  }

  if (mode === "join") {
    // ... existing join code ...
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"><div className="max-w-6xl mx-auto px-4 py-4"><button onClick={() => setMode("select")} className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400"><ArrowLeft className="w-4 h-4" />Back</button></div></header>
        <main className="max-w-xl mx-auto px-4 py-16">
          <div className="text-center mb-8"><div className="w-16 h-16 bg-violet-100 dark:bg-violet-900/50 rounded-full flex items-center justify-center mx-auto mb-4"><QrCode className="w-8 h-8 text-violet-600" /></div><h2 className="text-2xl font-bold mb-2">Join Session</h2><p className="text-zinc-600">Enter session code</p></div>
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <input type="text" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="Session code" className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-center font-mono text-lg mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <button onClick={connectToHost} disabled={!joinCode.trim() || !isConnected} className="w-full px-6 py-3 bg-indigo-500 hover:bg-indigo-600 disabled:bg-zinc-300 text-white rounded-xl font-medium">{isConnecting ? "Connecting..." : "Join"}</button>
          </div>
        </main>
      </div>
    );
  }

  // Main Editor
  return (
    <div className="h-screen overflow-hidden bg-zinc-100 dark:bg-zinc-900 flex flex-col">
      {/* Top Toolbar */}
      <header className="bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setMode("select")} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-zinc-500" />
              <span className="text-sm text-zinc-600 dark:text-zinc-400">{connectedPeers.length + 1} online</span>
            </div>
            <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700 mx-2" />
            <div className="flex items-center gap-2">
              <button onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded"><ZoomOut className="w-4 h-4" /></button>
              <span className="text-xs w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
              <button onClick={() => setZoomLevel(z => Math.min(2.0, z + 0.1))} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded"><ZoomIn className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Session Name & Save Status */}
            <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
              <span className="max-w-32 truncate">{currentSessionName}</span>
              {lastSaved && (
                <span className="text-xs text-zinc-400">
                  Saved {lastSaved.toLocaleTimeString()}
                </span>
              )}
            </div>
            <button
              onClick={() => {
                if (!currentSessionId) {
                  setSessionNameInput(currentSessionName);
                  setShowSaveModal(true);
                } else {
                  saveSession();
                }
              }}
              disabled={isSaving}
              className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-lg text-sm font-medium flex items-center gap-1"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
            <button onClick={() => setShowShareModal(true)} className="px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm font-medium flex items-center gap-1"><Share className="w-4 h-4" />Share</button>
            <button onClick={downloadPDF} className="px-3 py-1.5 bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 rounded-lg text-sm font-medium flex items-center gap-1"><Download className="w-4 h-4" />Export</button>
          </div>
        </div>
      </header>

      {/* Unified Formatting Toolbar */}
      <div className="bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 px-4 py-2 flex flex-wrap items-center gap-2">
        {/* Mode Selector */}
        <div className="flex items-center border-r border-zinc-200 dark:border-zinc-600 pr-3 mr-1">
          <button onClick={() => { setEditorMode("select"); setSelectedElement(null); }} className={`p-2 rounded ${editorMode === "select" ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600" : "hover:bg-zinc-100 dark:hover:bg-zinc-700"}`} title="Select"><MousePointer2 className="w-4 h-4" /></button>
          <button onClick={() => { setEditorMode("document"); ensurePageDocument(currentPage); setSelectedElement(null); }} className={`p-2 rounded ${editorMode === "document" ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600" : "hover:bg-zinc-100 dark:hover:bg-zinc-700"}`} title="Type Text"><Type className="w-4 h-4" /></button>
        </div>

        {/* Shape Tools - Direct buttons */}
        <div className="flex items-center border-r border-zinc-200 dark:border-zinc-600 pr-3 mr-1 gap-0.5">
          <button onClick={() => { setEditorMode("shape"); setShapeType("rectangle"); }} className={`p-2 rounded ${editorMode === "shape" && shapeType === "rectangle" ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600" : "hover:bg-zinc-100 dark:hover:bg-zinc-700"}`} title="Rectangle"><Square className="w-4 h-4" /></button>
          <button onClick={() => { setEditorMode("shape"); setShapeType("circle"); }} className={`p-2 rounded ${editorMode === "shape" && shapeType === "circle" ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600" : "hover:bg-zinc-100 dark:hover:bg-zinc-700"}`} title="Circle"><Circle className="w-4 h-4" /></button>
          <button onClick={() => { setEditorMode("shape"); setShapeType("triangle"); }} className={`p-2 rounded ${editorMode === "shape" && shapeType === "triangle" ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600" : "hover:bg-zinc-100 dark:hover:bg-zinc-700"}`} title="Triangle"><Triangle className="w-4 h-4" /></button>
          <button onClick={() => { setEditorMode("shape"); setShapeType("line"); }} className={`p-2 rounded ${editorMode === "shape" && shapeType === "line" ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600" : "hover:bg-zinc-100 dark:hover:bg-zinc-700"}`} title="Line"><Minus className="w-4 h-4" /></button>
          <button onClick={() => { setEditorMode("shape"); setShapeType("arrow"); }} className={`p-2 rounded ${editorMode === "shape" && shapeType === "arrow" ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600" : "hover:bg-zinc-100 dark:hover:bg-zinc-700"}`} title="Arrow"><ArrowRight className="w-4 h-4" /></button>
        </div>

        {/* Global Undo/Redo - Always visible */}
        <div className="flex items-center border-r border-zinc-200 dark:border-zinc-600 pr-2 mr-1">
          <button onClick={globalUndo} disabled={historyIndex <= 0} className={`p-2 rounded ${historyIndex <= 0 ? "opacity-40 cursor-not-allowed" : "hover:bg-zinc-100 dark:hover:bg-zinc-700"}`} title="Undo (Ctrl+Z)"><Undo className="w-4 h-4" /></button>
          <button onClick={globalRedo} disabled={historyIndex >= history.length - 1} className={`p-2 rounded ${historyIndex >= history.length - 1 ? "opacity-40 cursor-not-allowed" : "hover:bg-zinc-100 dark:hover:bg-zinc-700"}`} title="Redo (Ctrl+Y)"><Redo className="w-4 h-4" /></button>
        </div>

        {/* Text Actions (Rich Text & Document Mode) */}
        {(editorMode === "document" || (selectedElement && elements.find(e => e.id === selectedElement)?.type === "richtext")) && (
          <>

            {/* Font Family Dropdown */}
            <div className="relative border-r border-zinc-200 dark:border-zinc-600 pr-2 mr-1">
              <button
                onClick={() => { setShowFontMenu(!showFontMenu); setShowSizeMenu(false); setShowLineSpacingMenu(false); }}
                className="flex items-center gap-1 px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-sm min-w-[100px]"
              >
                <span className="truncate">{currentFont}</span>
                <ChevronDown className="w-3 h-3 shrink-0" />
              </button>
              {showFontMenu && (
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg py-1 z-50 max-h-64 overflow-y-auto min-w-[160px]">
                  {FONT_FAMILIES.map(font => (
                    <button
                      key={font.name}
                      onClick={() => { editorCommands.setFont(font.value); setShowFontMenu(false); }}
                      className="w-full px-3 py-1.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 text-sm"
                      style={{ fontFamily: font.value }}
                    >
                      {font.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Font Size Dropdown */}
            <div className="relative border-r border-zinc-200 dark:border-zinc-600 pr-2 mr-1">
              <button
                onClick={() => { setShowSizeMenu(!showSizeMenu); setShowFontMenu(false); setShowLineSpacingMenu(false); }}
                className="flex items-center gap-1 px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-sm min-w-[60px]"
              >
                <span>{currentSize}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {showSizeMenu && (
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg py-1 z-50 max-h-64 overflow-y-auto">
                  {FONT_SIZES.map(size => (
                    <button
                      key={size}
                      onClick={() => { editorCommands.setSize(size); setShowSizeMenu(false); }}
                      className="w-full px-3 py-1.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 text-sm"
                    >
                      {size}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Bold, Italic, Underline */}
            <div className="flex items-center border-r border-zinc-200 dark:border-zinc-600 pr-2 mr-1">
              <button onClick={editorCommands.bold} className={`p-2 rounded ${activeFormats.bold ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600' : 'hover:bg-zinc-100 dark:hover:bg-zinc-700'}`} title="Bold"><Bold className="w-4 h-4" /></button>
              <button onClick={editorCommands.italic} className={`p-2 rounded ${activeFormats.italic ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600' : 'hover:bg-zinc-100 dark:hover:bg-zinc-700'}`} title="Italic"><Italic className="w-4 h-4" /></button>
              <button onClick={editorCommands.underline} className={`p-2 rounded ${activeFormats.underline ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600' : 'hover:bg-zinc-100 dark:hover:bg-zinc-700'}`} title="Underline"><Underline className="w-4 h-4" /></button>
            </div>

            {/* Text Color */}
            <div className="relative border-r border-zinc-200 dark:border-zinc-600 pr-2 mr-1">
              <button
                onClick={() => { setShowColorMenu(!showColorMenu); setShowHighlightMenu(false); setShowFontMenu(false); setShowSizeMenu(false); setShowLineSpacingMenu(false); }}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded flex items-center gap-1"
                title="Text Color"
              >
                <Palette className="w-4 h-4" />
                <div className="w-4 h-3 rounded border border-zinc-300" style={{ backgroundColor: currentColor }} />
                <ChevronDown className="w-3 h-3" />
              </button>
              {showColorMenu && (
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg p-2 z-50 max-h-72 overflow-y-auto">
                  <div className="grid grid-cols-10 gap-1" style={{ width: '230px' }}>
                    {TEXT_COLORS.map((color, idx) => (
                      <button
                        key={`${color}-${idx}`}
                        onClick={() => {
                          setCurrentColor(color);
                          activeEditorRef.current?.getEditor()?.chain().focus().setColor(color).run();
                          setShowColorMenu(false);
                        }}
                        className={`w-5 h-5 rounded border hover:scale-110 transition-transform ${color === currentColor ? 'ring-2 ring-indigo-500' : 'border-zinc-300'}`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Highlight Color */}
            <div className="relative border-r border-zinc-200 dark:border-zinc-600 pr-2 mr-1">
              <button
                onClick={() => { setShowHighlightMenu(!showHighlightMenu); setShowColorMenu(false); setShowFontMenu(false); setShowSizeMenu(false); setShowLineSpacingMenu(false); }}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded flex items-center gap-1"
                title="Highlight Color"
              >
                <Highlighter className="w-4 h-4" />
                <div className="w-4 h-3 rounded border border-zinc-300" style={{ backgroundColor: currentHighlight }} />
                <ChevronDown className="w-3 h-3" />
              </button>
              {showHighlightMenu && (
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg p-2 z-50">
                  <div className="grid grid-cols-7 gap-1" style={{ width: '168px' }}>
                    {HIGHLIGHT_COLORS.map((color, idx) => (
                      <button
                        key={`${color}-${idx}`}
                        onClick={() => {
                          setCurrentHighlight(color);
                          activeEditorRef.current?.getEditor()?.chain().focus().toggleHighlight({ color }).run();
                          setShowHighlightMenu(false);
                        }}
                        className={`w-5 h-5 rounded border hover:scale-110 transition-transform ${color === currentHighlight ? 'ring-2 ring-indigo-500' : 'border-zinc-300'}`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      activeEditorRef.current?.getEditor()?.chain().focus().unsetHighlight().run();
                      setShowHighlightMenu(false);
                    }}
                    className="w-full mt-2 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded"
                  >
                    Remove Highlight
                  </button>
                </div>
              )}
            </div>

            {/* Alignment */}
            <div className="flex items-center border-r border-zinc-200 dark:border-zinc-600 pr-2 mr-1">
              <button onClick={editorCommands.left} className={`p-2 rounded ${activeFormats.alignLeft ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600' : 'hover:bg-zinc-100 dark:hover:bg-zinc-700'}`} title="Align Left"><AlignLeft className="w-4 h-4" /></button>
              <button onClick={editorCommands.center} className={`p-2 rounded ${activeFormats.alignCenter ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600' : 'hover:bg-zinc-100 dark:hover:bg-zinc-700'}`} title="Align Center"><AlignCenter className="w-4 h-4" /></button>
              <button onClick={editorCommands.right} className={`p-2 rounded ${activeFormats.alignRight ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600' : 'hover:bg-zinc-100 dark:hover:bg-zinc-700'}`} title="Align Right"><AlignRight className="w-4 h-4" /></button>
              <button onClick={editorCommands.justify} className={`p-2 rounded ${activeFormats.alignJustify ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600' : 'hover:bg-zinc-100 dark:hover:bg-zinc-700'}`} title="Justify"><AlignJustify className="w-4 h-4" /></button>
            </div>

            {/* Line Spacing */}
            <div className="relative border-r border-zinc-200 dark:border-zinc-600 pr-2 mr-1">
              <button
                onClick={() => { setShowLineSpacingMenu(!showLineSpacingMenu); setShowFontMenu(false); setShowSizeMenu(false); }}
                className="flex items-center gap-1 px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-xs"
                title="Line Spacing"
              >
                <span>Spacing</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {showLineSpacingMenu && (
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg py-1 z-50">
                  {LINE_SPACINGS.map(ls => (
                    <button
                      key={ls.value}
                      onClick={() => { editorCommands.setLineSpacing(ls.value); setShowLineSpacingMenu(false); }}
                      className="w-full px-3 py-1.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 text-sm"
                    >
                      {ls.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Lists */}
            <div className="flex items-center border-r border-zinc-200 dark:border-zinc-600 pr-2 mr-1">
              <button onClick={editorCommands.bullet} className={`p-2 rounded ${activeFormats.bulletList ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600' : 'hover:bg-zinc-100 dark:hover:bg-zinc-700'}`} title="Bullet List"><List className="w-4 h-4" /></button>
              <button onClick={editorCommands.number} className={`p-2 rounded ${activeFormats.orderedList ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600' : 'hover:bg-zinc-100 dark:hover:bg-zinc-700'}`} title="Numbered List"><ListOrdered className="w-4 h-4" /></button>
            </div>

            {/* Headings */}
            <div className="flex items-center border-r border-zinc-200 dark:border-zinc-600 pr-2 mr-1">
              <button onClick={editorCommands.h1} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded" title="Heading 1"><Heading1 className="w-4 h-4" /></button>
              <button onClick={editorCommands.h2} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded" title="Heading 2"><Heading2 className="w-4 h-4" /></button>
            </div>

            {/* Table */}
            <div className="flex items-center pr-2 mr-1">
              <button onClick={() => setShowTableModal(true)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded" title="Insert Table"><TableIcon className="w-4 h-4" /></button>
            </div>
          </>
        )}


        {/* Shape Colors */}
        {editorMode === "shape" && (
          <div className="flex items-center gap-2 border-l border-zinc-200 dark:border-zinc-600 pl-2 ml-1">
            {/* Stroke Color */}
            <div className="relative">
              <button
                onClick={() => { setShowStrokeMenu(!showStrokeMenu); setShowFillMenu(false); }}
                className="flex items-center gap-1 px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-xs"
                title="Stroke Color"
              >
                <span className="text-zinc-500">Stroke:</span>
                <div className="w-5 h-5 rounded border border-zinc-300" style={{ backgroundColor: shapeStroke }} />
                <ChevronDown className="w-3 h-3" />
              </button>
              {showStrokeMenu && (
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg p-2 z-50">
                  <div className="grid grid-cols-6 gap-1" style={{ width: '156px' }}>
                    {SHAPE_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => { setShapeStroke(color); setShowStrokeMenu(false); }}
                        className={`w-5 h-5 rounded border hover:scale-110 transition-transform ${color === shapeStroke ? 'ring-2 ring-indigo-500' : 'border-zinc-300'}`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Fill Color */}
            <div className="relative">
              <button
                onClick={() => { setShowFillMenu(!showFillMenu); setShowStrokeMenu(false); }}
                className="flex items-center gap-1 px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-xs"
                title="Fill Color"
              >
                <span className="text-zinc-500">Fill:</span>
                <div
                  className="w-5 h-5 rounded border border-zinc-300"
                  style={{
                    backgroundColor: shapeFill === "transparent" ? "#ffffff" : shapeFill,
                    backgroundImage: shapeFill === "transparent" ? "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)" : "none",
                    backgroundSize: "8px 8px",
                    backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px"
                  }}
                />
                <ChevronDown className="w-3 h-3" />
              </button>
              {showFillMenu && (
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg p-2 z-50">
                  <div className="grid grid-cols-6 gap-1" style={{ width: '156px' }}>
                    {SHAPE_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => { setShapeFill(color); setShowFillMenu(false); }}
                        className={`w-5 h-5 rounded border hover:scale-110 transition-transform ${color === shapeFill ? 'ring-2 ring-indigo-500' : 'border-zinc-300'}`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => { setShapeFill("transparent"); setShowFillMenu(false); }}
                    className={`w-full mt-2 px-2 py-1 text-xs rounded flex items-center justify-center gap-1 ${shapeFill === "transparent" ? "bg-indigo-100 text-indigo-600" : "text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-700"}`}
                  >
                    <span
                      className="w-4 h-4 rounded border border-zinc-300"
                      style={{
                        backgroundImage: "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
                        backgroundSize: "6px 6px",
                        backgroundPosition: "0 0, 0 3px, 3px -3px, -3px 0px"
                      }}
                    />
                    No Fill
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tools */}
        <div className="flex items-center gap-1 border-l border-zinc-200 dark:border-zinc-600 pl-2 ml-auto">
          <button
            onClick={runOCR}
            disabled={isOCRProcessing}
            className={`p-2 rounded flex items-center gap-1 ${isOCRProcessing ? "bg-amber-100 dark:bg-amber-900/50 text-amber-600" : "hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-600 dark:text-amber-400"}`}
            title="Extract Text (OCR)"
          >
            {isOCRProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanText className="w-4 h-4" />}
            {isOCRProcessing && <span className="text-xs">{ocrProgress}%</span>}
          </button>
          <button onClick={() => imageInputRef.current?.click()} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded" title="Add Image"><ImageIcon className="w-4 h-4" /></button>
          <button
            onClick={() => setShowSharedImagesModal(true)}
            className={`p-2 rounded relative ${sharedImages.length > 0 ? "text-violet-600 hover:bg-violet-100 dark:hover:bg-violet-900/50" : "hover:bg-zinc-100 dark:hover:bg-zinc-700"}`}
            title="Shared Images"
          >
            <Images className="w-4 h-4" />
            {sharedImages.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-violet-500 text-white text-xs rounded-full flex items-center justify-center">
                {sharedImages.length}
              </span>
            )}
          </button>
          <button onClick={() => setShowSignatureModal(true)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded" title="Add Signature"><PenLine className="w-4 h-4" /></button>
          <button onClick={() => setShowPageSizeModal(true)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded" title="Add Page"><FilePlus className="w-4 h-4" /></button>
          {selectedElement && <button onClick={() => deleteEl(selectedElement)} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-500 rounded" title="Delete"><Trash2 className="w-4 h-4" /></button>}
        </div>
      </div>
      <input type="file" ref={imageInputRef} accept="image/*" className="hidden" onChange={handleImageUpload} />
      <input type="file" ref={sharedImageInputRef} accept="image/*" className="hidden" onChange={handleShareImage} />


      {/* Main Canvas Area */}
      <div className="flex-1 overflow-auto p-4 bg-zinc-200 dark:bg-zinc-950 flex justify-center items-start">
        <div
          className="relative bg-white shadow-lg transition-transform origin-top"
          style={{
            width: (pages[currentPage]?.width || 595),
            height: (pages[currentPage]?.height || 842),
            transform: `scale(${zoomLevel})`
          }}
          onClick={handleCanvasClick}
          onMouseDown={handleShapeDown}
          onMouseMove={handleShapeMove}
          onMouseUp={handleShapeUp}
          onMouseLeave={() => { if (isDrawingShape) { setIsDrawingShape(false); setShapePreview(null); } }}
        >
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

          {/* Render Elements */}
          {elements.filter(el => el.pageIndex === currentPage).map(el => {
            const isSelected = selectedElement === el.id;
            const isPageDocument = el.id === getPageDocumentId(currentPage);

            // Rich Text Rendering
            if (el.type === "richtext") {
              // Page document in document mode - always editable, full page
              if (isPageDocument && editorMode === "document") {
                return (
                  <div
                    key={el.id}
                    className="absolute z-20"
                    style={{
                      left: el.x,
                      top: el.y,
                      width: el.width,
                      height: el.height
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <RichTextEditor
                      ref={activeEditorRef}
                      content={el.content}
                      onChange={(html) => updateElement(el.id, { content: html })}
                    />
                  </div>
                );
              }

              // Regular richtext box - selected
              if (isSelected) {
                return (
                  <Rnd
                    key={el.id}
                    size={{ width: el.width, height: el.height }}
                    position={{ x: el.x, y: el.y }}
                    onDragStop={(e, d) => updateElement(el.id, { x: d.x, y: d.y })}
                    onResizeStop={(e, direction, ref, delta, position) => {
                      updateElement(el.id, {
                        width: parseInt(ref.style.width),
                        height: parseInt(ref.style.height),
                        ...position
                      });
                    }}
                    scale={zoomLevel}
                    bounds="parent"
                    className="z-10 bg-white ring-2 ring-indigo-500 shadow-xl"
                  >
                    <RichTextEditor
                      ref={activeEditorRef}
                      content={el.content}
                      onChange={(html) => updateElement(el.id, { content: html })}
                    />
                  </Rnd>
                );
              }

              // Page document when not in document mode - show as static content
              if (isPageDocument) {
                return (
                  <div
                    key={el.id}
                    className="absolute cursor-pointer hover:ring-1 hover:ring-indigo-300 overflow-hidden"
                    style={{
                      left: el.x,
                      top: el.y,
                      width: el.width,
                      height: el.height
                    }}
                    onClick={(e) => { e.stopPropagation(); setEditorMode("document"); }}
                  >
                    <div className="ProseMirror h-full" dangerouslySetInnerHTML={{ __html: el.content }} />
                  </div>
                );
              }

              // Regular richtext - not selected
              return (
                <div
                  key={el.id}
                  className="absolute cursor-pointer hover:ring-1 hover:ring-indigo-300 overflow-hidden"
                  style={{
                    left: el.x,
                    top: el.y,
                    width: el.width,
                    height: el.height
                  }}
                  onClick={(e) => { e.stopPropagation(); setSelectedElement(el.id); }}
                >
                  <div className="ProseMirror h-full" dangerouslySetInnerHTML={{ __html: el.content }} />
                </div>
              );
            }

            // Other Elements (Image, Simple Text, Shape, Signature) - Wrap in Rnd if selected, absolute if not
            // For simplicity and legacy compat, we might keep them as absolute divs unless we want to extend Rnd to all.
            // Plan said "Drag & Resize", allowing Rnd for all is better UX.
            // Let's wrap all in Rnd if selected.

            if (isSelected) {
              return (
                <Rnd
                  key={el.id}
                  size={{ width: el.width, height: el.height }}
                  position={{ x: el.x, y: el.y }}
                  onDragStop={(e, d) => updateElement(el.id, { x: d.x, y: d.y })}
                  onResizeStop={(e, direction, ref, delta, position) => {
                    updateElement(el.id, {
                      width: parseInt(ref.style.width),
                      height: parseInt(ref.style.height),
                      ...position
                    });
                  }}
                  scale={zoomLevel}
                  bounds="parent"
                  className="z-10 ring-2 ring-indigo-500"
                  lockAspectRatio={el.type === "image" || el.type === "signature" || el.type === "shape"}
                >
                  <div className={`relative w-full h-full ${el.isOCRText ? "bg-white/90" : ""}`} onClick={(e) => e.stopPropagation()}>
                    {/* Delete button for image, signature, and shape */}
                    {(el.type === "image" || el.type === "signature" || el.type === "shape") && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setElements(prev => prev.filter(item => item.id !== el.id));
                          setSelectedElement(null);
                        }}
                        className="absolute -top-3 -right-3 z-20 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg"
                        title="Delete"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    {el.type === "text" && (
                      <input
                        type="text"
                        value={el.content}
                        onChange={(e) => updateElement(el.id, { content: e.target.value })}
                        className={`w-full h-full border-none outline-none ${el.isOCRText ? "bg-white/90 px-1" : "bg-transparent"}`}
                        style={{
                          fontFamily: el.textStyle?.fontFamily || "Arial",
                          fontSize: el.textStyle?.fontSize || 16,
                          color: el.textStyle?.fontColor || "#000",
                          fontWeight: el.textStyle?.bold ? "bold" : "normal",
                          fontStyle: el.textStyle?.italic ? "italic" : "normal",
                          textDecoration: el.textStyle?.underline ? "underline" : "none",
                          textAlign: el.textStyle?.align || "left",
                        }}
                      />
                    )}
                    {(el.type === "image" || el.type === "signature") && (
                      <img src={el.content} alt="" className="w-full h-full object-contain" draggable={false} />
                    )}
                    {el.type === "shape" && renderShape(el)}
                  </div>
                </Rnd>
              );
            }

            // View Mode
            return (
              <div
                key={el.id}
                className={`absolute cursor-pointer ${el.isOCRText ? "hover:bg-amber-100/50 bg-white/80 rounded" : ""}`}
                style={{ left: el.x, top: el.y, width: el.width, height: el.height }}
                onClick={(e) => { e.stopPropagation(); setSelectedElement(el.id); }}
              >
                {el.type === "text" && (
                  <div className={`w-full h-full ${el.isOCRText ? "px-1" : ""}`} style={{
                    fontFamily: el.textStyle?.fontFamily || "Arial",
                    fontSize: el.textStyle?.fontSize || 16,
                    color: el.textStyle?.fontColor || "#000",
                    fontWeight: el.textStyle?.bold ? "bold" : "normal",
                    fontStyle: el.textStyle?.italic ? "italic" : "normal",
                    textDecoration: el.textStyle?.underline ? "underline" : "none",
                    textAlign: el.textStyle?.align || "left",
                    whiteSpace: "nowrap",
                    overflow: "hidden"
                  }}>{el.content}</div>
                )}
                {(el.type === "image" || el.type === "signature") && (
                  <img src={el.content} alt="" className="w-full h-full object-contain" draggable={false} />
                )}
                {el.type === "shape" && renderShape(el)}
              </div>
            );
          })}

          {/* Shape Preview while drawing */}
          {shapePreview && shapePreview.width > 0 && shapePreview.height > 0 && (
            <div
              className="absolute pointer-events-none border-2 border-dashed border-indigo-500 bg-indigo-100/30"
              style={{
                left: shapePreview.x,
                top: shapePreview.y,
                width: shapePreview.width,
                height: shapePreview.height,
                borderRadius: shapeType === "circle" ? "50%" : 0
              }}
            />
          )}

          {/* Mode Hints */}
          {editorMode === "shape" && !isDrawingShape && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-black/50 text-white px-4 py-2 rounded-lg text-sm">Click and drag to draw {shapeType}</div>
            </div>
          )}
        </div>
      </div>

      {/* Page Navigation */}
      <footer className="bg-white dark:bg-zinc-800 border-t border-zinc-200 dark:border-zinc-700 px-4 py-3">
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded disabled:opacity-50"><ChevronLeft className="w-5 h-5" /></button>
          <span className="text-sm font-medium">Page {currentPage + 1} of {pages.length}</span>
          <button onClick={() => setCurrentPage(p => Math.min(pages.length - 1, p + 1))} disabled={currentPage === pages.length - 1} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded disabled:opacity-50"><ChevronRight className="w-5 h-5" /></button>
          <button onClick={() => setShowResizePageModal(true)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded" title="Resize Current Page"><Scaling className="w-5 h-5" /></button>
          <button onClick={deletePage} disabled={pages.length <= 1} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-500 rounded disabled:opacity-50" title="Delete Page"><FileX className="w-5 h-5" /></button>
        </div>
      </footer>

      {/* Notification */}
      {notification && (
        <div className="fixed top-4 right-4 bg-indigo-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">{notification}</div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Share Session</h3>
            <div className="flex justify-center mb-4"><QRCodeSVG value={getSessionUrl()} size={150} /></div>
            <div className="flex items-center gap-2 p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg mb-4">
              <code className="text-sm font-mono flex-1 truncate">{peerId}</code>
              <button onClick={copyId} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded">{copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}</button>
            </div>
            <p className="text-sm text-zinc-500 text-center mb-4">{connectedPeers.length} collaborator(s) connected</p>
            <button onClick={() => setShowShareModal(false)} className="w-full px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-medium">Close</button>
          </div>
        </div>
      )}

      {/* Signature Modal */}
      {showSignatureModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-4">Draw Signature</h3>
            <canvas
              ref={signatureCanvasRef}
              className="border border-zinc-200 dark:border-zinc-700 rounded-lg cursor-crosshair w-full"
              onMouseDown={sigDown}
              onMouseMove={sigMove}
              onMouseUp={sigUp}
              onMouseLeave={sigUp}
              onTouchStart={sigDown}
              onTouchMove={sigMove}
              onTouchEnd={sigUp}
            />
            <div className="flex gap-2 mt-4">
              <button onClick={() => { const ctx = signatureCanvasRef.current?.getContext("2d"); if (ctx) { ctx.fillStyle = "white"; ctx.fillRect(0, 0, 400, 150); } }} className="flex-1 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-medium">Clear</button>
              <button onClick={addSignature} className="flex-1 px-4 py-2 bg-indigo-500 text-white rounded-xl font-medium">Add Signature</button>
            </div>
            <button onClick={() => setShowSignatureModal(false)} className="w-full mt-2 px-4 py-2 text-zinc-500 hover:text-zinc-700">Cancel</button>
          </div>
        </div>
      )}

      {/* Page Size Modal */}
      {showPageSizeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add New Page</h3>
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {Object.entries(PAGE_SIZES).map(([key, size]) => (
                <button key={key} onClick={() => { addPage(size); setShowPageSizeModal(false); }} className="p-3 text-left rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30">
                  <span className="font-medium text-sm">{size.name}</span>
                  <span className="text-xs text-zinc-500 block">{Math.round(size.width)}×{Math.round(size.height)} pt</span>
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
            <h3 className="text-lg font-semibold mb-2">Resize Current Page</h3>
            <p className="text-sm text-zinc-500 mb-4">Current: {pages[currentPage]?.name || "Custom"} ({Math.round(pages[currentPage]?.width || 595)}×{Math.round(pages[currentPage]?.height || 842)} pt)</p>
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {Object.entries(PAGE_SIZES).map(([key, size]) => (
                <button key={key} onClick={() => { resizePage(size); setShowResizePageModal(false); }} className={`p-3 text-left rounded-lg border transition-colors ${pages[currentPage]?.width === size.width && pages[currentPage]?.height === size.height ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30" : "border-zinc-200 dark:border-zinc-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"}`}>
                  <span className="font-medium text-sm">{size.name}</span>
                  <span className="text-xs text-zinc-500 block">{Math.round(size.width)}×{Math.round(size.height)} pt</span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowResizePageModal(false)} className="w-full mt-4 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-medium">Cancel</button>
          </div>
        </div>
      )}

      {/* Table Insert Modal */}
      {showTableModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-4">Insert Table</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Rows</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setTableRows(r => Math.max(1, r - 1))}
                    className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center text-lg font-bold"
                  >-</button>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={tableRows}
                    onChange={(e) => setTableRows(Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="flex-1 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-center text-lg font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={() => setTableRows(r => Math.min(20, r + 1))}
                    className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center text-lg font-bold"
                  >+</button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Columns</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setTableCols(c => Math.max(1, c - 1))}
                    className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center text-lg font-bold"
                  >-</button>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={tableCols}
                    onChange={(e) => setTableCols(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="flex-1 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-center text-lg font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={() => setTableCols(c => Math.min(10, c + 1))}
                    className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center text-lg font-bold"
                  >+</button>
                </div>
              </div>
              {/* Table Preview */}
              <div className="mt-4 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                <p className="text-xs text-zinc-500 mb-2 text-center">Preview</p>
                <div className="flex justify-center overflow-auto max-h-32">
                  <table className="border-collapse">
                    <tbody>
                      {Array.from({ length: Math.min(tableRows, 5) }).map((_, rowIdx) => (
                        <tr key={rowIdx}>
                          {Array.from({ length: Math.min(tableCols, 6) }).map((_, colIdx) => (
                            <td
                              key={colIdx}
                              className={`w-6 h-5 border border-zinc-300 dark:border-zinc-600 ${rowIdx === 0 ? "bg-zinc-200 dark:bg-zinc-700" : "bg-white dark:bg-zinc-800"}`}
                            />
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {(tableRows > 5 || tableCols > 6) && (
                  <p className="text-xs text-zinc-400 text-center mt-1">...and more</p>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowTableModal(false)} className="flex-1 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-medium">Cancel</button>
              <button
                onClick={() => {
                  editorCommands.table(tableRows, tableCols);
                  setShowTableModal(false);
                }}
                className="flex-1 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium"
              >
                Insert Table
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Session Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Save Session</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
              Give your session a name to easily find it later.
            </p>
            <input
              type="text"
              value={sessionNameInput}
              onChange={(e) => setSessionNameInput(e.target.value)}
              placeholder="Session name"
              className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  saveSession(sessionNameInput || "Untitled Session");
                  setShowSaveModal(false);
                }}
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </button>
            </div>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-4 text-center">
              Your documents stay on your device. Only session metadata is synced.
            </p>
          </div>
        </div>
      )}

      {/* Shared Images Modal */}
      {showSharedImagesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Images className="w-5 h-5 text-violet-500" />
                Shared Images
              </h3>
              <button onClick={() => setShowSharedImagesModal(false)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
              Share images with collaborators via P2P. Images stay on devices, not uploaded to any server.
            </p>

            {/* Upload Button */}
            <button
              onClick={() => sharedImageInputRef.current?.click()}
              className="w-full mb-4 p-4 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl hover:border-violet-400 dark:hover:border-violet-600 transition-colors flex items-center justify-center gap-2 text-zinc-500 hover:text-violet-600"
            >
              <Plus className="w-5 h-5" />
              <span>Upload Image to Share</span>
            </button>

            {/* Images Grid */}
            {sharedImages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                <Images className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mb-3" />
                <p className="text-zinc-500 dark:text-zinc-400 mb-1">No shared images yet</p>
                <p className="text-sm text-zinc-400 dark:text-zinc-500">Upload an image to share with collaborators</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  {sharedImages.map(img => (
                    <div
                      key={img.id}
                      className="relative group rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                    >
                      <img
                        src={img.dataUrl}
                        alt={img.name}
                        className="w-full h-32 object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          onClick={() => insertSharedImageToDocument(img)}
                          className="p-2 bg-violet-500 hover:bg-violet-600 text-white rounded-lg"
                          title="Add to Document"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteSharedImage(img.id)}
                          className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg"
                          title="Delete"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="p-2">
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate">{img.name}</p>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500">
                          {new Date(img.uploadedAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setShowSharedImagesModal(false)}
              className="mt-4 w-full px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
