import type { BrandKit } from "./types.js";
import { config } from "./config.js";
import { fetchBrandKit, isComplete } from "./stages/fetchBrandKit.js";

// Sector-default palette so a card without a supplied kit still degrades on-brand.
const SECTOR_PALETTES: Record<string, string[]> = {
  fintech: ["#0a2540", "#f6f9fc", "#635bff"],
  retail: ["#1d1d1f", "#f5f5f7", "#e0245e"],
  saas: ["#0b3d2e", "#f2e9dc", "#c9a23f"],
  health: ["#0b6e4f", "#eafaf1", "#2a9d8f"],
};

export function sectorPalette(sector: string): string[] {
  return SECTOR_PALETTES[sector.toLowerCase()] ?? SECTOR_PALETTES.saas;
}

export function hardcodedBrandKit(overrides: Partial<BrandKit> = {}): BrandKit {
  return {
    logo_url: null,
    palette: ["#0b3d2e", "#f2e9dc", "#c9a23f"],
    fonts: ["Helvetica", "Arial", "sans-serif"],
    source: "fallback",
    ...overrides,
  };
}

/** Sync resolver — used when fetch is disabled or offline. */
export function resolveBrandKit(supplied: Partial<BrandKit> | undefined, sector: string): BrandKit {
  if (supplied && supplied.palette && supplied.palette.length) {
    return hardcodedBrandKit(supplied);
  }
  return hardcodedBrandKit({ palette: sectorPalette(sector), ...supplied });
}

function shouldFetch(supplied: Partial<BrandKit> | undefined): boolean {
  const mode = config.brand.fetch;
  if (mode === "never") return false;
  if (mode === "always") return true;
  // auto — fetch when the caller didn't supply a complete kit
  if (!supplied) return true;
  if (!isComplete(hardcodedBrandKit(supplied))) return true;
  if (!supplied.logo_url && config.brand.fetchMissingLogo) return true;
  return false;
}

/** Stage 0 entry — fetch live brand assets when needed, else use supplied/sector fallback. */
export async function ensureBrandKit(
  domain: string,
  sector: string,
  supplied?: Partial<BrandKit>,
): Promise<BrandKit> {
  if (!shouldFetch(supplied)) {
    return resolveBrandKit(supplied, sector);
  }

  const fetched = await fetchBrandKit(domain, sector);
  if (!supplied) return fetched;

  // Caller overrides win on any field they explicitly set.
  return {
    logo_url: supplied.logo_url !== undefined ? supplied.logo_url : fetched.logo_url,
    palette: supplied.palette?.length ? supplied.palette : fetched.palette,
    fonts: supplied.fonts?.length ? supplied.fonts : fetched.fonts,
    source: supplied.source ?? fetched.source,
  };
}
