// Job: stale-check — outreach_sent leads idle ≥ config.mailWaitDays
// flip to "needs_review" and deal stage "Needs Review".

import { config } from "@/lib/config";
import * as store from "@/lib/store";
import type { Lead } from "@/lib/types";

export interface StaleCheckSummary {
  flagged: number;
  leads: Pick<Lead, "name" | "company" | "lastTouchAt">[];
}

function daysIdle(lastTouchAt: string | null): number {
  if (!lastTouchAt) return Infinity;
  return (Date.now() - new Date(lastTouchAt).getTime()) / 86_400_000;
}

export async function runStaleCheck(): Promise<StaleCheckSummary> {
  const leads = await store.listByStage("outreach_sent");
  const summary: StaleCheckSummary = { flagged: 0, leads: [] };

  for (const lead of leads) {
    const idle = daysIdle(lead.lastTouchAt);
    if (idle < config.mailWaitDays) continue;

    console.log(`[stale-check] ${lead.name} idle ${idle.toFixed(1)} days → needs_review`);

    await store.updateLead(lead.attioRecordId, {
      sequenceStage: "needs_review",
      dealStage: "Needs Review",
    });
    await store.addNote(
      lead.attioRecordId,
      `No engagement after ${config.mailWaitDays} days — flagged for human review`
    );

    summary.flagged++;
    summary.leads.push({ name: lead.name, company: lead.company, lastTouchAt: lead.lastTouchAt });
  }

  return summary;
}
