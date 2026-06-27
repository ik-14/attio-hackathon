import type { Icp, Lead, PipelineStatus } from "./types";

export const FIXTURE_ICP: Icp = {
  titles: ["VP Engineering", "Head of Sales"],
  industries: ["Software", "FinTech"],
  headcount: [51, 200],
  raw: "Target VP Engineering and Head of Sales at Series B software/fintech companies with 51–200 employees",
};

export const FIXTURE_LEADS: Lead[] = [
  {
    attioRecordId: "att_001",
    dealRecordId: "deal_001",
    name: "Maya Chen",
    company: "Nova Robotics",
    email: "maya@novarobotics.io",
    source: "apollo",
    icpMatchScore: 92,
    enrichmentSignal:
      "Nova Robotics closed a $6M seed round and is opening a Shoreditch office",
    trackingId: "trk_001",
    sequenceStage: "engaged",
    dealStage: "Meeting Booked",
    mailStatus: "sent",
    lastTouchAt: "2024-01-18T15:43:00Z",
  },
  {
    attioRecordId: "att_002",
    dealRecordId: "deal_002",
    name: "Daniel Ortiz",
    company: "Brightline Logistics",
    source: "attio_lookalike",
    icpMatchScore: 87,
    enrichmentSignal:
      "Brightline Logistics is hiring 12 ops roles this quarter",
    trackingId: "trk_002",
    sequenceStage: "outreach_sent",
    dealStage: "Contacted",
    mailStatus: "sent",
    lastTouchAt: "2024-01-16T08:10:00Z",
  },
  {
    attioRecordId: "att_003",
    name: "Priya Shah",
    company: "Fernweh Travel",
    source: "apollo",
    icpMatchScore: 81,
    enrichmentSignal: "Fernweh Travel launched new EU routes across 8 cities",
    trackingId: "trk_003",
    sequenceStage: "outreach_sent",
    dealStage: "Contacted",
    mailStatus: "sent",
    lastTouchAt: "2024-01-15T11:40:00Z",
  },
  {
    attioRecordId: "att_004",
    name: "Tom Welsh",
    company: "Atlas Builders",
    source: "apollo",
    icpMatchScore: 78,
    enrichmentSignal: "Atlas Builders posted 6 new senior engineering roles",
    trackingId: "trk_004",
    sequenceStage: "enriched",
    dealStage: "Lead",
    lastTouchAt: "2024-01-15T09:29:00Z",
  },
  {
    attioRecordId: "att_005",
    name: "Sofia Martins",
    company: "Holden & Co",
    source: "apollo",
    icpMatchScore: 85,
    enrichmentSignal: "Holden & Co just opened a new Berlin studio",
    trackingId: "trk_005",
    sequenceStage: "needs_review",
    dealStage: "Needs Review",
    mailStatus: "needs_human",
    lastTouchAt: "2024-01-15T09:50:00Z",
  },
];

export const FIXTURE_STATUS: PipelineStatus = {
  counts: {
    discovered: 0,
    enriched: 1,
    outreach_sent: 2,
    engaged: 1,
    needs_review: 1,
  },
  leads: FIXTURE_LEADS,
  updatedAt: new Date().toISOString(),
};

export const FIXTURE_ICP_REPLY = {
  icp: FIXTURE_ICP,
  reply:
    "Got it — targeting VP Engineering and Head of Sales at Series B software / fintech companies with 51–200 employees. That's a solid ICP. Ready to start finding leads?",
};
