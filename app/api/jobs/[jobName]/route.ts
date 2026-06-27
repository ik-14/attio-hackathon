export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { json, options } from "@/lib/cors";
import { runDiscover } from "@/lib/jobs/discover";
import { runEnrich } from "@/lib/jobs/enrich";
import { runOutreach } from "@/lib/jobs/outreach";
import { runStaleCheck } from "@/lib/jobs/staleCheck";

const JOBS = {
  discover: runDiscover,
  enrich: runEnrich,
  outreach: runOutreach,
  "stale-check": runStaleCheck,
} as const;

type JobName = keyof typeof JOBS;

export function OPTIONS() {
  return options();
}

export async function POST(
  _request: Request,
  ctx: { params: Promise<{ jobName: string }> }
) {
  const { jobName } = await ctx.params;

  if (!(jobName in JOBS)) {
    return json(
      { error: `Unknown job "${jobName}". Valid: ${Object.keys(JOBS).join(", ")}` },
      { status: 404 }
    );
  }

  try {
    const result = await JOBS[jobName as JobName]();
    return json({ ok: true, job: jobName, result });
  } catch (err) {
    console.error(`[job/${jobName}] error:`, err);
    return json({ ok: false, job: jobName, error: (err as Error).message }, { status: 500 });
  }
}
