"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { PDFDocument, degrees } from "pdf-lib";
import JSZip from "jszip";
import {
  ArrowLeft,
  Upload,
  Download,
  FileText,
  Check,
  RotateCw,
  Loader2,
} from "lucide-react";
import { downloadBlob, base64ToArrayBuffer, arrayBufferToBase64, type RotationDegrees, getNextRotation } from "@/lib/pdf-utils";
import { generateThumbnailsBatched } from "@/lib/thumbnail-utils";
import { useToast } from "@/components/Toast";

type SplitMode = "extract" | "range" | "each";

interface PagePreview {
  pageNum: number;
  thumbnail: string;
  selected: boolean;
  rotation: RotationDegrees;
}

export default function SplitPage() {
  const { showToast } = useToast();
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [fileName, setFileName] = useState("document");
  const [pageCount, setPageCount] = useState(0);
  const [pages, setPages] = useState<PagePreview[]>([]);
  const [splitMode, setSplitMode] = useState<SplitMode>("extract");
  const [rangeInput, setRangeInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [thumbnails, setThumbnails] = useState<Map<number, string>>(new Map());
  const [isLoadingThumbnails, setIsLoadingThumbnails] = useState(false);
  const [thumbnailProgress, setThumbnailProgress] = useState(0);

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name.replace(".pdf", ""));
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    setPdfBytes(bytes);

    const pdf = await PDFDocument.load(bytes);
    const count = pdf.getPageCount();
    setPageCount(count);

    // Generate page previews
    const previews: PagePreview[] = [];
    for (let i = 0; i < count; i++) {
      previews.push({
        pageNum: i + 1,
        thumbnail: "",
        selected: false,
        rotation: 0,
      });
    }
    setPages(previews);

    // Generate thumbnails in batches
    setIsLoadingThumbnails(true);
    setThumbnailProgress(0);
    try {
      await generateThumbnailsBatched(
        bytes,
        count,
        4, // batch size
        80,
        110,
        (thumbs, completed, total) => {
          setThumbnails(new Map(thumbs));
          setThumbnailProgress(Math.round((completed / total) * 100));
        }
      );
    } catch (err) {
      console.error("Error generating thumbnails:", err);
    } finally {
      setIsLoadingThumbnails(false);
    }
  };

  // Rotate a single page
  const rotatePage = (pageNum: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering page selection
    setPages((prev) =>
      prev.map((p) =>
        p.pageNum === pageNum
          ? { ...p, rotation: getNextRotation(p.rotation) }
          : p
      )
    );
  };

  // Toggle page selection
  const togglePage = (pageNum: number) => {
    setPages((prev) =>
      prev.map((p) =>
        p.pageNum === pageNum ? { ...p, selected: !p.selected } : p
      )
    );
  };

  // Select all pages
  const selectAll = () => {
    setPages((prev) => prev.map((p) => ({ ...p, selected: true })));
  };

  // Deselect all pages
  const deselectAll = () => {
    setPages((prev) => prev.map((p) => ({ ...p, selected: false })));
  };

  // Parse range input
  const parseRanges = (input: string): number[][] => {
    const ranges: number[][] = [];
    const parts = input.split(",").map((s) => s.trim());

    for (const part of parts) {
      if (part.includes("-")) {
        const [start, end] = part.split("-").map((s) => parseInt(s.trim()));
        if (!isNaN(start) && !isNaN(end) && start <= end && start >= 1 && end <= pageCount) {
          ranges.push([start, end]);
        }
      } else {
        const num = parseInt(part);
        if (!isNaN(num) && num >= 1 && num <= pageCount) {
          ranges.push([num, num]);
        }
      }
    }

    return ranges;
  };

  // Split PDF
  const splitPDF = async () => {
    if (!pdfBytes) return;

    setIsProcessing(true);
    try {
      const sourcePdf = await PDFDocument.load(pdfBytes);

      if (splitMode === "extract") {
        // Extract selected pages into one PDF
        const selectedPageInfos = pages.filter((p) => p.selected);
        if (selectedPageInfos.length === 0) {
          showToast("Please select at least one page", "warning");
          return;
        }

        const newPdf = await PDFDocument.create();
        const selectedIndices = selectedPageInfos.map((p) => p.pageNum - 1);
        const copiedPages = await newPdf.copyPages(sourcePdf, selectedIndices);

        copiedPages.forEach((page, idx) => {
          // Apply rotation if any
          const pageInfo = selectedPageInfos[idx];
          if (pageInfo.rotation !== 0) {
            const currentRotation = page.getRotation().angle;
            page.setRotation(degrees((currentRotation + pageInfo.rotation) % 360));
          }
          newPdf.addPage(page);
        });

        const newBytes = await newPdf.save();
        const blob = new Blob([new Uint8Array(newBytes)], { type: "application/pdf" });
        downloadBlob(blob, `${fileName}-extracted.pdf`);
      } else if (splitMode === "range") {
        // Split by ranges into multiple PDFs
        const ranges = parseRanges(rangeInput);
        if (ranges.length === 0) {
          showToast("Please enter valid page ranges (e.g., 1-3, 5, 7-9)", "warning");
          return;
        }

        const zip = new JSZip();

        for (let i = 0; i < ranges.length; i++) {
          const [start, end] = ranges[i];
          const pageIndices = Array.from({ length: end - start + 1 }, (_, j) => start - 1 + j);

          const newPdf = await PDFDocument.create();
          const copiedPages = await newPdf.copyPages(sourcePdf, pageIndices);

          copiedPages.forEach((page, idx) => {
            // Apply rotation if any
            const pageNum = pageIndices[idx];
            const pageInfo = pages[pageNum];
            if (pageInfo && pageInfo.rotation !== 0) {
              const currentRotation = page.getRotation().angle;
              page.setRotation(degrees((currentRotation + pageInfo.rotation) % 360));
            }
            newPdf.addPage(page);
          });

          const newBytes = await newPdf.save();
          zip.file(`${fileName}-part${i + 1}.pdf`, newBytes);
        }

        const zipBlob = await zip.generateAsync({ type: "blob" });
        downloadBlob(zipBlob, `${fileName}-split.zip`);
      } else if (splitMode === "each") {
        // Split each page into separate PDF
        const zip = new JSZip();

        for (let i = 0; i < pageCount; i++) {
          const newPdf = await PDFDocument.create();
          const [copiedPage] = await newPdf.copyPages(sourcePdf, [i]);

          // Apply rotation if any
          const pageInfo = pages[i];
          if (pageInfo && pageInfo.rotation !== 0) {
            const currentRotation = copiedPage.getRotation().angle;
            copiedPage.setRotation(degrees((currentRotation + pageInfo.rotation) % 360));
          }

          newPdf.addPage(copiedPage);

          const newBytes = await newPdf.save();
          zip.file(`${fileName}-page${i + 1}.pdf`, newBytes);
        }

        const zipBlob = await zip.generateAsync({ type: "blob" });
        downloadBlob(zipBlob, `${fileName}-pages.zip`);
      }
    } catch (error) {
      console.error("Error splitting PDF:", error);
      showToast("Failed to split PDF. Please try again.", "error");
    } finally {
      setIsProcessing(false);
    }
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
            <h1 className="text-3xl font-bold mb-4">Split PDF</h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              Extract pages or split your PDF into multiple files
            </p>
          </div>

          <label className="block cursor-pointer">
            <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl p-12 text-center hover:border-orange-400 transition-colors">
              <Upload className="w-12 h-12 mx-auto mb-4 text-zinc-400" />
              <p className="font-medium mb-2">Click to upload PDF</p>
              <p className="text-sm text-zinc-500">or drag and drop</p>
            </div>
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
        </main>
      </div>
    );
  }

  // Split screen
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
            <ArrowLeft className="w-4 h-4" />
            Back to Tools
          </Link>
          <span className="text-sm font-medium">{fileName}.pdf • {pageCount} pages</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Split mode selector */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
          <h3 className="font-semibold mb-4">Split Mode</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() => setSplitMode("extract")}
              className={`p-4 rounded-xl border-2 text-left transition-colors ${
                splitMode === "extract"
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                  : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
              }`}
            >
              <p className="font-medium mb-1">Extract Pages</p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Select specific pages to extract</p>
            </button>
            <button
              onClick={() => setSplitMode("range")}
              className={`p-4 rounded-xl border-2 text-left transition-colors ${
                splitMode === "range"
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                  : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
              }`}
            >
              <p className="font-medium mb-1">Split by Range</p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">e.g., 1-3, 4-6, 7-10</p>
            </button>
            <button
              onClick={() => setSplitMode("each")}
              className={`p-4 rounded-xl border-2 text-left transition-colors ${
                splitMode === "each"
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                  : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
              }`}
            >
              <p className="font-medium mb-1">Each Page</p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">One PDF per page</p>
            </button>
          </div>
        </div>

        {/* Extract mode: page selector */}
        {splitMode === "extract" && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Select Pages</h3>
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="text-sm text-indigo-600 hover:text-indigo-700"
                >
                  Select All
                </button>
                <span className="text-zinc-300">|</span>
                <button
                  onClick={deselectAll}
                  className="text-sm text-indigo-600 hover:text-indigo-700"
                >
                  Deselect All
                </button>
              </div>
            </div>
            {/* Thumbnail loading progress */}
            {isLoadingThumbnails && (
              <div className="mb-4 flex items-center gap-2 text-sm text-zinc-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating previews... {thumbnailProgress}%</span>
              </div>
            )}

            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {pages.map((page) => (
                <div
                  key={page.pageNum}
                  className={`group aspect-[3/4] rounded-lg border-2 flex items-center justify-center relative transition-colors cursor-pointer overflow-hidden ${
                    page.selected
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                      : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                  }`}
                  onClick={() => togglePage(page.pageNum)}
                >
                  {/* Thumbnail or placeholder */}
                  {thumbnails.get(page.pageNum - 1) ? (
                    <img
                      src={thumbnails.get(page.pageNum - 1)}
                      alt={`Page ${page.pageNum}`}
                      className="w-full h-full object-contain transition-transform"
                      style={{ transform: `rotate(${page.rotation}deg)` }}
                      draggable={false}
                    />
                  ) : (
                    <FileText
                      className="w-6 h-6 text-zinc-400 transition-transform"
                      style={{ transform: `rotate(${page.rotation}deg)` }}
                    />
                  )}
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-xs font-medium bg-white/80 dark:bg-zinc-900/80 px-1 rounded">
                    {page.pageNum}
                  </span>
                  {page.selected && (
                    <div className="absolute top-1 right-1 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                  {/* Rotate button */}
                  <button
                    onClick={(e) => rotatePage(page.pageNum, e)}
                    className="absolute top-1 left-1 w-5 h-5 bg-white/80 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
                    style={{ opacity: page.rotation !== 0 ? 1 : undefined }}
                    title="Rotate page"
                  >
                    <RotateCw className="w-3 h-3" />
                  </button>
                  {page.rotation !== 0 && (
                    <span className="absolute top-1 left-7 text-[10px] text-white bg-black/50 px-1 rounded font-medium">
                      {page.rotation}°
                    </span>
                  )}
                </div>
              ))}
            </div>
            <p className="text-sm text-zinc-500 mt-4">
              {pages.filter((p) => p.selected).length} pages selected
            </p>
          </div>
        )}

        {/* Range mode: input */}
        {splitMode === "range" && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
            <h3 className="font-semibold mb-4">Enter Page Ranges</h3>
            <input
              type="text"
              value={rangeInput}
              onChange={(e) => setRangeInput(e.target.value)}
              placeholder="e.g., 1-3, 4-6, 7-10"
              className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-sm text-zinc-500 mt-2">
              Total pages: {pageCount}. Each range will become a separate PDF file.
            </p>
          </div>
        )}

        {/* Each mode: info */}
        {splitMode === "each" && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
            <h3 className="font-semibold mb-2">Split Every Page</h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              This will create {pageCount} separate PDF files, one for each page.
              All files will be downloaded as a ZIP archive.
            </p>
          </div>
        )}

        {/* Split button */}
        <button
          onClick={splitPDF}
          disabled={isProcessing}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-400 text-white rounded-xl font-medium transition-colors"
        >
          {isProcessing ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              Split & Download
            </>
          )}
        </button>
      </main>
    </div>
  );
}
