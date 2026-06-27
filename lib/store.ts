// Store abstraction — single async interface for all lead persistence.
// Primary: in-memory Map (module global; serverless cold-start resets are OK
//   for local `next dev` demo).
// When has.attio(): also fires side-effect syncs to Attio (best-effort).
// Jobs and routes NEVER call attioClient directly — they go through here.

import { randomUUID } from "crypto";
import { has } from "@/lib/config";
import type { Lead, SequenceStage, DealStage } from "@/lib/types";
import * as attio from "@/lib/clients/attioClient";

// ── In-memory store ───────────────────────────────────────────────────────────

const _leads = new Map<string, Lead>();
const _byTracking = new Map<string, string>(); // trackingId → attioRecordId

// ── Helpers ───────────────────────────────────────────────────────────────────

function now(): string {
  return new Date().toISOString();
}

function touch(lead: Lead): Lead {
  return { ...lead, lastTouchAt: now() };
}

// ── Public interface ──────────────────────────────────────────────────────────

export type CreateLeadInput = Omit<Lead, "attioRecordId" | "lastTouchAt">;

export async function createLead(input: CreateLeadInput): Promise<Lead> {
  // Attio side-effect (best-effort)
  let attioRecordId = `local-${randomUUID()}`;
  let dealRecordId: string | undefined;

  if (has.attio()) {
    // (1) Create person record
    try {
      attioRecordId = await attio.createPersonRecord({
        name: input.name,
        company: input.company,
        email: input.email,
        source: input.source,
        icpMatchScore: input.icpMatchScore,
        trackingId: input.trackingId,
      });
    } catch (err) {
      console.warn("[store] Attio createPersonRecord failed:", (err as Error).message);
    }

    // (2) Add activity note — independent of deal creation
    try {
      await attio.addActivityNote(
        attioRecordId,
        `Lead discovered by Strike agent. Score: ${input.icpMatchScore}. Source: ${input.source}.`
      );
    } catch (err) {
      console.warn("[store] Attio addActivityNote failed:", (err as Error).message);
    }

    // (3) Create deal + link — best-effort, failure does not block anything above
    try {
      dealRecordId = await attio.createDeal(
        `${input.name} — ${input.company}`,
        "Lead"
      );
      if (dealRecordId) {
        await attio.linkPersonToDeal(attioRecordId, dealRecordId).catch(() => null);
      }
    } catch (err) {
      console.warn("[store] Attio createDeal failed (best-effort):", (err as Error).message);
    }
  }

  const lead: Lead = {
    ...input,
    attioRecordId,
    dealRecordId,
    lastTouchAt: now(),
  };

  _leads.set(attioRecordId, lead);
  _byTracking.set(input.trackingId, attioRecordId);
  return lead;
}

export async function updateLead(id: string, patch: Partial<Lead>): Promise<Lead> {
  const existing = _leads.get(id);
  if (!existing) throw new Error(`Lead not found: ${id}`);

  const updated = touch({ ...existing, ...patch });
  _leads.set(id, updated);

  // Attio side-effects
  if (has.attio()) {
    try {
      if (patch.sequenceStage) {
        await attio.updateSequenceStage(id, patch.sequenceStage);
      }
      if (patch.dealStage && existing.dealRecordId) {
        await attio.patchDealStage(existing.dealRecordId, patch.dealStage);
      }
    } catch (err) {
      console.warn("[store] Attio updateLead side-effect failed:", (err as Error).message);
    }
  }

  return updated;
}

export async function addNote(id: string, note: string): Promise<void> {
  if (has.attio()) {
    try {
      await attio.addActivityNote(id, note);
    } catch (err) {
      console.warn("[store] Attio addNote failed:", (err as Error).message);
    }
  } else {
    console.log(`[store note] ${id}: ${note}`);
  }
}

export async function getLead(id: string): Promise<Lead | null> {
  return _leads.get(id) ?? null;
}

export async function getLeadByTrackingId(tid: string): Promise<Lead | null> {
  const id = _byTracking.get(tid);
  if (id) return _leads.get(id) ?? null;
  return null;
}

export async function listByStage(stage: SequenceStage): Promise<Lead[]> {
  return [..._leads.values()].filter((l) => l.sequenceStage === stage);
}

export async function listAll(): Promise<Lead[]> {
  return [..._leads.values()];
}

export async function counts(): Promise<Record<SequenceStage, number>> {
  const all = [..._leads.values()];
  return {
    discovered: all.filter((l) => l.sequenceStage === "discovered").length,
    enriched: all.filter((l) => l.sequenceStage === "enriched").length,
    outreach_sent: all.filter((l) => l.sequenceStage === "outreach_sent").length,
    engaged: all.filter((l) => l.sequenceStage === "engaged").length,
    needs_review: all.filter((l) => l.sequenceStage === "needs_review").length,
  };
}

// ── Convenience helpers used by route handlers ────────────────────────────────

export async function markEngaged(
  trackingId: string,
  dealStage: DealStage = "Meeting Booked"
): Promise<Lead | null> {
  const lead = await getLeadByTrackingId(trackingId);
  if (!lead) return null;
  await addNote(lead.attioRecordId, `Engagement recorded — deal stage → ${dealStage}`);
  return updateLead(lead.attioRecordId, { sequenceStage: "engaged", dealStage });
}
