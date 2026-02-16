"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import JSZip from "jszip";
import {
  ArrowLeft,
  Upload,
  Download,
  FileImage,
  Loader2,
  Check,
  ImageIcon,
} from "lucide-react";
import { downloadBlob } from "@/lib/pdf-utils";
import { useToast } from "@/components/Toast";

type ImageFormat = "png" | "jpg";
type ImageQuality = "low" | "medium" | "high";

interface PagePreview {
  pageNum: number;
  thumbnail: string;
  selected: boolean;
}

const QUALITY_SETTINGS = {
  low: { scale: 1, quality: 0.6, label: "Low", description: "Smaller file size" },
  medium: { scale: 1.5, quality: 0.8, label: "Medium", description: "Balanced" },
  high: { scale: 2, quality: 1, label: "High", description: "Best quality" },
};

export default function PdfToImagePage() {
  const { showToast } = useToast();
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [fileName, setFileName] = useState("document");
  const [pages, setPages] = useState<PagePreview[]>([]);
  const [format, setFormat] = useState<ImageFormat>("png");
  const [quality, setQuality] = useState<ImageQuality>("medium");
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setFileName(file.name.replace(".pdf", ""));

    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      setPdfBytes(bytes);

      // Generate thumbnails
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.4.530/build/pdf.worker.min.mjs`;

      const loadingTask = pdfjsLib.getDocument({ data: bytes });
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;

      const previews: PagePreview[] = [];
      const thumbnailScale = 0.3;

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: thumbnailScale });

        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;

        await page.render({
          canvasContext: ctx,
          viewport,
          canvas,
        }).promise;

        previews.push({
          pageNum: i,
          thumbnail: canvas.toDataURL("image/jpeg", 0.7),
          selected: true,
        });
      }

      setPages(previews);
    } catch (error) {
      console.error("Error loading PDF:", error);
      showToast("Failed to load PDF. The file may be corrupted.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const togglePage = (pageNum: number) => {
    setPages((prev) =>
      prev.map((p) =>
        p.pageNum === pageNum ? { ...p, selected: !p.selected } : p
      )
    );
  };

  const selectAll = () => {
    setPages((prev) => prev.map((p) => ({ ...p, selected: true })));
  };

  const deselectAll = () => {
    setPages((prev) => prev.map((p) => ({ ...p, selected: false })));
  };

  const exportImages = async () => {
    if (!pdfBytes) return;

    const selectedPages = pages.filter((p) => p.selected);
    if (selectedPages.length === 0) {
      showToast("Please select at least one page", "warning");
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      const pdfjsLib = await import("pdfjs-dist");
      const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
      const pdf = await loadingTask.promise;

      const qualitySettings = QUALITY_SETTINGS[quality];
      const zip = new JSZip();

      for (let i = 0; i < selectedPages.length; i++) {
        const pageInfo = selectedPages[i];
        setExportProgress(Math.round(((i + 1) / selectedPages.length) * 100));

        const page = await pdf.getPage(pageInfo.pageNum);
        const viewport = page.getViewport({ scale: qualitySettings.scale });

        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;

        await page.render({
          canvasContext: ctx,
          viewport,
          canvas,
        }).promise;

        const mimeType = format === "png" ? "image/png" : "image/jpeg";
        const dataUrl = canvas.toDataURL(mimeType, qualitySettings.quality);
        const base64Data = dataUrl.split(",")[1];

        const extension = format === "png" ? "png" : "jpg";
        zip.file(`${fileName}-page-${pageInfo.pageNum}.${extension}`, base64Data, { base64: true });
      }

      // If only one page, download directly; otherwise download as ZIP
      if (selectedPages.length === 1) {
        const pageInfo = selectedPages[0];
        const page = await pdf.getPage(pageInfo.pageNum);
        const viewport = page.getViewport({ scale: qualitySettings.scale });

        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;

        await page.render({
          canvasContext: ctx,
          viewport,
          canvas,
        }).promise;

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const extension = format === "png" ? "png" : "jpg";
              downloadBlob(blob, `${fileName}-page-${pageInfo.pageNum}.${extension}`);
            }
          },
          format === "png" ? "image/png" : "image/jpeg",
          qualitySettings.quality
        );
      } else {
        const zipBlob = await zip.generateAsync({ type: "blob" });
        downloadBlob(zipBlob, `${fileName}-images.zip`);
      }

      showToast(`Exported ${selectedPages.length} page${selectedPages.length > 1 ? "s" : ""} successfully!`, "success");
    } catch (error) {
      console.error("Error exporting images:", error);
      showToast("Failed to export images. Please try again.", "error");
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const selectedCount = pages.filter((p) => p.selected).length;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-semibold text-lg">PDF to Image</h1>
              <p className="text-sm text-zinc-500">Export PDF pages as images</p>
            </div>
          </div>
          {pages.length > 0 && (
            <button
              onClick={exportImages}
              disabled={isExporting || selectedCount === 0}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-400 text-white rounded-lg font-medium"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {exportProgress}%
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Export {selectedCount > 0 ? `(${selectedCount})` : ""}
                </>
              )}
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        {!pdfBytes ? (
          /* Upload Area */
          <div
            className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl p-12 text-center hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
                <p className="text-zinc-600 dark:text-zinc-400">Loading PDF...</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FileImage className="w-8 h-8 text-orange-500" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Upload PDF</h2>
                <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                  Select a PDF to convert pages to images
                </p>
                <button className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium">
                  <Upload className="w-4 h-4 inline mr-2" />
                  Select PDF
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Options */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Format:</span>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as ImageFormat)}
                    className="px-3 py-1.5 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-sm"
                  >
                    <option value="png">PNG</option>
                    <option value="jpg">JPG</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Quality:</span>
                  <select
                    value={quality}
                    onChange={(e) => setQuality(e.target.value as ImageQuality)}
                    className="px-3 py-1.5 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-sm"
                  >
                    {Object.entries(QUALITY_SETTINGS).map(([key, val]) => (
                      <option key={key} value={key}>
                        {val.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAll}
                  className="px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg"
                >
                  Select All
                </button>
                <button
                  onClick={deselectAll}
                  className="px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg"
                >
                  Deselect All
                </button>
              </div>
            </div>

            {/* Pages Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
              {pages.map((page) => (
                <div
                  key={page.pageNum}
                  onClick={() => togglePage(page.pageNum)}
                  className={`relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${
                    page.selected
                      ? "border-indigo-500 ring-2 ring-indigo-500/20"
                      : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                  }`}
                >
                  <div className="aspect-[3/4] relative bg-zinc-100 dark:bg-zinc-800">
                    <img
                      src={page.thumbnail}
                      alt={`Page ${page.pageNum}`}
                      className="absolute inset-0 w-full h-full object-contain"
                    />
                  </div>
                  <div className="absolute top-2 right-2">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        page.selected
                          ? "bg-indigo-500 text-white"
                          : "bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600"
                      }`}
                    >
                      {page.selected && <Check className="w-4 h-4" />}
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-center text-xs py-1">
                    Page {page.pageNum}
                  </div>
                </div>
              ))}
            </div>

            {/* Info */}
            <p className="text-center text-sm text-zinc-500">
              {selectedCount} of {pages.length} page{pages.length !== 1 ? "s" : ""} selected
            </p>
          </div>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        accept=".pdf"
        className="hidden"
        onChange={handleFileUpload}
      />
    </div>
  );
}
