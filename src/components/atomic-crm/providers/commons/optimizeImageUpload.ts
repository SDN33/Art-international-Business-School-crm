const OPTIMIZABLE_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

type OptimizeImageUploadOptions = {
  maxDimension?: number;
  quality?: number;
  outputType?: "image/jpeg" | "image/webp";
};

const DEFAULT_OPTIONS: Required<OptimizeImageUploadOptions> = {
  maxDimension: 1600,
  quality: 0.82,
  outputType: "image/webp",
};

export const shouldOptimizeImageUpload = (file: File | Blob) =>
  OPTIMIZABLE_IMAGE_TYPES.has(file.type);

export const optimizeImageUpload = async (
  file: File,
  options?: OptimizeImageUploadOptions,
): Promise<File> => {
  if (!shouldOptimizeImageUpload(file)) {
    return file;
  }

  const { maxDimension, quality, outputType } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const image = await loadImage(file);
  const { width, height } = getTargetDimensions(
    image.naturalWidth,
    image.naturalHeight,
    maxDimension,
  );

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    return file;
  }

  context.drawImage(image, 0, 0, width, height);

  const blob = await canvasToBlob(canvas, outputType, quality);
  if (!blob) {
    return file;
  }

  const optimizedFile = new File(
    [blob],
    replaceExtension(file.name, extensionForMimeType(blob.type)),
    {
      type: blob.type,
      lastModified: file.lastModified,
    },
  );

  if (
    optimizedFile.size >= file.size * 0.95 &&
    width === image.naturalWidth &&
    height === image.naturalHeight
  ) {
    return file;
  }

  return optimizedFile;
};

const loadImage = async (file: File) =>
  await new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image for optimization"));
    };

    image.src = objectUrl;
  });

const getTargetDimensions = (
  width: number,
  height: number,
  maxDimension: number,
) => {
  const largestDimension = Math.max(width, height);

  if (largestDimension <= maxDimension) {
    return { width, height };
  }

  const scale = maxDimension / largestDimension;

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

const canvasToBlob = async (
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
) =>
  await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });

const extensionForMimeType = (mimeType: string) => {
  if (mimeType === "image/jpeg") {
    return "jpg";
  }

  return "webp";
};

const replaceExtension = (fileName: string, extension: string) => {
  const baseName = fileName.replace(/\.[^.]+$/, "");
  return `${baseName}.${extension}`;
};
