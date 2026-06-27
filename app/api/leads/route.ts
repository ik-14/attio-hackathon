export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { json, options } from "@/lib/cors";
import * as store from "@/lib/store";
import type { SequenceStage } from "@/lib/types";
import { SEQUENCE_STAGES } from "@/lib/types";

export function OPTIONS() {
  return options();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stage = searchParams.get("stage") as SequenceStage | null;

  if (stage && !SEQUENCE_STAGES.includes(stage)) {
    return json({ error: `unknown stage: ${stage}` }, { status: 400 });
  }

  const leads = stage
    ? await store.listByStage(stage)
    : await store.listAll();

  return json(leads);
}
