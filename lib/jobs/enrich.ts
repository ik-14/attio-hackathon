// Job: enrich — pull a "why now" web signal per discovered lead via Tavily,
// extract the key fact with Gemini, then advance stage to "enriched".

import * as store from "@/lib/store";
import * as tavily from "@/lib/clients/tavilyClient";
import * as gemini from "@/lib/clients/geminiClient";
import type { Lead } from "@/lib/types";

export interface EnrichSummary {
  enriched: number;
  leads: Pick<Lead, "name" | "company" | "enrichmentSignal">[];
}

export async function runEnrich(): Promise<EnrichSummary> {
  const leads = await store.listByStage("discovered");
  const summary: EnrichSummary = { enriched: 0, leads: [] };

  for (const lead of leads) {
    const rawText = await tavily.getWebSignal(lead.company);
    const { signal } = await gemini.extractFacts(rawText);
    console.log(`[enrich] ${lead.name} @ ${lead.company} → "${signal}"`);

    await store.updateLead(lead.attioRecordId, {
      enrichmentSignal: signal,
      sequenceStage: "enriched",
    });
    await store.addNote(lead.attioRecordId, `Enrichment signal: ${signal}`);

    summary.enriched++;
    summary.leads.push({ name: lead.name, company: lead.company, enrichmentSignal: signal });
  }

  return summary;
}
