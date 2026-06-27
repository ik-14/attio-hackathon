export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { CORS_HEADERS, options } from "@/lib/cors";
import { getPostcardImage } from "@/lib/postcard/run";

export function OPTIONS() {
  return options();
}

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const buf = getPostcardImage(id);
  if (!buf) {
    return new Response("not found", { status: 404, headers: CORS_HEADERS });
  }

  return new Response(new Uint8Array(buf), {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "image/png",
      "Content-Length": String(buf.length),
      "Cache-Control": "public, max-age=3600",
    },
  });
}
