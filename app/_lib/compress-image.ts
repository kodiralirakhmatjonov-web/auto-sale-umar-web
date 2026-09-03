export interface ImageCompressionResult {
  file: File;
  originalBytes: number;
  optimizedBytes: number;
  optimized: boolean;
}

interface ImageCompressionOptions {
  maxDimension?: number;
  quality?: number;
  minimumSavingsRatio?: number;
}

const DEFAULT_MAX_DIMENSION = 3840;
const DEFAULT_QUALITY = 0.9;
const DEFAULT_MINIMUM_SAVINGS_RATIO = 0.97;
const SKIP_TYPES = new Set(["image/gif", "image/svg+xml"]);

type DrawableImage = ImageBitmap | HTMLImageElement;

function replaceExtension(name: string, extension: string): string {
  const trimmed = name.trim() || "image";
  const lastDot = trimmed.lastIndexOf(".");
  const base = lastDot > 0 ? trimmed.slice(0, lastDot) : trimmed;
  return `${base}.${extension}`;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function decodeWithImageElement(file: File): Promise<{ image: HTMLImageElement; cleanup: () => void }> {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = "async";

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Image decode failed."));
      image.src = url;
    });
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }

  return {
    image,
    cleanup: () => URL.revokeObjectURL(url),
  };
}

async function decodeImage(file: File): Promise<{ image: DrawableImage; width: number; height: number; cleanup: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return {
        image: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => bitmap.close(),
      };
    } catch {
      // Safari/older browsers can reject particular formats/options. Use <img> as a safe fallback.
    }
  }

  const decoded = await decodeWithImageElement(file);
  return {
    image: decoded.image,
    width: decoded.image.naturalWidth,
    height: decoded.image.naturalHeight,
    cleanup: decoded.cleanup,
  };
}

export async function compressImageForUpload(
  file: File,
  options: ImageCompressionOptions = {},
): Promise<ImageCompressionResult> {
  const originalBytes = file.size;

  if (!file.type.startsWith("image/") || file.size <= 0 || SKIP_TYPES.has(file.type.toLowerCase())) {
    return { file, originalBytes, optimizedBytes: originalBytes, optimized: false };
  }

  const maxDimension = Math.max(1280, Math.round(options.maxDimension ?? DEFAULT_MAX_DIMENSION));
  const quality = Math.min(0.96, Math.max(0.78, options.quality ?? DEFAULT_QUALITY));
  const minimumSavingsRatio = Math.min(0.995, Math.max(0.75, options.minimumSavingsRatio ?? DEFAULT_MINIMUM_SAVINGS_RATIO));

  let decoded: Awaited<ReturnType<typeof decodeImage>> | null = null;

  try {
    decoded = await decodeImage(file);
    const sourceWidth = decoded.width;
    const sourceHeight = decoded.height;
    if (!sourceWidth || !sourceHeight) {
      return { file, originalBytes, optimizedBytes: originalBytes, optimized: false };
    }

    const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
    const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
    const targetHeight = Math.max(1, Math.round(sourceHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) {
      return { file, originalBytes, optimizedBytes: originalBytes, optimized: false };
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(decoded.image, 0, 0, targetWidth, targetHeight);

    const optimizedBlob = await canvasToBlob(canvas, "image/webp", quality);
    canvas.width = 1;
    canvas.height = 1;

    if (
      !optimizedBlob
      || optimizedBlob.type !== "image/webp"
      || optimizedBlob.size <= 0
      || optimizedBlob.size >= originalBytes * minimumSavingsRatio
    ) {
      return { file, originalBytes, optimizedBytes: originalBytes, optimized: false };
    }

    const optimizedFile = new File(
      [optimizedBlob],
      replaceExtension(file.name, "webp"),
      {
        type: "image/webp",
        lastModified: file.lastModified || Date.now(),
      },
    );

    return {
      file: optimizedFile,
      originalBytes,
      optimizedBytes: optimizedFile.size,
      optimized: true,
    };
  } catch (error) {
    console.warn("Image optimization skipped", error);
    return { file, originalBytes, optimizedBytes: originalBytes, optimized: false };
  } finally {
    decoded?.cleanup();
  }
}
