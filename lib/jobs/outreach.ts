// Job: outreach — for each enriched lead, fire email + postcard IN PARALLEL.
// Both use the same trackingId. The postcard is best-effort: a failure cannot
// break the email half or the stage update.

import { getIcp } from "@/lib/icpStore";
import * as store from "@/lib/store";
import * as gemini from "@/lib/clients/geminiClient";
import * as resend from "@/lib/clients/resendClient";
import { runPostcard } from "@/lib/postcard/run";
import { leadToMailInput } from "@/lib/postcard/adapter";
import type { Lead } from "@/lib/types";

export interface OutreachSummary {
  sent: number;
  leads: Pick<Lead, "name" | "company" | "trackingId" | "postcardProofUrl">[];
}

export async function runOutreach(leadId?: string): Promise<OutreachSummary> {
  const leads = leadId
    ? [await store.getLead(leadId)].filter(
        (l): l is Lead => !!l && l.sequenceStage === "enriched"
      )
    : await store.listByStage("enriched");
  const currentIcp = getIcp();
  const summary: OutreachSummary = { sent: 0, leads: [] };

  await Promise.all(
    leads.map(async (lead) => {
      const signal = lead.enrichmentSignal ?? `${lead.company} is growing fast`;

      // Run email and postcard in parallel
      const [emailResult, postcardResult] = await Promise.allSettled([
        // (a) Email
        (async () => {
          if (!lead.email) {
            console.log(`[outreach] ${lead.name} has no email — skipping email`);
            return { id: "no-email" };
          }
          const { subject, html } = await gemini.writeEmailCopy({
            name: lead.name,
            company: lead.company,
            signal,
            icp: currentIcp,
          });
          const result = await resend.sendEmail({ to: lead.email, subject, html });
          console.log(`[outreach] email sent to ${lead.email} id=${result.id}`);
          return result;
        })(),

        // (b) Postcard — best-effort; failure must not break email or stage update
        (async () => {
          try {
            const mailInput = leadToMailInput(lead, currentIcp);
            const result = await runPostcard(mailInput);
            console.log(`[outreach] postcard ${lead.name} status=${result.mailStatus} proofUrl=${result.proofUrl ?? "none"}`);
            return result;
          } catch (err) {
            console.warn(`[outreach] postcard failed for ${lead.name}:`, (err as Error).message);
            throw err;
          }
        })(),
      ]);

      // Determine stage from postcard result
      let nextStage: "outreach_sent" | "needs_review" = "outreach_sent";
      let proofUrl: string | undefined;
      let noteExtra = "";

      if (postcardResult.status === "fulfilled") {
        const pc = postcardResult.value;
        proofUrl = pc.proofUrl;
        if (pc.mailStatus === "needs_human") {
          nextStage = "needs_review";
          noteExtra = " Postcard held for human — failed pre-send check.";
        }
      } else {
        console.warn(`[outreach] postcard error for ${lead.name} — continuing with outreach_sent`);
      }

      await store.updateLead(lead.attioRecordId, {
        sequenceStage: nextStage,
        dealStage: nextStage === "outreach_sent" ? "Contacted" : "Needs Review",
        mailStatus: postcardResult.status === "fulfilled" ? postcardResult.value.mailStatus : "needs_human",
        postcardProofUrl: proofUrl,
      });
      await store.addNote(
        lead.attioRecordId,
        `Outreach dispatched — email ${emailResult.status === "fulfilled" ? "sent" : "failed"}; postcard proof: ${proofUrl ?? "pending"}.${noteExtra}`
      );

      summary.sent++;
      summary.leads.push({
        name: lead.name,
        company: lead.company,
        trackingId: lead.trackingId,
        postcardProofUrl: proofUrl,
      });
    })
  );

  return summary;
}
