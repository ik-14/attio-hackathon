// Attio REST API v2 thin wrapper. All values are arrays per the Attio schema.
// Each public function checks has.attio() before making real network calls;
// stubs log what they WOULD do so the pipeline runs with zero keys.

import axios from "axios";
import { config, has } from "@/lib/config";
import type { Lead, SequenceStage, DealStage } from "@/lib/types";

const attio = axios.create({
  baseURL: "https://api.attio.com/v2",
  headers: {
    Authorization: `Bearer ${config.attioApiKey}`,
    "Content-Type": "application/json",
  },
});

// ── People records ────────────────────────────────────────────────────────────

export interface NewPersonInput {
  name: string;
  company: string;
  email?: string;
  source: Lead["source"];
  icpMatchScore: number;
  trackingId: string;
}

export async function createPersonRecord(lead: NewPersonInput): Promise<string> {
  if (!has.attio()) {
    console.log(`[attio stub] createPersonRecord for ${lead.name} — no key`);
    return `stub-person-${lead.trackingId}`;
  }
  const [firstName, ...rest] = lead.name.split(" ");
  const lastName = rest.join(" ") || "";
  try {
    const response = await attio.post("/objects/people/records", {
      data: {
        values: {
          name: [{ first_name: firstName, last_name: lastName, full_name: lead.name }],
          ...(lead.email ? { email_addresses: [{ email_address: lead.email }] } : {}),
          source: [{ option: lead.source }],
          icp_match_score: [{ value: lead.icpMatchScore }],
          tracking_id: [{ value: lead.trackingId }],
          // sequence_stage / last_touch_at are TEXT attrs in this workspace → write { value }
          sequence_stage: [{ value: "discovered" satisfies SequenceStage }],
        },
      },
    });
    return response.data.data.id.record_id as string;
  } catch (err) {
    // On uniqueness conflict, Attio returns the conflicting record ID in the message.
    // Extract it and return it so subsequent note writes can still succeed.
    if (axios.isAxiosError(err) && err.response?.data?.code === "uniqueness_conflict") {
      const msg: string = err.response.data.message ?? "";
      const ids = msg.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g);
      if (ids?.length) {
        const existingId = ids[ids.length - 1];
        console.log(`[attio] createPersonRecord: reusing existing record ${existingId} for ${lead.name}`);
        return existingId;
      }
    }
    throw err;
  }
}

export async function updateSequenceStage(
  recordId: string,
  stage: SequenceStage
): Promise<void> {
  if (!has.attio()) {
    console.log(`[attio stub] updateSequenceStage(${recordId}, ${stage})`);
    return;
  }
  await attio.patch(`/objects/people/records/${recordId}`, {
    data: {
      values: {
        sequence_stage: [{ value: stage }],
        last_touch_at: [{ value: new Date().toISOString() }],
      },
    },
  });
}

export async function addActivityNote(
  recordId: string,
  note: string
): Promise<void> {
  if (!has.attio()) {
    console.log(`[attio stub] addActivityNote(${recordId}): ${note}`);
    return;
  }
  // Fields live under `data`, NOT `data.values` — per API-SPEC §1
  await attio.post("/notes", {
    data: {
      parent_object: "people",
      parent_record_id: recordId,
      title: "Strike agent",
      content: note,
      format: "plaintext",
    },
  });
}

export async function listRecordsByStage(stage: SequenceStage): Promise<Lead[]> {
  if (!has.attio()) {
    console.log(`[attio stub] listRecordsByStage(${stage}) — returning []`);
    return [];
  }
  const response = await attio.post("/objects/people/records/query", {
    filter: {
      attribute: { slug: "sequence_stage" },
      condition: "equals",
      value: stage,
    },
  });
  // Map Attio records back to Lead shape — best-effort field extraction
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (response.data.data ?? []).map((r: any) => {
    const v = r.values ?? {};
    return {
      attioRecordId: r.id?.record_id ?? r.id,
      name: v.name?.[0]?.full_name ?? "",
      company: v.company?.[0]?.name ?? "",
      email: v.email_addresses?.[0]?.email_address,
      source: v.source?.[0]?.option ?? "seed",
      icpMatchScore: v.icp_match_score?.[0]?.value ?? 0,
      trackingId: v.tracking_id?.[0]?.value ?? "",
      sequenceStage: stage,
      lastTouchAt: v.last_touch_at?.[0]?.value ?? null,
    } as Lead;
  });
}

export async function findRecordByTrackingId(trackingId: string): Promise<Lead | null> {
  if (!has.attio()) {
    console.log(`[attio stub] findRecordByTrackingId(${trackingId}) — returning null`);
    return null;
  }
  const response = await attio.post("/objects/people/records/query", {
    filter: {
      attribute: { slug: "tracking_id" },
      condition: "equals",
      value: trackingId,
    },
  });
  const records = response.data.data ?? [];
  if (records.length === 0) return null;
  const r = records[0];
  const v = r.values ?? {};
  return {
    attioRecordId: r.id?.record_id ?? r.id,
    name: v.name?.[0]?.full_name ?? "",
    company: v.company?.[0]?.name ?? "",
    email: v.email_addresses?.[0]?.email_address,
    source: v.source?.[0]?.option ?? "seed",
    icpMatchScore: v.icp_match_score?.[0]?.value ?? 0,
    trackingId,
    sequenceStage: v.sequence_stage?.[0]?.value ?? "discovered",
    lastTouchAt: v.last_touch_at?.[0]?.value ?? null,
  } as Lead;
}

// ── Deals ─────────────────────────────────────────────────────────────────────

export async function createDeal(name: string, stage: DealStage): Promise<string> {
  if (!has.attio()) {
    console.log(`[attio stub] createDeal(${name}, ${stage})`);
    return `stub-deal-${Math.random().toString(36).slice(2, 10)}`;
  }
  const response = await attio.post("/objects/deals/records", {
    data: {
      values: {
        name: [{ value: name }],
        stage: [{ status: stage }],
      },
    },
  });
  return response.data.data.id.record_id as string;
}

export async function linkPersonToDeal(
  personRecordId: string,
  dealRecordId: string
): Promise<void> {
  if (!has.attio()) {
    console.log(`[attio stub] linkPersonToDeal(${personRecordId} → ${dealRecordId})`);
    return;
  }
  await attio.put(
    `/objects/deals/records/${dealRecordId}/associations/people`,
    { data: [{ record_id: personRecordId }] }
  );
}

export async function patchDealStage(dealRecordId: string, stage: DealStage): Promise<void> {
  if (!has.attio()) {
    console.log(`[attio stub] patchDealStage(${dealRecordId}, ${stage})`);
    return;
  }
  // Deal stage uses status array — per API-SPEC §1
  await attio.patch(`/objects/deals/records/${dealRecordId}`, {
    data: {
      values: {
        stage: [{ status: stage }],
      },
    },
  });
}
