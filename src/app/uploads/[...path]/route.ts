import { readFile } from "node:fs/promises";
import path from "node:path";
import { LOCAL_UPLOAD_DIR } from "@/lib/storage";

const TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

// Serves locally stored photos in development (production uses Vercel Blob URLs).
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await params;
  const file = path.resolve(LOCAL_UPLOAD_DIR, ...parts);
  const type = TYPES[path.extname(file)];
  if (!file.startsWith(LOCAL_UPLOAD_DIR + path.sep) || !type) return new Response("Not found", { status: 404 });
  try {
    return new Response(await readFile(file), { headers: { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
