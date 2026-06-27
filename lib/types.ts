// ── Strike shared types ── single source of truth for the FE↔BE contract.
// (BACKEND-PLAN §3). Additive-only: never rename a field without updating both
// the API routes (app/api/*) and the UI (app/*, components/*).

export type SequenceStage =
  | "discovered"
  | "enriched"
  | "outreach_sent" // email + postcard both dispatched in one step
  | "engaged"
  | "needs_review";

export type DealStage = "Lead" | "Contacted" | "Meeting Booked" | "Needs Review";

export type LeadSource = "seed" | "apollo" | "attio_lookalike";

export type MailStatus = "ready_to_send" | "needs_human" | "sent";

export interface Icp {
  titles: string[];
  industries: string[];
  headcount: [number, number]; // [min, max]
  raw?: string; // the user's original chat message
}

export interface Lead {
  attioRecordId: string;
  dealRecordId?: string;
  name: string;
  company: string;
  email?: string;
  source: LeadSource;
  icpMatchScore: number; // 0-100 (Gemini)
  enrichmentSignal?: string;
  trackingId: string;
  sequenceStage: SequenceStage;
  dealStage?: DealStage;
  mailStatus?: MailStatus;
  postcardProofUrl?: string; // Lob proof PDF, for FE to display
  lastTouchAt: string | null;
}

export interface PipelineStatus {
  counts: Record<SequenceStage, number>;
  leads: Lead[];
  updatedAt: string;
}

export interface ReviewItem {
  lead: Lead;
  brief: unknown;
  copy: unknown;
  imageUrl: string;
}

export const SEQUENCE_STAGES: SequenceStage[] = [
  "discovered",
  "enriched",
  "outreach_sent",
  "engaged",
  "needs_review",
];

// Stepper labels shown in the UI (needs_review is a side-state, not a step).
export const STEPPER_STAGES: { key: SequenceStage; label: string }[] = [
  { key: "discovered", label: "Discovered" },
  { key: "enriched", label: "Enriched" },
  { key: "outreach_sent", label: "Outreach" },
  { key: "engaged", label: "Engaged" },
];
