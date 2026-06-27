// Job: outreach — for each enriched lead, fire email + postcard TOGETHER
// (no wait gate between them). Both use the same trackingId.

import { config } from "@/lib/config";
import { getIcp } from "@/lib/icpStore";
import { SEED_LEADS } from "@/lib/seed";
import * as store from "@/lib/store";
import * as gemini from "@/lib/clients/geminiClient";
import * as resend from "@/lib/clients/resendClient";
import * as lob from "@/lib/clients/lobClient";
import type { Lead } from "@/lib/types";

export interface OutreachSummary {
  sent: number;
  leads: Pick<Lead, "name" | "company" | "trackingId" | "postcardProofUrl">[];
}

export async function runOutreach(): Promise<OutreachSummary> {
  const leads = await store.listByStage("enriched");
  const icp = getIcp();
  const summary: OutreachSummary = { sent: 0, leads: [] };

  await Promise.all(
    leads.map(async (lead) => {
      const signal = lead.enrichmentSignal ?? `${lead.company} is growing fast`;

      // Generate image prompt + image (cached by trackingId)
      const imgBrief = { company: lead.company, industry: icp.industries[0] ?? "software" };
      const { prompt: imgPrompt } = await gemini.imagePrompt(imgBrief);
      await gemini.generateImage(imgPrompt, lead.trackingId);
      const imageUrl = `${config.baseUrl}/api/assets/${lead.trackingId}`;

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
            icp,
          });
          const result = await resend.sendEmail({ to: lead.email, subject, html });
          console.log(`[outreach] email sent to ${lead.email} id=${result.id}`);
          return result;
        })(),

        // (b) Postcard
        (async () => {
          const { personalLine, body, cta } = await gemini.writePostcardCopy({
            name: lead.name,
            company: lead.company,
            signal,
          });

          // Find seed address if available
          const seedRecord = SEED_LEADS.find((s) => s.name === lead.name);
          const toAddress: lob.PostcardAddress = seedRecord?.address ?? {
            name: lead.name,
            address_line1: "123 Market St",
            address_city: "San Francisco",
            address_state: "CA",
            address_zip: "94105",
            address_country: "US",
          };

          const { proofUrl } = await lob.sendPostcard({
            to: toAddress,
            trackingId: lead.trackingId,
            personalLine,
            body,
            cta,
            imageUrl,
          });
          console.log(`[outreach] postcard sent for ${lead.name} proof=${proofUrl}`);
          return { proofUrl };
        })(),
      ]);

      const proofUrl =
        postcardResult.status === "fulfilled" ? postcardResult.value.proofUrl : undefined;

      await store.updateLead(lead.attioRecordId, {
        sequenceStage: "outreach_sent",
        dealStage: "Contacted",
        mailStatus: "sent",
        postcardProofUrl: proofUrl,
      });
      await store.addNote(
        lead.attioRecordId,
        `Outreach dispatched — email ${emailResult.status === "fulfilled" ? "sent" : "failed"}; postcard proof: ${proofUrl ?? "pending"}`
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
