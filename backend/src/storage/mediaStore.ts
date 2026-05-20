import fs from "fs/promises";
import path from "path";

// DATA_DIR is the root data directory (e.g., /data in Fly.io container).
// Falls back to process.cwd() for local development.
const DATA_DIR = process.env.DATA_DIR ?? path.resolve(process.cwd());
const STORAGE_DIR = path.join(DATA_DIR, "storage");
const IMAGE_DIR = path.join(STORAGE_DIR, "images");
const AUDIO_DIR = path.join(STORAGE_DIR, "audio");

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

/**
 * Extract base64 data from a data URL string.
 * Handles formats like: data:image/jpeg;base64,/9j/4AAQ...
 */
function extractBase64(dataUrl: string): string {
  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex === -1) {
    // Not a data URL, treat the entire string as base64
    return dataUrl;
  }
  return dataUrl.substring(commaIndex + 1);
}

/**
 * Determine file extension from a data URL prefix.
 * e.g., "data:image/jpeg;base64,..." -> ".jpg"
 */
function getExtensionFromDataUrl(dataUrl: string): string {
  const match = dataUrl.match(/^data:([^;]+)/);
  if (!match) return ".bin";
  const mimeType = match[1];
  const extMap: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "audio/mpeg": ".mp3",
    "audio/mp3": ".mp3",
    "audio/wav": ".wav",
    "audio/ogg": ".ogg",
  };
  return extMap[mimeType] ?? ".bin";
}

/**
 * Save an image from base64 or data URL.
 * Returns the URL path like /media/images/
 */
export async function saveImage(base64Data: string, filename: string): Promise<string> {
  await ensureDir(IMAGE_DIR);
  const base64 = extractBase64(base64Data);
  const buffer = Buffer.from(base64, "base64");
  const filePath = path.join(IMAGE_DIR, filename);
  await fs.writeFile(filePath, buffer);
  return `/media/images/${filename}`;
}

/**
 * Save audio from base64 or data URL.
 * Returns the URL path like /media/audio/
 */
export async function saveAudio(base64Data: string, filename: string): Promise<string> {
  await ensureDir(AUDIO_DIR);
  const base64 = extractBase64(base64Data);
  const buffer = Buffer.from(base64, "base64");
  const filePath = path.join(AUDIO_DIR, filename);
  await fs.writeFile(filePath, buffer);
  return `/media/audio/${filename}`;
}

/**
 * Check if an image file exists.
 */
export async function imageExists(filename: string): Promise<boolean> {
  try {
    const filePath = path.join(IMAGE_DIR, filename);
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if an audio file exists.
 */
export async function audioExists(filename: string): Promise<boolean> {
  try {
    const filePath = path.join(AUDIO_DIR, filename);
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a unique filename for images.
 * Format: timestamp-random.jpg
 */
export function generateImageFilename(dataUrl?: string): string {
  const ext = dataUrl ? getExtensionFromDataUrl(dataUrl) : ".jpg";
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  return `${timestamp}-${random}${ext}`;
}

/**
 * Generate a unique filename for audio.
 * Format: timestamp-random.mp3
 */
export function generateAudioFilename(dataUrl?: string): string {
  const ext = dataUrl ? getExtensionFromDataUrl(dataUrl) : ".mp3";
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  return `${timestamp}-${random}${ext}`;
}