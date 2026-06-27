// Permissive CORS headers — cheap insurance for split-origin dev setups.
export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};

/** Wrap Response.json() with CORS headers. */
export function json(data: unknown, init?: ResponseInit): Response {
  return Response.json(data, {
    ...init,
    headers: { ...CORS_HEADERS, ...(init?.headers ?? {}) },
  });
}

/** Return a CORS pre-flight OK. */
export function options(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
