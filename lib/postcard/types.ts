import type { MailStatus, PostalAddress } from "@/lib/types";

export type { MailStatus, PostalAddress };

export interface Prospect {
  first_name: string;
  last_name: string;
  title: string;
  company: string;
  company_domain: string;
  industry: string;
  email: string;
  postal_address: PostalAddress;
}

export interface EnrichmentSignal {
  signal: string;
  source_url: string;
  published_date?: string;
}

export type BrandKitSource = "brandfetch" | "clearbit" | "scraped" | "fallback";

export interface BrandKit {
  logo_url: string | null;
  palette: string[];
  fonts: string[];
  source: BrandKitSource;
}

export interface MailInput {
  prospect: Prospect;
  enrichment: EnrichmentSignal[];
  brand_kit: BrandKit;
  tracking_id: string;
  booking_url: string;
  attio_record_id: string;
}

export interface Brief {
  hook: string | null;
  hook_source: string | null;
  brand_cues: { palette: string[]; visual_style: string; sector: string };
  tone: string;
  why_relevant: string;
}

export interface Copy {
  headline: string;
  personal_line: string;
  body: string;
  cta: string;
  sign_off: string;
}

export interface ImagePrompt {
  image_prompt: string;
  negative_prompt: string;
  aspect_ratio: string;
}

export interface GeneratedImage {
  png: Buffer;
  model: string;
  cached: boolean;
}

export interface ComposedCard {
  frontPng: Buffer;
  backPng: Buffer;
  qrPng: Buffer;
  pdf: Buffer;
}

export interface CheckResult {
  ok: boolean;
  failures: string[];
  ran: { name: string; ok: boolean; detail?: string }[];
}

export interface MailResult {
  trackingId: string;
  mailStatus: MailStatus;
  proofUrl?: string;
  frontPngAvailable: boolean;
  copy: Copy;
  brief: Brief;
}
