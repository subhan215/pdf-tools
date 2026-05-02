"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { PDFDocument } from "pdf-lib";
import {
  ArrowLeft,
  Upload,
  Download,
  Trash2,
  GripVertical,
  Plus,
  FileText,
} from "lucide-react";
import { downloadBlob } from "@/lib/pdf-utils";
import { useToast } from "@/components/Toast";

interface PDFFile {
  id: string;
  name: string;
  size: number;
  bytes: Uint8Array;
}

export default function MergePage() {
  const { showToast } = useToast();
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    const newFiles: PDFFile[] = [];
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const arrayBuffer = await file.arrayBuffer();
      newFiles.push({
        id: `${Date.now()}-${i}`,
        name: file.name,
        size: file.size,
        bytes: new Uint8Array(arrayBuffer),
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

  // Drag and drop reordering
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newFiles = [...files];
    const draggedItem = newFiles[draggedIndex];
    newFiles.splice(draggedIndex, 1);
    newFiles.splice(index, 0, draggedItem);
    setFiles(newFiles);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Merge PDFs
  const mergePDFs = async () => {
    if (files.length < 2) return;

    setIsProcessing(true);
    try {
      const mergedPdf = await PDFDocument.create();

      for (const file of files) {
        const pdf = await PDFDocument.load(file.bytes);
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        pages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([new Uint8Array(mergedBytes)], { type: "application/pdf" });
      downloadBlob(blob, "merged.pdf");
    } catch (error) {
      console.error("Error merging PDFs:", error);
      showToast("Failed to merge PDFs. Please check your files and try again.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

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

      <main className="max-w-2xl mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">Merge PDFs</h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Combine multiple PDF files into one document
          </p>
        </div>

        {/* Upload area */}
        <label className="block cursor-pointer mb-6">
          <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl p-12 text-center hover:border-orange-400 transition-colors">
            <Upload className="w-12 h-12 mx-auto mb-4 text-zinc-400" />
            <p className="font-medium mb-2">Click to upload PDFs</p>
            <p className="text-sm text-zinc-500">or drag and drop</p>
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

        {/* File list */}
        {files.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden mb-6">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <span className="font-medium">{files.length} files</span>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
              >
                <Plus className="w-4 h-4" />
                Add more
              </button>
            </div>

            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {files.map((file, index) => (
                <div
                  key={file.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 p-4 ${
                    draggedIndex === index ? "bg-indigo-50 dark:bg-indigo-950/30" : ""
                  }`}
                >
                  <button className="cursor-grab active:cursor-grabbing text-zinc-400 hover:text-zinc-600">
                    <GripVertical className="w-5 h-5" />
                  </button>
                  <FileText className="w-8 h-8 text-red-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{file.name}</p>
                    <p className="text-sm text-zinc-500">{formatSize(file.size)}</p>
                  </div>
                  <button
                    onClick={() => removeFile(file.id)}
                    className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Merge button */}
        {files.length >= 2 && (
          <button
            onClick={mergePDFs}
            disabled={isProcessing}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-400 text-white rounded-xl font-medium transition-colors"
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Merging...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Merge & Download
              </>
            )}
          </button>
        )}

        {files.length === 1 && (
          <p className="text-center text-sm text-zinc-500">
            Add at least one more PDF to merge
          </p>
        )}
      </main>
    </div>
  );
}
