import { readFile } from "node:fs/promises";
import path from "node:path";
import { UPLOAD_DIR } from "@/lib/uploads";

// Only our own generated file names are served: <folder>/<random>.webp
const SAFE = /^(products)\/[A-Za-z0-9_-]{16,64}\.webp$/;

export async function GET(_req: Request, ctx: RouteContext<"/media/[...path]">) {
  const rel = (await ctx.params).path.join("/");
  if (!SAFE.test(rel)) return new Response("Not found", { status: 404 });

  const full = path.join(UPLOAD_DIR, rel);
  // Defense in depth against path traversal.
  if (!full.startsWith(UPLOAD_DIR + path.sep)) return new Response("Not found", { status: 404 });

  try {
    const data = await readFile(full);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
