export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { json, options } from "@/lib/cors";
import { getIcp } from "@/lib/icpStore";

export function OPTIONS() {
  return options();
}

export function GET() {
  return json(getIcp());
}
