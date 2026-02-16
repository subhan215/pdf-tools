"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { PDFDocument, degrees, rgb, StandardFonts } from "pdf-lib";
import JSZip from "jszip";
import {
  ArrowLeft,
  Upload,
  Download,
  Trash2,
  FileText,
  Play,
  CheckCircle2,
  XCircle,
  Loader2,
  Minimize2,
  RotateCw,
  FilePlus2,
  Stamp,
  ImageIcon,
} from "lucide-react";
import { downloadBlob } from "@/lib/pdf-utils";
import { useToast } from "@/components/Toast";

type BatchOperation = "compress" | "rotate" | "merge" | "watermark" | "toImage";
type FileStatus = "pending" | "processing" | "completed" | "error";

interface BatchFile {
  id: string;
  name: string;
  size: number;
  bytes: Uint8Array;
  status: FileStatus;
  outputBytes?: Uint8Array;
  outputSize?: number;
  error?: string;
}

interface OperationConfig {
  compressQuality: number; // 0.3 = high compression, 0.8 = low compression
  rotateAngle: 0 | 90 | 180 | 270;
  watermarkText: string;
  watermarkOpacity: number;
  watermarkPosition: "center" | "tiled";
  imageFormat: "png" | "jpeg";
  imageQuality: number;
}

// PDF.js for rendering
declare global {
  interface Window {
    pdfjsLib: typeof import("pdfjs-dist");
  }
}

export default function BatchPage() {
  const { showToast } = useToast();
  const [files, setFiles] = useState<BatchFile[]>([]);
  const [operation, setOperation] = useState<BatchOperation>("compress");
  const [config, setConfig] = useState<OperationConfig>({
    compressQuality: 0.5,
    rotateAngle: 90,
    watermarkText: "CONFIDENTIAL",
    watermarkOpacity: 0.3,
    watermarkPosition: "center",
    imageFormat: "png",
    imageQuality: 0.9,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [pdfjsLoaded, setPdfjsLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load PDF.js for image conversion
  useEffect(() => {
    if (typeof window !== "undefined" && !window.pdfjsLib) {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs";
      script.type = "module";
      script.onload = () => {
        const workerScript = document.createElement("script");
        workerScript.textContent = `
          import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs';
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';
          window.pdfjsLib = pdfjsLib;
          window.dispatchEvent(new Event('pdfjsLoaded'));
        `;
        workerScript.type = "module";
        document.head.appendChild(workerScript);
      };
      document.head.appendChild(script);

      const handleLoaded = () => setPdfjsLoaded(true);
      window.addEventListener("pdfjsLoaded", handleLoaded);
      return () => window.removeEventListener("pdfjsLoaded", handleLoaded);
    } else if (window.pdfjsLib) {
      setPdfjsLoaded(true);
    }
  }, []);

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    const newFiles: BatchFile[] = [];
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      if (!file.name.toLowerCase().endsWith('.pdf')) continue;

      const arrayBuffer = await file.arrayBuffer();
      newFiles.push({
        id: `${Date.now()}-${i}`,
        name: file.name,
        size: file.size,
        bytes: new Uint8Array(arrayBuffer),
        status: "pending",
      });
    }

    setFiles((prev) => [...prev, ...newFiles]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Remove file
  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Clear all files
  const clearAll = () => {
    setFiles([]);
    setProcessedCount(0);
  };

  // Compress PDF
  const compressPDF = async (bytes: Uint8Array): Promise<Uint8Array> => {
    const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const compressed = await pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
      objectsPerTick: 100,
    });
    return new Uint8Array(compressed);
  };

  // Rotate PDF
  const rotatePDF = async (bytes: Uint8Array, angle: number): Promise<Uint8Array> => {
    const pdfDoc = await PDFDocument.load(bytes);
    const pages = pdfDoc.getPages();
    for (const page of pages) {
      const currentRotation = page.getRotation().angle;
      page.setRotation(degrees((currentRotation + angle) % 360));
    }
    return new Uint8Array(await pdfDoc.save());
  };

  // Add watermark to PDF
  const addWatermarkToPDF = async (
    bytes: Uint8Array,
    text: string,
    opacity: number,
    position: "center" | "tiled"
  ): Promise<Uint8Array> => {
    const pdfDoc = await PDFDocument.load(bytes);
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pages = pdfDoc.getPages();

    for (const page of pages) {
      const { width, height } = page.getSize();
      const fontSize = Math.min(width, height) * 0.1;

      if (position === "center") {
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        const textHeight = font.heightAtSize(fontSize);
        page.drawText(text, {
          x: (width - textWidth) / 2,
          y: (height - textHeight) / 2,
          size: fontSize,
          font,
          color: rgb(0.5, 0.5, 0.5),
          opacity,
          rotate: degrees(-45),
        });
      } else {
        // Tiled watermark
        const smallFontSize = fontSize * 0.5;
        const textWidth = font.widthOfTextAtSize(text, smallFontSize);
        const spacingX = textWidth * 2;
        const spacingY = smallFontSize * 4;

        for (let x = -width; x < width * 2; x += spacingX) {
          for (let y = -height; y < height * 2; y += spacingY) {
            page.drawText(text, {
              x,
              y,
              size: smallFontSize,
              font,
              color: rgb(0.5, 0.5, 0.5),
              opacity,
              rotate: degrees(-45),
            });
          }
        }
      }
    }

    return new Uint8Array(await pdfDoc.save());
  };

  // Convert PDF to images (returns a zip blob for multiple pages)
  const convertPDFToImages = async (
    bytes: Uint8Array,
    format: "png" | "jpeg",
    quality: number,
    fileName: string
  ): Promise<Blob> => {
    if (!window.pdfjsLib) {
      throw new Error("PDF.js not loaded");
    }

    const pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;
    const zip = new JSZip();
    const scale = 2; // 2x for good quality

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d")!;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;

      const imageData = await new Promise<Blob>((resolve) => {
        canvas.toBlob(
          (blob) => resolve(blob!),
          format === "jpeg" ? "image/jpeg" : "image/png",
          quality
        );
      });

      const ext = format === "jpeg" ? "jpg" : "png";
      const baseName = fileName.replace(".pdf", "");
      zip.file(`${baseName}_page_${i}.${ext}`, imageData);
    }

    return await zip.generateAsync({ type: "blob" });
  };

  // Process all files
  const processBatch = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    setProcessedCount(0);

    // Reset all files to pending
    setFiles((prev) => prev.map((f) => ({ ...f, status: "pending" as FileStatus, outputBytes: undefined, outputSize: undefined, error: undefined })));

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Update status to processing
      setFiles((prev) =>
        prev.map((f) => (f.id === file.id ? { ...f, status: "processing" as FileStatus } : f))
      );

      try {
        let outputBytes: Uint8Array;

        if (operation === "compress") {
          outputBytes = await compressPDF(file.bytes);
        } else if (operation === "rotate") {
          outputBytes = await rotatePDF(file.bytes, config.rotateAngle);
        } else if (operation === "watermark") {
          outputBytes = await addWatermarkToPDF(
            file.bytes,
            config.watermarkText,
            config.watermarkOpacity,
            config.watermarkPosition
          );
        } else if (operation === "toImage") {
          // For toImage, we store the blob differently
          const imageZip = await convertPDFToImages(
            file.bytes,
            config.imageFormat,
            config.imageQuality,
            file.name
          );
          const arrayBuffer = await imageZip.arrayBuffer();
          outputBytes = new Uint8Array(arrayBuffer);
        } else {
          // Merge is handled separately
          outputBytes = file.bytes;
        }

        // Update file with result
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id
              ? { ...f, status: "completed" as FileStatus, outputBytes, outputSize: outputBytes.length }
              : f
          )
        );
      } catch (err) {
        // Update file with error
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id
              ? { ...f, status: "error" as FileStatus, error: err instanceof Error ? err.message : "Unknown error" }
              : f
          )
        );
      }

      setProcessedCount(i + 1);
    }

    setIsProcessing(false);
  };

  // Merge all PDFs
  const mergeAll = async () => {
    if (files.length < 2) return;

    setIsProcessing(true);
    setProcessedCount(0);

    try {
      const mergedPdf = await PDFDocument.create();

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setFiles((prev) =>
          prev.map((f) => (f.id === file.id ? { ...f, status: "processing" as FileStatus } : f))
        );

        const pdf = await PDFDocument.load(file.bytes);
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        pages.forEach((page) => mergedPdf.addPage(page));

        setFiles((prev) =>
          prev.map((f) => (f.id === file.id ? { ...f, status: "completed" as FileStatus } : f))
        );
        setProcessedCount(i + 1);
      }

      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([new Uint8Array(mergedBytes)], { type: "application/pdf" });
      downloadBlob(blob, "batch-merged.pdf");
    } catch (err) {
      showToast("Failed to merge PDFs: " + (err instanceof Error ? err.message : "Unknown error"), "error");
    }

    setIsProcessing(false);
  };

  // Download all processed files
  const downloadAll = async () => {
    const completedFiles = files.filter((f) => f.status === "completed" && f.outputBytes);
    if (completedFiles.length === 0) return;

    // For toImage operation, each file is already a zip, so we combine them
    if (operation === "toImage") {
      if (completedFiles.length === 1) {
        const file = completedFiles[0];
        const blob = new Blob([new Uint8Array(file.outputBytes!)], { type: "application/zip" });
        downloadBlob(blob, file.name.replace(".pdf", `-images.zip`));
        return;
      }

      // Multiple files: create a mega zip containing all individual zips
      const megaZip = new JSZip();
      for (const file of completedFiles) {
        const folderName = file.name.replace(".pdf", "");
        const fileZip = await JSZip.loadAsync(file.outputBytes!);
        const folder = megaZip.folder(folderName);

        for (const [name, zipEntry] of Object.entries(fileZip.files)) {
          if (!zipEntry.dir) {
            const content = await zipEntry.async("uint8array");
            folder?.file(name, content);
          }
        }
      }

      const megaZipBlob = await megaZip.generateAsync({ type: "blob" });
      downloadBlob(megaZipBlob, `batch-images.zip`);
      return;
    }

    // For PDF operations
    if (completedFiles.length === 1) {
      const file = completedFiles[0];
      const blob = new Blob([new Uint8Array(file.outputBytes!)], { type: "application/pdf" });
      downloadBlob(blob, file.name.replace(".pdf", `-${operation}.pdf`));
      return;
    }

    const zip = new JSZip();
    for (const file of completedFiles) {
      const newName = file.name.replace(".pdf", `-${operation}.pdf`);
      zip.file(newName, new Uint8Array(file.outputBytes!));
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    downloadBlob(zipBlob, `batch-${operation}.zip`);
  };

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Get compression ratio
  const getCompressionRatio = (original: number, compressed: number) => {
    const ratio = ((original - compressed) / original) * 100;
    return ratio > 0 ? `-${ratio.toFixed(0)}%` : `+${Math.abs(ratio).toFixed(0)}%`;
  };

  const completedCount = files.filter((f) => f.status === "completed").length;
  const hasErrors = files.some((f) => f.status === "error");

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Tools
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">Batch Processing</h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Process multiple PDF files at once
          </p>
        </div>

        {/* Upload area */}
        <label className="block cursor-pointer mb-6">
          <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl p-8 text-center hover:border-indigo-500 transition-colors">
            <Upload className="w-10 h-10 mx-auto mb-3 text-zinc-400" />
            <p className="font-medium mb-1">Click to upload PDFs</p>
            <p className="text-sm text-zinc-500">or drag and drop multiple files</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            multiple
            className="hidden"
            onChange={handleFileUpload}
          />
        </label>

        {files.length > 0 && (
          <>
            {/* Operation selector */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
              <h3 className="font-semibold mb-4">Select Operation</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <button
                  onClick={() => setOperation("compress")}
                  disabled={isProcessing}
                  className={`p-4 rounded-xl border-2 text-left transition-colors ${
                    operation === "compress"
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                      : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                  } disabled:opacity-50`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Minimize2 className="w-5 h-5" />
                    <p className="font-medium">Compress</p>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Reduce file size
                  </p>
                </button>

                <button
                  onClick={() => setOperation("rotate")}
                  disabled={isProcessing}
                  className={`p-4 rounded-xl border-2 text-left transition-colors ${
                    operation === "rotate"
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                      : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                  } disabled:opacity-50`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <RotateCw className="w-5 h-5" />
                    <p className="font-medium">Rotate</p>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Rotate all pages
                  </p>
                </button>

                <button
                  onClick={() => setOperation("merge")}
                  disabled={isProcessing}
                  className={`p-4 rounded-xl border-2 text-left transition-colors ${
                    operation === "merge"
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                      : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                  } disabled:opacity-50`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <FilePlus2 className="w-5 h-5" />
                    <p className="font-medium">Merge</p>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Combine into one PDF
                  </p>
                </button>

                <button
                  onClick={() => setOperation("watermark")}
                  disabled={isProcessing}
                  className={`p-4 rounded-xl border-2 text-left transition-colors ${
                    operation === "watermark"
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                      : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                  } disabled:opacity-50`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Stamp className="w-5 h-5" />
                    <p className="font-medium">Watermark</p>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Add text watermark
                  </p>
                </button>

                <button
                  onClick={() => setOperation("toImage")}
                  disabled={isProcessing || !pdfjsLoaded}
                  className={`p-4 rounded-xl border-2 text-left transition-colors ${
                    operation === "toImage"
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                      : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                  } disabled:opacity-50`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <ImageIcon className="w-5 h-5" />
                    <p className="font-medium">To Images</p>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Convert to PNG/JPG
                  </p>
                </button>
              </div>

              {/* Operation-specific settings */}
              {operation === "rotate" && (
                <div className="mt-4 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
                  <label className="block text-sm font-medium mb-2">Rotation Angle</label>
                  <div className="flex gap-2">
                    {([90, 180, 270] as const).map((angle) => (
                      <button
                        key={angle}
                        onClick={() => setConfig((c) => ({ ...c, rotateAngle: angle }))}
                        disabled={isProcessing}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          config.rotateAngle === angle
                            ? "bg-indigo-500 text-white"
                            : "bg-white dark:bg-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-600"
                        }`}
                      >
                        {angle}°
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {operation === "watermark" && (
                <div className="mt-4 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-xl space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Watermark Text</label>
                    <input
                      type="text"
                      value={config.watermarkText}
                      onChange={(e) => setConfig((c) => ({ ...c, watermarkText: e.target.value }))}
                      disabled={isProcessing}
                      placeholder="CONFIDENTIAL"
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Position</label>
                      <div className="flex gap-2">
                        {(["center", "tiled"] as const).map((pos) => (
                          <button
                            key={pos}
                            onClick={() => setConfig((c) => ({ ...c, watermarkPosition: pos }))}
                            disabled={isProcessing}
                            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                              config.watermarkPosition === pos
                                ? "bg-indigo-500 text-white"
                                : "bg-white dark:bg-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-600"
                            }`}
                          >
                            {pos}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Opacity: {Math.round(config.watermarkOpacity * 100)}%
                      </label>
                      <input
                        type="range"
                        min={5}
                        max={100}
                        step={5}
                        value={Math.round(config.watermarkOpacity * 100)}
                        onChange={(e) => setConfig((c) => ({ ...c, watermarkOpacity: parseInt(e.target.value) / 100 }))}
                        disabled={isProcessing}
                        className="w-full accent-indigo-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

              {operation === "toImage" && (
                <div className="mt-4 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Format</label>
                      <div className="flex gap-2">
                        {(["png", "jpeg"] as const).map((fmt) => (
                          <button
                            key={fmt}
                            onClick={() => setConfig((c) => ({ ...c, imageFormat: fmt }))}
                            disabled={isProcessing}
                            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors uppercase ${
                              config.imageFormat === fmt
                                ? "bg-indigo-500 text-white"
                                : "bg-white dark:bg-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-600"
                            }`}
                          >
                            {fmt}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Quality: {Math.round(config.imageQuality * 100)}%
                      </label>
                      <input
                        type="range"
                        min="0.5"
                        max="1"
                        step="0.1"
                        value={config.imageQuality}
                        onChange={(e) => setConfig((c) => ({ ...c, imageQuality: parseFloat(e.target.value) }))}
                        disabled={isProcessing}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* File list */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden mb-6">
              <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <span className="font-medium">{files.length} files</span>
                <button
                  onClick={clearAll}
                  disabled={isProcessing}
                  className="text-sm text-red-500 hover:text-red-600 disabled:opacity-50"
                >
                  Clear all
                </button>
              </div>

              <div className="divide-y divide-zinc-200 dark:divide-zinc-800 max-h-80 overflow-y-auto">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 p-4"
                  >
                    {/* Status icon */}
                    <div className="shrink-0">
                      {file.status === "pending" && (
                        <FileText className="w-6 h-6 text-zinc-400" />
                      )}
                      {file.status === "processing" && (
                        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                      )}
                      {file.status === "completed" && (
                        <CheckCircle2 className="w-6 h-6 text-green-500" />
                      )}
                      {file.status === "error" && (
                        <XCircle className="w-6 h-6 text-red-500" />
                      )}
                    </div>

                    {/* File info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.name}</p>
                      <div className="flex items-center gap-2 text-sm text-zinc-500">
                        <span>{formatSize(file.size)}</span>
                        {file.status === "completed" && file.outputSize && operation === "compress" && (
                          <>
                            <span>→</span>
                            <span className="text-green-600 dark:text-green-400">
                              {formatSize(file.outputSize)} ({getCompressionRatio(file.size, file.outputSize)})
                            </span>
                          </>
                        )}
                        {file.status === "error" && file.error && (
                          <span className="text-red-500">{file.error}</span>
                        )}
                      </div>
                    </div>

                    {/* Remove button */}
                    <button
                      onClick={() => removeFile(file.id)}
                      disabled={isProcessing}
                      className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Progress */}
            {isProcessing && (
              <div className="mb-6">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>Processing...</span>
                  <span>
                    {processedCount} / {files.length}
                  </span>
                </div>
                <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 transition-all duration-300"
                    style={{ width: `${(processedCount / files.length) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              {operation === "merge" ? (
                <button
                  onClick={mergeAll}
                  disabled={isProcessing || files.length < 2}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-400 text-white rounded-xl font-medium transition-colors"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Merging...
                    </>
                  ) : (
                    <>
                      <FilePlus2 className="w-5 h-5" />
                      Merge & Download
                    </>
                  )}
                </button>
              ) : (
                <>
                  <button
                    onClick={processBatch}
                    disabled={isProcessing}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-400 text-white rounded-xl font-medium transition-colors"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5" />
                        Process All
                      </>
                    )}
                  </button>

                  {completedCount > 0 && !isProcessing && (
                    <button
                      onClick={downloadAll}
                      className="flex items-center justify-center gap-2 px-6 py-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors"
                    >
                      <Download className="w-5 h-5" />
                      Download All
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Status summary */}
            {completedCount > 0 && !isProcessing && (
              <p className="text-center text-sm text-zinc-500 mt-4">
                {completedCount} of {files.length} files processed successfully
                {hasErrors && " (some files had errors)"}
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
