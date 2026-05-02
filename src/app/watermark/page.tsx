"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import {
  ArrowLeft,
  Upload,
  Download,
  Type,
  Image as ImageIcon,
  Loader2,
  RotateCw,
} from "lucide-react";
import { downloadBlob, fileToBase64, base64ToArrayBuffer } from "@/lib/pdf-utils";
import { useToast } from "@/components/Toast";

type WatermarkType = "text" | "image";

interface WatermarkConfig {
  type: WatermarkType;
  text: string;
  fontSize: number;
  color: string;
  opacity: number;
  rotation: number;
  posX: number; // 0-100 percentage from left
  posY: number; // 0-100 percentage from top
  tiled: boolean;
  imageData?: string;
  imageDataProcessed?: string; // After background removal
  removeBackground: boolean;
  imageScale: number; // 10-100, percentage of page width
}

const WATERMARK_COLORS = [
  { name: "Gray", value: "#808080" },
  { name: "Black", value: "#000000" },
  { name: "Red", value: "#ff0000" },
  { name: "Orange", value: "#ff8c00" },
  { name: "Yellow", value: "#ffc107" },
  { name: "Green", value: "#008000" },
  { name: "Teal", value: "#008080" },
  { name: "Blue", value: "#0000ff" },
  { name: "Navy", value: "#000080" },
  { name: "Purple", value: "#800080" },
  { name: "Pink", value: "#e91e63" },
  { name: "Brown", value: "#795548" },
];

export default function WatermarkPage() {
  const { showToast } = useToast();
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [fileName, setFileName] = useState("document");
  const [isProcessing, setIsProcessing] = useState(false);
  const [config, setConfig] = useState<WatermarkConfig>({
    type: "text",
    text: "CONFIDENTIAL",
    fontSize: 48,
    color: "#808080",
    opacity: 0.3,
    rotation: -45,
    posX: 50,
    posY: 50,
    tiled: false,
    removeBackground: false,
    imageScale: 40,
  });
  const imageInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(1);
  const [isRotating, setIsRotating] = useState(false);
  const [pdfPageSize, setPdfPageSize] = useState<{ width: number; height: number }>({ width: 612, height: 792 });

  // Read actual PDF page dimensions when PDF is loaded
  useEffect(() => {
    const readPageSize = async () => {
      if (!pdfBytes) return;
      try {
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const firstPage = pdfDoc.getPages()[0];
        if (firstPage) {
          const { width, height } = firstPage.getSize();
          setPdfPageSize({ width, height });
        }
      } catch (err) {
        console.error("Error reading PDF page size:", err);
      }
    };
    readPageSize();
  }, [pdfBytes]);

  // Calculate preview scale based on container width vs actual PDF page width
  useEffect(() => {
    const updateScale = () => {
      if (previewRef.current) {
        const containerWidth = previewRef.current.offsetWidth;
        setPreviewScale(containerWidth / pdfPageSize.width);
      }
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [pdfBytes, pdfPageSize]);

  // Handle rotation via mouse drag
  const handleRotationMove = (e: React.MouseEvent | MouseEvent) => {
    if (!isRotating || !previewRef.current || config.tiled) return;

    const rect = previewRef.current.getBoundingClientRect();
    // Calculate center point of watermark in pixels
    const centerX = rect.left + (config.posX / 100) * rect.width;
    const centerY = rect.top + (config.posY / 100) * rect.height;

    // Calculate angle from center to mouse position
    const deltaX = e.clientX - centerX;
    const deltaY = e.clientY - centerY;
    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

    // Adjust angle (atan2 gives 0 at right, we want 0 at top)
    const adjustedAngle = Math.round(angle + 90);
    setConfig((c) => ({ ...c, rotation: adjustedAngle }));
  };

  // Add global mouse listeners for rotation
  useEffect(() => {
    if (isRotating) {
      const handleMouseMove = (e: MouseEvent) => handleRotationMove(e);
      const handleMouseUp = () => setIsRotating(false);

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);

      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isRotating, config.posX, config.posY]);

  // Handle PDF upload
  const handlePDFUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name.replace(".pdf", ""));
    const arrayBuffer = await file.arrayBuffer();
    setPdfBytes(new Uint8Array(arrayBuffer));
  };

  // Handle image upload for watermark
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToBase64(file);
    setConfig((c) => ({ ...c, imageData: dataUrl, type: "image" }));
  };

  // Parse hex color to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16) / 255,
          g: parseInt(result[2], 16) / 255,
          b: parseInt(result[3], 16) / 255,
        }
      : { r: 0.5, g: 0.5, b: 0.5 };
  };

  // Remove background from image (detects background color from corners and removes it)
  const removeImageBackground = async (imageDataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const width = canvas.width;
        const height = canvas.height;

        // Sample corners to detect background color
        const getPixel = (x: number, y: number) => {
          const i = (y * width + x) * 4;
          return { r: data[i], g: data[i + 1], b: data[i + 2] };
        };

        // Get colors from corners
        const corners = [
          getPixel(0, 0),
          getPixel(width - 1, 0),
          getPixel(0, height - 1),
          getPixel(width - 1, height - 1),
        ];

        // Average the corner colors to get background color
        const bgColor = {
          r: Math.round(corners.reduce((s, c) => s + c.r, 0) / 4),
          g: Math.round(corners.reduce((s, c) => s + c.g, 0) / 4),
          b: Math.round(corners.reduce((s, c) => s + c.b, 0) / 4),
        };

        // Remove pixels similar to background color
        const tolerance = 30; // Color difference tolerance
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Check if pixel is similar to background
          const diff = Math.abs(r - bgColor.r) + Math.abs(g - bgColor.g) + Math.abs(b - bgColor.b);
          if (diff < tolerance * 3) {
            data[i + 3] = 0; // Set alpha to 0
          }
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.src = imageDataUrl;
    });
  };

  // Process image when background removal is toggled
  useEffect(() => {
    const processImage = async () => {
      if (config.imageData && config.removeBackground) {
        const processed = await removeImageBackground(config.imageData);
        setConfig((c) => ({ ...c, imageDataProcessed: processed }));
      } else if (config.imageData) {
        setConfig((c) => ({ ...c, imageDataProcessed: undefined }));
      }
    };
    processImage();
  }, [config.imageData, config.removeBackground]);

  // Get the image to use (processed or original)
  const getActiveImageData = () => {
    if (config.removeBackground && config.imageDataProcessed) {
      return config.imageDataProcessed;
    }
    return config.imageData;
  };

  // Apply watermark
  const applyWatermark = async () => {
    if (!pdfBytes) return;
    setIsProcessing(true);

    try {
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      for (const page of pages) {
        const { width, height } = page.getSize();

        if (config.type === "text") {
          const color = hexToRgb(config.color);
          const textWidth = font.widthOfTextAtSize(config.text, config.fontSize);
          const textHeight = config.fontSize;

          if (config.tiled) {
            // Tiled watermark - repeat across the page
            const spacingX = textWidth + 100;
            const spacingY = textHeight + 80;

            for (let py = -height; py < height * 2; py += spacingY) {
              for (let px = -width; px < width * 2; px += spacingX) {
                page.drawText(config.text, {
                  x: px,
                  y: py,
                  size: config.fontSize,
                  font,
                  color: rgb(color.r, color.g, color.b),
                  opacity: config.opacity,
                  rotate: degrees(-config.rotation),
                });
              }
            }
          } else {
            // Single watermark at custom position (posX, posY are percentages)
            // Convert percentage to PDF coordinates
            // Note: PDF y-axis is from bottom, CSS is from top
            const radians = (-config.rotation * Math.PI) / 180;
            const cos = Math.cos(radians);
            const sin = Math.sin(radians);

            // Target center point based on percentage
            const targetX = (config.posX / 100) * width;
            const targetY = (1 - config.posY / 100) * height; // Flip Y axis

            // Adjust for text size and rotation to center the text at target point
            const x = targetX - (textWidth / 2) * cos + (textHeight / 2) * sin;
            const y = targetY - (textWidth / 2) * sin - (textHeight / 2) * cos;

            page.drawText(config.text, {
              x,
              y,
              size: config.fontSize,
              font,
              color: rgb(color.r, color.g, color.b),
              opacity: config.opacity,
              rotate: degrees(-config.rotation),
            });
          }
        } else if (config.type === "image" && config.imageData) {
          // Image watermark - use processed image if background removal is enabled
          const activeImageData = getActiveImageData();
          if (!activeImageData) continue;

          let image;
          // Always use PNG if background was removed (transparency support)
          if (activeImageData.includes("image/png") || config.removeBackground) {
            const base64Data = activeImageData.split(",")[1];
            image = await pdfDoc.embedPng(base64ToArrayBuffer(base64Data));
          } else {
            const base64Data = activeImageData.split(",")[1];
            image = await pdfDoc.embedJpg(base64ToArrayBuffer(base64Data));
          }

          const imgDims = image.scale(1);
          const imageWidth = width * (config.imageScale / 100);
          const imageHeight = (imgDims.height / imgDims.width) * imageWidth;
          const rotationRadians = (-config.rotation * Math.PI) / 180;

          if (config.tiled) {
            const spacingX = imageWidth + 100;
            const spacingY = imageHeight + 80;

            for (let py = -height; py < height * 2; py += spacingY) {
              for (let px = -width; px < width * 2; px += spacingX) {
                page.drawImage(image, {
                  x: px,
                  y: py,
                  width: imageWidth,
                  height: imageHeight,
                  opacity: config.opacity,
                  rotate: degrees(-config.rotation),
                });
              }
            }
          } else {
            // Single image at custom position
            const cos = Math.cos(rotationRadians);
            const sin = Math.sin(rotationRadians);

            // Target center point based on percentage
            const targetX = (config.posX / 100) * width;
            const targetY = (1 - config.posY / 100) * height; // Flip Y axis

            // Adjust for image size and rotation to center the image at target point
            const x = targetX - (imageWidth / 2) * cos + (imageHeight / 2) * sin;
            const y = targetY - (imageWidth / 2) * sin - (imageHeight / 2) * cos;

            page.drawImage(image, {
              x,
              y,
              width: imageWidth,
              height: imageHeight,
              opacity: config.opacity,
              rotate: degrees(-config.rotation),
            });
          }
        }
      }

      const modifiedBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(modifiedBytes)], { type: "application/pdf" });
      downloadBlob(blob, `${fileName}-watermarked.pdf`);
    } catch (err) {
      console.error("Error applying watermark:", err);
      showToast("Failed to apply watermark. Please try again.", "error");
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
            <h1 className="text-3xl font-bold mb-4">Add Watermark</h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              Add text or image watermarks to your PDF
            </p>
          </div>

          <label className="block cursor-pointer">
            <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl p-12 text-center hover:border-orange-400 transition-colors">
              <Upload className="w-12 h-12 mx-auto mb-4 text-zinc-400" />
              <p className="font-medium mb-2">Click to upload PDF</p>
              <p className="text-sm text-zinc-500">or drag and drop</p>
            </div>
            <input type="file" accept=".pdf" className="hidden" onChange={handlePDFUpload} />
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
          <span className="text-sm font-medium">{fileName}.pdf</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Watermark Type */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
          <h3 className="font-semibold mb-4">Watermark Type</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setConfig((c) => ({ ...c, type: "text" }))}
              className={`p-4 rounded-xl border-2 text-left transition-colors ${
                config.type === "text"
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                  : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Type className="w-5 h-5" />
                <p className="font-medium">Text</p>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Add text watermark</p>
            </button>
            <button
              onClick={() => { setConfig((c) => ({ ...c, type: "image" })); imageInputRef.current?.click(); }}
              className={`p-4 rounded-xl border-2 text-left transition-colors ${
                config.type === "image"
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                  : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <ImageIcon className="w-5 h-5" />
                <p className="font-medium">Image</p>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Add logo or image</p>
            </button>
          </div>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
        </div>

        {/* Text Settings */}
        {config.type === "text" && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
            <h3 className="font-semibold mb-4">Text Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Watermark Text</label>
                <input
                  type="text"
                  value={config.text}
                  onChange={(e) => setConfig((c) => ({ ...c, text: e.target.value }))}
                  placeholder="Enter watermark text..."
                  className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Font Size: {config.fontSize}px</label>
                  <input
                    type="range"
                    min="12"
                    max="120"
                    value={config.fontSize}
                    onChange={(e) => setConfig((c) => ({ ...c, fontSize: Number(e.target.value) }))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Rotation: {config.rotation}°</label>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    value={config.rotation}
                    onChange={(e) => setConfig((c) => ({ ...c, rotation: Number(e.target.value) }))}
                    className="w-full"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Color</label>
                <div className="flex gap-2">
                  {WATERMARK_COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setConfig((cfg) => ({ ...cfg, color: c.value }))}
                      className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                        config.color === c.value ? "border-indigo-500 ring-2 ring-indigo-300" : "border-zinc-300"
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Image Settings */}
        {config.type === "image" && config.imageData && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
            <h3 className="font-semibold mb-4">Image Settings</h3>
            <div className="space-y-4">
              {/* Image Preview & Change */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img
                    src={getActiveImageData()}
                    alt="Watermark"
                    className="w-24 h-24 object-contain rounded-lg"
                    style={{
                      backgroundColor: config.removeBackground ? "repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 50% / 16px 16px" : undefined,
                    }}
                  />
                </div>
                <button
                  onClick={() => imageInputRef.current?.click()}
                  className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl font-medium"
                >
                  Change Image
                </button>
              </div>

              {/* Size */}
              <div>
                <label className="block text-sm font-medium mb-2">Size: {config.imageScale}% of page width</label>
                <input
                  type="range"
                  min="10"
                  max="80"
                  step="5"
                  value={config.imageScale}
                  onChange={(e) => setConfig((c) => ({ ...c, imageScale: Number(e.target.value) }))}
                  className="w-full"
                />
              </div>

              {/* Rotation */}
              <div>
                <label className="block text-sm font-medium mb-2">Rotation: {config.rotation}°</label>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  value={config.rotation}
                  onChange={(e) => setConfig((c) => ({ ...c, rotation: Number(e.target.value) }))}
                  className="w-full"
                />
              </div>

              {/* Background Removal */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.removeBackground}
                  onChange={(e) => setConfig((c) => ({ ...c, removeBackground: e.target.checked }))}
                  className="w-5 h-5 rounded border-zinc-300 text-indigo-500 focus:ring-indigo-500"
                />
                <span className="font-medium">Remove Background</span>
              </label>
            </div>
          </div>
        )}

        {/* Common Settings */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
          <h3 className="font-semibold mb-4">Options</h3>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.tiled}
                onChange={(e) => setConfig((c) => ({ ...c, tiled: e.target.checked }))}
                className="w-5 h-5 rounded border-zinc-300 text-indigo-500 focus:ring-indigo-500"
              />
              <span className="font-medium">Tiled (Repeat Pattern)</span>
            </label>
            <div>
              <label className="block text-sm font-medium mb-2">
                Opacity: {Math.round(config.opacity * 100)}%
              </label>
              <input
                type="range"
                min="0.05"
                max="1"
                step="0.05"
                value={config.opacity}
                onChange={(e) => setConfig((c) => ({ ...c, opacity: Number(e.target.value) }))}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
          <h3 className="font-semibold mb-4">
            Preview {!config.tiled && <span className="text-sm font-normal text-zinc-500">(Click to position)</span>}
          </h3>
          <div
            ref={previewRef}
            className={`relative w-full bg-white border border-zinc-200 rounded-lg overflow-hidden ${!config.tiled ? "cursor-crosshair" : ""}`}
            style={{ aspectRatio: `${pdfPageSize.width} / ${pdfPageSize.height}` }}
            onClick={(e) => {
              if (config.tiled) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const x = ((e.clientX - rect.left) / rect.width) * 100;
              const y = ((e.clientY - rect.top) / rect.height) * 100;
              setConfig((c) => ({ ...c, posX: Math.round(x), posY: Math.round(y) }));
            }}
          >
            {/* Text watermark - single */}
            {config.type === "text" && !config.tiled && (
              <div
                className="absolute pointer-events-none"
                style={{
                  left: `${config.posX}%`,
                  top: `${config.posY}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <span
                  className="font-bold whitespace-nowrap block"
                  style={{
                    color: config.color,
                    fontSize: config.fontSize * previewScale,
                    opacity: config.opacity,
                    transform: `rotate(${config.rotation}deg)`,
                  }}
                >
                  {config.text}
                </span>
                {/* Rotation handle */}
                <div
                  className="absolute left-1/2 bg-indigo-500 rounded-full w-7 h-7 flex items-center justify-center cursor-grab active:cursor-grabbing shadow-lg hover:bg-indigo-600 transition-colors z-10 pointer-events-auto"
                  style={{
                    top: "-32px",
                    transform: "translateX(-50%)",
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setIsRotating(true);
                  }}
                  title="Drag to rotate"
                >
                  <RotateCw className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
            )}
            {/* Text watermark - tiled */}
            {config.type === "text" && config.tiled && (
              <div className="absolute inset-0 overflow-hidden">
                <div
                  className="absolute flex flex-wrap content-start p-4"
                  style={{
                    opacity: config.opacity,
                    transform: `rotate(${config.rotation}deg)`,
                    transformOrigin: "center center",
                    width: "200%",
                    height: "200%",
                    left: "-50%",
                    top: "-50%",
                    gap: `${80 * previewScale}px ${100 * previewScale}px`,
                  }}
                >
                  {Array.from({ length: 50 }).map((_, i) => (
                    <span
                      key={i}
                      className="font-bold whitespace-nowrap"
                      style={{
                        color: config.color,
                        fontSize: config.fontSize * previewScale,
                      }}
                    >
                      {config.text}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {/* Image watermark - single */}
            {config.type === "image" && config.imageData && !config.tiled && (
              <>
                <img
                  src={getActiveImageData()}
                  alt="Preview"
                  className="absolute pointer-events-none"
                  style={{
                    width: `${config.imageScale}%`,
                    opacity: config.opacity,
                    left: `${config.posX}%`,
                    top: `${config.posY}%`,
                    transform: `translate(-50%, -50%) rotate(${config.rotation}deg)`,
                  }}
                />
                {/* Rotation handle */}
                <div
                  className="absolute w-7 h-7 bg-indigo-500 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing shadow-lg hover:bg-indigo-600 transition-colors z-10"
                  style={{
                    left: `${config.posX}%`,
                    top: `${config.posY}%`,
                    transform: "translate(-50%, -50%) translateY(-40px)",
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setIsRotating(true);
                  }}
                  title="Drag to rotate"
                >
                  <RotateCw className="w-3.5 h-3.5 text-white" />
                </div>
              </>
            )}
            {/* Image watermark - tiled */}
            {config.type === "image" && config.imageData && config.tiled && (
              <div className="absolute inset-0 overflow-hidden">
                <div
                  className="absolute grid"
                  style={{
                    opacity: config.opacity,
                    transform: `rotate(${config.rotation}deg)`,
                    transformOrigin: "center center",
                    width: "200%",
                    height: "200%",
                    left: "-50%",
                    top: "-50%",
                    gridTemplateColumns: `repeat(auto-fill, ${pdfPageSize.width * (config.imageScale / 100) * previewScale}px)`,
                    gap: `${80 * previewScale}px ${100 * previewScale}px`,
                  }}
                >
                  {Array.from({ length: 36 }).map((_, i) => (
                    <img
                      key={i}
                      src={getActiveImageData()}
                      alt=""
                      className="object-contain"
                      style={{
                        width: `${pdfPageSize.width * (config.imageScale / 100) * previewScale}px`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
            {/* Empty state messages */}
            <div className="absolute inset-0 flex items-center justify-center text-zinc-300 text-sm pointer-events-none">
              {!config.text && config.type === "text" && "Enter watermark text above"}
              {config.type === "image" && !config.imageData && "Select an image"}
            </div>
          </div>
        </div>

        {/* Apply Button */}
        <button
          onClick={applyWatermark}
          disabled={isProcessing || (config.type === "text" && !config.text) || (config.type === "image" && !config.imageData)}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-400 text-white rounded-xl font-medium transition-colors"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Applying Watermark...
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              Apply Watermark & Download
            </>
          )}
        </button>
      </main>
    </div>
  );
}
