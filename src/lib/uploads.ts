import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { randomToken } from "./crypto";

/** Persistent directory for user uploads (mount a volume here in production). */
export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? "./storage/uploads");
const MAX_BYTES = 4 * 1024 * 1024;
const MAX_PIXELS = 40_000_000; // decompression-bomb guard

function sniff(buf: Buffer): "jpeg" | "png" | "webp" | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  return null;
}

/**
 * Validates an uploaded image by its real bytes (not its name or MIME header),
 * then re-encodes it. Re-encoding strips metadata (EXIF/GPS) and any payload
 * hidden inside the original file. Returns the public URL.
 */
export async function saveProductImage(file: File): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const saved = await saveImage(file, "products");
  return saved.ok ? { ok: true, url: `/media/products/${saved.name}` } : saved;
}

/** Chat photos are private: they are served only through the access-checked chat media route. */
export async function saveChatImage(file: File) {
  return saveImage(file, "chat");
}

export const CHAT_IMAGE_NAME = /^[A-Za-z0-9_-]{16,64}\.webp$/;

/** Homepage banners are wide, so they keep more pixels than product photos. Returns the public URL. */
export async function saveBannerImage(file: File): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const saved = await saveImage(file, "banners", 2400);
  return saved.ok ? { ok: true, url: `/media/banners/${saved.name}` } : saved;
}

/** Uploaded banner URLs look like this; anything else (e.g. built-in /banners/*.jpg) is never deleted. */
export const UPLOADED_BANNER_URL = /^\/media\/banners\/([A-Za-z0-9_-]{16,64}\.webp)$/;

async function saveImage(file: File, folder: "products" | "chat" | "banners", maxSide = 1600): Promise<{ ok: true; name: string } | { ok: false; error: string }> {
  if (file.size === 0) return { ok: false, error: "فایل خالی است." };
  if (file.size > MAX_BYTES) return { ok: false, error: "حجم تصویر باید کمتر از ۴ مگابایت باشد." };
  const buf = Buffer.from(await file.arrayBuffer());
  if (!sniff(buf)) return { ok: false, error: "فقط تصاویر JPG، PNG یا WEBP مجاز است." };

  let out: Buffer;
  try {
    out = await sharp(buf, { limitInputPixels: MAX_PIXELS, failOn: "error" })
      .rotate()
      .resize(maxSide, maxSide, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    return { ok: false, error: "فایل تصویر معتبر نیست." };
  }

  const name = `${randomToken(16)}.webp`;
  const dir = path.join(UPLOAD_DIR, folder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), out, { flag: "wx" });
  return { ok: true, name };
}
