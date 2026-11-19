import { Logger } from "./utils/logger";

const log = new Logger("image-processor");

export function processImage(
  settings: { maxSize: number; quality: number; targetBytes: number },
  blob: Blob,
  callback: (compressedBlob: Blob | null) => void,
): void {
  log.debug("starting image processing...");
  const img = document.createElement("img");
  const url = URL.createObjectURL(blob);

  img.onload = () => {
    URL.revokeObjectURL(url);

    let width = img.width;
    let height = img.height;

    log.debug(`original dimensions: ${width}x${height}`);

    if (width > settings.maxSize || height > settings.maxSize) {
      if (width > height) {
        height = Math.round((height * settings.maxSize) / width);
        width = settings.maxSize;
      } else {
        width = Math.round((width * settings.maxSize) / height);
        height = settings.maxSize;
      }
      log.debug(`resized dimensions to fit max limit: ${width}x${height}`);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    let currentQuality = settings.quality;
    let attempts = 0;

    const tryCompress = (): void => {
      attempts++;
      canvas.toBlob(
        (resultBlob) => {
          if (!resultBlob) {
            log.error("canvas.toBlob failed to produce a blob.");
            callback(null);
            return;
          }

          log.debug(
            `attempt ${attempts}: Quality = ${currentQuality.toFixed(2)}, Size = ${(resultBlob.size / 1024).toFixed(2)} KB (Target: ${(settings.targetBytes / 1024).toFixed(2)} KB)`,
          );

          if (resultBlob.size > settings.targetBytes && currentQuality > 0.4) {
            currentQuality -= 0.1;
            tryCompress();
          } else {
            log.debug("compression completed successfully.");
            callback(resultBlob);
          }
        },
        "image/jpeg",
        currentQuality,
      );
    };

    tryCompress();
  };

  img.onerror = (err: any) => {
    URL.revokeObjectURL(url);
    callback(null);
    throw err;
  };

  img.src = url;
}
