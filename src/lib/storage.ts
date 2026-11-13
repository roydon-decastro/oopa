import "server-only";
import { put, del } from "@vercel/blob";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

export function validatePhoto(file: File): string | null {
  if (!ALLOWED.includes(file.type)) return `${file.name}: only JPG, PNG or WebP photos are allowed.`;
  if (file.size > MAX_BYTES) return `${file.name}: photos must be 5 MB or smaller.`;
  return null;
}

/** Uploads to Vercel Blob in production, or to ./.uploads (served by /uploads/...) when no Blob token is set. */
export const LOCAL_UPLOAD_DIR = path.join(process.cwd(), ".uploads");

export async function uploadPhoto(file: File, folder: string): Promise<string> {
  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const name = `${folder}/${randomUUID()}.${ext}`;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`properties/${name}`, file, { access: "public" });
    return blob.url;
  }
  const dest = path.join(LOCAL_UPLOAD_DIR, name);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, Buffer.from(await file.arrayBuffer()));
  return `/uploads/${name}`;
}

export async function deletePhoto(url: string) {
  if (url.startsWith("/uploads/")) {
    await unlink(path.join(LOCAL_UPLOAD_DIR, url.slice("/uploads/".length))).catch(() => {});
  } else if (process.env.BLOB_READ_WRITE_TOKEN) {
    await del(url).catch(() => {});
  }
}
