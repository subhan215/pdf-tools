// PDF Thumbnail Generation Utilities

// Generate a thumbnail for a single PDF page
export async function generatePageThumbnail(
  pdfBytes: Uint8Array,
  pageIndex: number,
  maxWidth: number = 100,
  maxHeight: number = 140
): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.4.530/build/pdf.worker.min.mjs`;

  const pdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
  const page = await pdf.getPage(pageIndex + 1);

  const viewport = page.getViewport({ scale: 1 });
  const scale = Math.min(maxWidth / viewport.width, maxHeight / viewport.height);
  const scaledViewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = scaledViewport.width;
  canvas.height = scaledViewport.height;

  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({
    canvasContext: ctx,
    viewport: scaledViewport,
    canvas,
  }).promise;

  return canvas.toDataURL("image/jpeg", 0.7);
}

// Generate thumbnails for multiple pages with progress callback
export async function generatePageThumbnails(
  pdfBytes: Uint8Array,
  pageIndices: number[],
  maxWidth: number = 100,
  maxHeight: number = 140,
  onProgress?: (completed: number, total: number) => void
): Promise<Map<number, string>> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.4.530/build/pdf.worker.min.mjs`;

  const pdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
  const thumbnails = new Map<number, string>();

  for (let i = 0; i < pageIndices.length; i++) {
    const pageIndex = pageIndices[i];
    const page = await pdf.getPage(pageIndex + 1);

    const viewport = page.getViewport({ scale: 1 });
    const scale = Math.min(maxWidth / viewport.width, maxHeight / viewport.height);
    const scaledViewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;

    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      viewport: scaledViewport,
      canvas,
    }).promise;

    thumbnails.set(pageIndex, canvas.toDataURL("image/jpeg", 0.7));

    if (onProgress) {
      onProgress(i + 1, pageIndices.length);
    }
  }

  return thumbnails;
}

// Lazy load thumbnails in batches
export async function generateThumbnailsBatched(
  pdfBytes: Uint8Array,
  totalPages: number,
  batchSize: number = 5,
  maxWidth: number = 100,
  maxHeight: number = 140,
  onBatchComplete?: (thumbnails: Map<number, string>, completed: number, total: number) => void
): Promise<Map<number, string>> {
  const allThumbnails = new Map<number, string>();

  for (let start = 0; start < totalPages; start += batchSize) {
    const end = Math.min(start + batchSize, totalPages);
    const pageIndices = Array.from({ length: end - start }, (_, i) => start + i);

    const batchThumbnails = await generatePageThumbnails(
      pdfBytes,
      pageIndices,
      maxWidth,
      maxHeight
    );

    batchThumbnails.forEach((value, key) => {
      allThumbnails.set(key, value);
    });

    if (onBatchComplete) {
      onBatchComplete(allThumbnails, end, totalPages);
    }
  }

  return allThumbnails;
}
