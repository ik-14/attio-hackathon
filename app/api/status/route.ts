export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { json, options } from "@/lib/cors";
import * as store from "@/lib/store";
import type { PipelineStatus } from "@/lib/types";

export function OPTIONS() {
  return options();
}

export async function GET() {
  const [leadCounts, leads] = await Promise.all([
    store.counts(),
    store.listAll(),
  ]);

  const status: PipelineStatus = {
    counts: leadCounts,
    leads,
    updatedAt: new Date().toISOString(),
  };

  return json(status);
}
