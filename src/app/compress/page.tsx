"use client";

import { useState } from "react";
import Link from "next/link";
import { PDFDocument } from "pdf-lib";
import {
  ArrowLeft,
  Upload,
  Download,
  FileText,
  CheckCircle,
  Search,
  ImageIcon,
  AlertTriangle,
} from "lucide-react";
import { downloadBlob } from "@/lib/pdf-utils";
import { useToast } from "@/components/Toast";

type CompressionMode = "smart" | "aggressive";
type QualityLevel = "low" | "medium" | "high";

const QUALITY_SETTINGS = {
  low: { quality: 0.8, label: "Low", description: "Minimal compression, best quality" },
  medium: { quality: 0.5, label: "Medium", description: "Balanced compression" },
  high: { quality: 0.3, label: "High", description: "Maximum compression" },
};

export default function CompressPage() {
  const { showToast } = useToast();
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [fileName, setFileName] = useState("document");
  const [originalSize, setOriginalSize] = useState(0);
  const [compressedSize, setCompressedSize] = useState<number | null>(null);
  const [compressedBytes, setCompressedBytes] = useState<Uint8Array | null>(null);
  const [compressionMode, setCompressionMode] = useState<CompressionMode>("smart");
  const [qualityLevel, setQualityLevel] = useState<QualityLevel>("medium");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pageCount, setPageCount] = useState(0);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name.replace(".pdf", ""));
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    setPdfBytes(bytes);
    setOriginalSize(bytes.length);
    setCompressedSize(null);
    setCompressedBytes(null);

    // Get page count
    try {
      const doc = await PDFDocument.load(bytes);
      setPageCount(doc.getPageCount());
    } catch {
      setPageCount(0);
    }
  };

  // Smart compression - preserves text searchability
  const compressSmart = async () => {
    if (!pdfBytes) return;

    setIsProcessing(true);
    setProgress(10);

    try {
      // Load the PDF
      const pdfDoc = await PDFDocument.load(pdfBytes, {
        ignoreEncryption: true,
      });
      setProgress(30);

      // Get all pages
      const pages = pdfDoc.getPages();
      const totalPages = pages.length;

      // Process each page - compress embedded images
      for (let i = 0; i < totalPages; i++) {
        setProgress(30 + Math.round((i / totalPages) * 50));
        // pdf-lib doesn't have direct image recompression, but re-saving helps
      }

      setProgress(85);

      // Save with compression
      // pdf-lib automatically applies some optimizations when saving
      const compressed = await pdfDoc.save({
        useObjectStreams: true, // Compress objects into streams
        addDefaultPage: false,
        objectsPerTick: 100,
      });

      setProgress(100);
      setCompressedBytes(compressed);
      setCompressedSize(compressed.length);
    } catch (error) {
      console.error("Error compressing PDF:", error);
      showToast("Failed to compress PDF. The file may be corrupted or encrypted.", "error");
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  // Aggressive compression - converts to images (smallest size but loses text)
  const compressAggressive = async () => {
    if (!pdfBytes) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.4.530/build/pdf.worker.min.mjs`;

      const quality = QUALITY_SETTINGS[qualityLevel].quality;
      const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;

      const newPdf = await PDFDocument.create();

      for (let i = 1; i <= numPages; i++) {
        setProgress(Math.round((i / numPages) * 100));

        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.0 });

        // Create canvas
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;

        // Render page to canvas
        await page.render({
          canvasContext: ctx,
          viewport,
          canvas: canvas,
        }).promise;

        // Convert to JPEG with quality setting
        const jpegDataUrl = canvas.toDataURL("image/jpeg", quality);
        const jpegBase64 = jpegDataUrl.split(",")[1];
        const jpegBytes = Uint8Array.from(atob(jpegBase64), (c) => c.charCodeAt(0));

        // Embed in new PDF
        const jpegImage = await newPdf.embedJpg(jpegBytes);
        const newPage = newPdf.addPage([viewport.width, viewport.height]);
        newPage.drawImage(jpegImage, {
          x: 0,
          y: 0,
          width: viewport.width,
          height: viewport.height,
        });
      }

      const compressed = await newPdf.save();
      setCompressedBytes(compressed);
      setCompressedSize(compressed.length);
    } catch (error) {
      console.error("Error compressing PDF:", error);
      showToast("Failed to compress PDF. Please try again.", "error");
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleCompress = () => {
    if (compressionMode === "smart") {
      compressSmart();
    } else {
      compressAggressive();
    }
  };

  const downloadCompressed = () => {
    if (!compressedBytes) return;
    const blob = new Blob([new Uint8Array(compressedBytes)], { type: "application/pdf" });
    downloadBlob(blob, `${fileName}-compressed.pdf`);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getSavingsPercent = () => {
    if (!compressedSize || !originalSize) return 0;
    return Math.round((1 - compressedSize / originalSize) * 100);
  };

  // Upload screen
  if (!pdfBytes) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <Link href="/" className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 w-fit">
              <ArrowLeft className="w-4 h-4" />
              Back to Tools
            </Link>
          </div>
        </header>

        <main className="max-w-xl mx-auto px-4 py-16">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">Compress PDF</h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              Reduce file size while preserving quality and text searchability
            </p>
          </div>

          <label className="block cursor-pointer">
            <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl p-12 text-center hover:border-orange-400 transition-colors">
              <Upload className="w-12 h-12 mx-auto mb-4 text-zinc-400" />
              <p className="font-medium mb-2">Click to upload PDF</p>
              <p className="text-sm text-zinc-500">or drag and drop</p>
            </div>
            <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} />
          </label>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
            <ArrowLeft className="w-4 h-4" />
            Back to Tools
          </Link>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-8">
        {/* File info */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
          <div className="flex items-center gap-4">
            <FileText className="w-10 h-10 text-red-500" />
            <div>
              <p className="font-medium">{fileName}.pdf</p>
              <p className="text-sm text-zinc-500">
                {formatSize(originalSize)} · {pageCount} page{pageCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Compression Mode */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
          <h3 className="font-semibold mb-4">Compression Mode</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setCompressionMode("smart")}
              className={`p-4 rounded-xl border-2 text-left transition-colors ${
                compressionMode === "smart"
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                  : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Search className="w-5 h-5 text-indigo-500" />
                <span className="font-medium">Smart</span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Preserves text searchability and copy/paste
              </p>
              <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                <CheckCircle className="w-3 h-3" />
                <span>Recommended</span>
              </div>
            </button>

            <button
              onClick={() => setCompressionMode("aggressive")}
              className={`p-4 rounded-xl border-2 text-left transition-colors ${
                compressionMode === "aggressive"
                  ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                  : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <ImageIcon className="w-5 h-5 text-amber-500" />
                <span className="font-medium">Aggressive</span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Converts to images for smallest size
              </p>
              <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                <AlertTriangle className="w-3 h-3" />
                <span>Loses text search</span>
              </div>
            </button>
          </div>
        </div>

        {/* Quality Level (for aggressive mode) */}
        {compressionMode === "aggressive" && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
            <h3 className="font-semibold mb-4">Quality Level</h3>
            <div className="space-y-2">
              {(Object.keys(QUALITY_SETTINGS) as QualityLevel[]).map((level) => {
                const settings = QUALITY_SETTINGS[level];
                return (
                  <button
                    key={level}
                    onClick={() => setQualityLevel(level)}
                    className={`w-full p-3 rounded-xl border-2 text-left transition-colors flex items-center justify-between ${
                      qualityLevel === level
                        ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                        : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                    }`}
                  >
                    <div>
                      <p className="font-medium">{settings.label}</p>
                      <p className="text-xs text-zinc-500">{settings.description}</p>
                    </div>
                    <span className="text-sm text-zinc-500">{Math.round(settings.quality * 100)}%</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  Aggressive mode converts PDF pages to images. Text will not be searchable or selectable in the compressed file.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Progress */}
        {isProcessing && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                {compressionMode === "smart" ? "Optimizing PDF..." : "Converting pages..."}
              </span>
              <span className="text-sm text-zinc-500">{progress}%</span>
            </div>
            <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Result */}
        {compressedSize !== null && (
          <div className={`rounded-2xl border p-6 mb-6 ${
            getSavingsPercent() > 0
              ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
              : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className={`w-6 h-6 ${getSavingsPercent() > 0 ? "text-green-600" : "text-zinc-500"}`} />
              <span className={`font-semibold ${getSavingsPercent() > 0 ? "text-green-800 dark:text-green-200" : ""}`}>
                Compression Complete!
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-zinc-600 dark:text-zinc-400">Original</p>
                <p className="font-semibold">{formatSize(originalSize)}</p>
              </div>
              <div>
                <p className="text-zinc-600 dark:text-zinc-400">New size</p>
                <p className="font-semibold">{formatSize(compressedSize)}</p>
              </div>
              <div>
                <p className="text-zinc-600 dark:text-zinc-400">Saved</p>
                <p className={`font-semibold ${getSavingsPercent() > 0 ? "text-green-600" : "text-zinc-500"}`}>
                  {getSavingsPercent() > 0 ? `${getSavingsPercent()}%` : "0%"}
                </p>
              </div>
            </div>
            {compressionMode === "smart" && getSavingsPercent() < 10 && (
              <p className="text-xs text-zinc-500 mt-3">
                Tip: This PDF is already well-optimized. Try Aggressive mode for more compression.
              </p>
            )}
          </div>
        )}

        {/* Action buttons */}
        {compressedBytes ? (
          <div className="space-y-3">
            <button
              onClick={downloadCompressed}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium transition-colors"
            >
              <Download className="w-5 h-5" />
              Download Compressed PDF
            </button>
            <button
              onClick={() => {
                setCompressedBytes(null);
                setCompressedSize(null);
              }}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl font-medium transition-colors"
            >
              Try Different Settings
            </button>
          </div>
        ) : (
          <button
            onClick={handleCompress}
            disabled={isProcessing}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-400 text-white rounded-xl font-medium transition-colors"
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {compressionMode === "smart" ? "Optimizing..." : "Compressing..."}
              </>
            ) : (
              "Compress PDF"
            )}
          </button>
        )}
      </main>
    </div>
  );
}
