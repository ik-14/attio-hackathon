import { config } from "@/lib/config";
import { resolveBrandKit } from "@/lib/postcard/brandKit";
import type { Lead, Icp } from "@/lib/types";
import type { MailInput } from "@/lib/postcard/types";

export function leadToMailInput(lead: Lead, icp: Icp): MailInput {
  const parts = lead.name.trim().split(/\s+/);
  const first_name = parts[0] ?? lead.name;
  const last_name = parts.slice(1).join(" ");
  const industry = lead.industry ?? icp.industries[0] ?? "software";

  return {
    prospect: {
      first_name,
      last_name,
      title: lead.title ?? "",
      company: lead.company,
      company_domain: lead.companyDomain ?? `${lead.company.toLowerCase().replace(/\s+/g, "")}.com`,
      industry,
      email: lead.email ?? "",
      postal_address: lead.postalAddress ?? {
        line1: "123 Market St",
        city: "San Francisco",
        state: "CA",
        postcode: "94105",
        country: "US",
      },
    },
    enrichment: [{ signal: lead.enrichmentSignal ?? `${lead.company} is a strong ICP match`, source_url: "" }],
    brand_kit: resolveBrandKit(undefined, industry),
    tracking_id: lead.trackingId,
    booking_url: `${config.baseUrl}/r/${lead.trackingId}`,
    attio_record_id: lead.attioRecordId,
  };
}
