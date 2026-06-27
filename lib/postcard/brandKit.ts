import type { BrandKit } from "@/lib/postcard/types";

export function hardcodedBrandKit(overrides: Partial<BrandKit> = {}): BrandKit {
  return {
    logo_url: null,
    palette: ["#0b3d2e", "#f2e9dc", "#c9a23f"],
    fonts: ["Helvetica", "Arial", "sans-serif"],
    source: "fallback",
    ...overrides,
  };
}

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
