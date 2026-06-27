// Data contracts for the postcard module. These mirror the schemas locked in
// postcard-generation-agent.md (Inputs + Stage 0–3 outputs) — keep them stable;
// every stage integrates against them.

export interface PostalAddress {
  line1: string;
  line2?: string;
  city: string;
  postcode: string;
  country: string;
  state?: string;
}

export interface Prospect {
  first_name: string;
  last_name: string;
  title: string;
  company: string;
  company_domain: string;
  industry: string;
  email: string; // NOT printed on the card — used downstream to prefill Calendly
  postal_address: PostalAddress; // for Lob — never sent to the LLM
}

export interface EnrichmentSignal {
  signal: string;
  source_url: string;
  published_date?: string;
}

export type BrandKitSource = "brandfetch" | "clearbit" | "scraped" | "fallback";

export interface BrandKit {
  logo_url: string | null;
  palette: string[]; // hex
  fonts: string[];
  source: BrandKitSource;
}

// Stage 4 input — the full precondition set (postcard-generation-agent.md §Inputs)
export interface MailInput {
  prospect: Prospect;
  enrichment: EnrichmentSignal[];
  brand_kit: BrandKit;
  tracking_id: string; // minted at discovery
  booking_url: string; // the tracked redirect https://<host>/r/:trackingId
  attio_record_id: string;
}

// Stage 1 output — personalisation brief
export interface Brief {
  hook: string | null;
  hook_source: string | null;
  brand_cues: { palette: string[]; visual_style: string; sector: string };
  tone: string;
  why_relevant: string;
}

// Stage 2 output — copy
export interface Copy {
  headline: string; // <= 8 words, hook-led
  personal_line: string;
  body: string;
  cta: string;
  sign_off: string;
}

// Stage 3a output — image prompt
export interface ImagePrompt {
  image_prompt: string;
  negative_prompt: string;
  aspect_ratio: string;
}

// Stage 3b output
export interface GeneratedImage {
  png: Buffer;
  model: string; // which model produced it (or "placeholder")
  cached: boolean;
}

// Stage 4 output
export interface ComposedCard {
  frontPng: Buffer;
  backPng: Buffer;
  qrPng: Buffer;
  pdf: Buffer;
}

// Stage 5 output
export type MailStatus = "ready_to_send" | "needs_human" | "sent";

export interface CheckResult {
  ok: boolean;
  failures: string[];
  ran: { name: string; ok: boolean; detail?: string }[];
}

// The full result handed back to the /jobs/mail caller.
export interface MailResult {
  tracking_id: string;
  attio_record_id: string;
  mail_status: MailStatus;
  brief: Brief;
  copy: Copy;
  pdfPath?: string;
  lob_id?: string;
  proof_url?: string;
  failure_reason?: string;
}
