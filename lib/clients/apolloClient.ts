// Apollo.io — ONLY the free organization enrichment endpoint.
// People-search is paid-only and will 403; do not add it.
// https://docs.apollo.io/reference/organization-enrichment

import axios from "axios";
import { config, has } from "@/lib/config";

export interface OrgInfo {
  name: string;
  domain: string;
  industry?: string;
  employeeCount?: number;
  description?: string;
}

export async function enrichOrg(domain: string): Promise<OrgInfo | null> {
  if (!has.apollo()) {
    console.log(`[apollo stub] enrichOrg(${domain})`);
    return null;
  }
  try {
    const response = await axios.get("https://api.apollo.io/v1/organizations/enrich", {
      params: { domain },
      headers: { "X-Api-Key": config.apolloApiKey },
    });
    const org = response.data?.organization;
    if (!org) return null;
    return {
      name: org.name ?? domain,
      domain,
      industry: org.industry,
      employeeCount: org.estimated_num_employees,
      description: org.short_description,
    };
  } catch (err) {
    console.warn(`[apollo] enrichOrg(${domain}) failed:`, (err as Error).message);
    return null;
  }
}
