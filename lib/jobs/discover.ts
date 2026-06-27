// Job: discover — load seed leads, score against current ICP, createLead in store.
// Returns a summary object for the route handler to return as JSON.

import { randomUUID } from "crypto";
import { SEED_LEADS } from "@/lib/seed";
import { getIcp } from "@/lib/icpStore";
import * as gemini from "@/lib/clients/geminiClient";
import * as store from "@/lib/store";
import type { Lead } from "@/lib/types";

export interface DiscoverSummary {
  created: number;
  leads: Pick<Lead, "name" | "company" | "icpMatchScore" | "trackingId">[];
}

export async function runDiscover(): Promise<DiscoverSummary> {
  const icp = getIcp();
  const summary: DiscoverSummary = { created: 0, leads: [] };

  for (const seed of SEED_LEADS) {
    const trackingId = randomUUID();
    const { score, reason } = await gemini.scoreLead(
      { name: seed.name, company: seed.company, title: seed.title, industry: seed.industry },
      icp
    );
    console.log(`[discover] ${seed.name} @ ${seed.company} → score=${score} (${reason})`);

    const lead = await store.createLead({
      name: seed.name,
      company: seed.company,
      email: seed.email,
      source: "seed",
      icpMatchScore: score,
      trackingId,
      sequenceStage: "discovered",
      dealStage: "Lead",
      mailStatus: "ready_to_send",
    });

    summary.created++;
    summary.leads.push({
      name: lead.name,
      company: lead.company,
      icpMatchScore: lead.icpMatchScore,
      trackingId: lead.trackingId,
    });
  }

  return summary;
}
