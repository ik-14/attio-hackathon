import type { BrandKit } from "./types.js";

// Stage 0 is CUT for the hackathon (execution-plan workstream B): skip the
// Brandfetch → Clearbit → scrape → vibrant → sector-defaults fallback chain and
// hand-supply the rehearsed prospect's real brand kit (logo + 2–3 colours grabbed
// by eye from their site). Source is marked "fallback" so a non-fetched kit stays
// traceable, exactly as a real Stage 0 would log it.
//
// To re-enable a live Stage 0 later, replace `resolveBrandKit` with the fallback
// chain in postcard-generation-agent.md §Stage 0 and keep this signature.

export function hardcodedBrandKit(overrides: Partial<BrandKit> = {}): BrandKit {
  return {
    logo_url: null,
    palette: ["#0b3d2e", "#f2e9dc", "#c9a23f"],
    fonts: ["Helvetica", "Arial", "sans-serif"],
    source: "fallback",
    ...overrides,
  };
}

// Sector-default palette so a card without a supplied kit still degrades on-brand.
const SECTOR_PALETTES: Record<string, string[]> = {
  fintech: ["#0a2540", "#f6f9fc", "#635bff"],
  retail: ["#1d1d1f", "#f5f5f7", "#e0245e"],
  saas: ["#0b3d2e", "#f2e9dc", "#c9a23f"],
  health: ["#0b6e4f", "#eafaf1", "#2a9d8f"],
};

export function resolveBrandKit(supplied: Partial<BrandKit> | undefined, sector: string): BrandKit {
  if (supplied && supplied.palette && supplied.palette.length) {
    return hardcodedBrandKit(supplied);
  }
  const palette = SECTOR_PALETTES[sector.toLowerCase()] ?? SECTOR_PALETTES.saas;
  return hardcodedBrandKit({ palette, ...supplied });
}
