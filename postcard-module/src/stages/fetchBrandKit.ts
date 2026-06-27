import sharp from "sharp";
import type { BrandKit, BrandKitSource } from "../types.js";
import { fetchImagePng } from "../util/assets.js";
import { hardcodedBrandKit, sectorPalette } from "../brandKit.js";
import { config } from "../config.js";

// Stage 0 — domain → logo + palette + fonts. Fallback chain per
// postcard-generation-agent.md: Brandfetch → Clearbit → scrape → vibrant → sector.

function normalizeDomain(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("/")[0]!
    .toLowerCase();
}

function isHexColor(v: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim());
}

function uniqHex(colors: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of colors) {
    const hex = c.trim().toLowerCase();
    if (!isHexColor(hex) || seen.has(hex)) continue;
    seen.add(hex);
    out.push(hex);
  }
  return out;
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;
}

function tint(hex: string, towardWhite: number): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * towardWhite);
  return rgbToHex(mix(r), mix(g), mix(b));
}

function paletteFromDominant(r: number, g: number, b: number): string[] {
  const primary = rgbToHex(r, g, b);
  return uniqHex([primary, tint(primary, 0.88), tint(primary, 0.35)]);
}

async function paletteFromLogoUrl(logoUrl: string): Promise<string[]> {
  const png = await fetchImagePng(logoUrl);
  if (!png) return [];
  const stats = await sharp(png).stats();
  return paletteFromDominant(stats.dominant.r, stats.dominant.g, stats.dominant.b);
}

async function fetchBrandfetch(domain: string): Promise<Partial<BrandKit> | null> {
  const key = config.brand.brandfetchApiKey;
  if (!key) return null;
  try {
    const res = await fetch(`https://api.brandfetch.io/v2/brands/${encodeURIComponent(domain)}`, {
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
      signal: AbortSignal.timeout(config.brand.timeoutMs),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      colors?: { hex?: string }[];
      fonts?: { name?: string }[];
      logos?: { type?: string; theme?: string; formats?: { src?: string; format?: string }[] }[];
    };

    const palette = uniqHex((data.colors ?? []).map((c) => c.hex ?? "").filter(Boolean));
    const fonts = (data.fonts ?? []).map((f) => f.name).filter(Boolean) as string[];

    const logos = data.logos ?? [];
    const preferred =
      logos.find((l) => l.type === "logo" && l.theme !== "dark") ??
      logos.find((l) => l.type === "logo") ??
      logos[0];
    const logo_url =
      preferred?.formats?.find((f) => f.format === "png" || f.format === "svg")?.src ??
      preferred?.formats?.[0]?.src ??
      null;

    if (!palette.length && !logo_url) return null;
    return { logo_url, palette, fonts, source: "brandfetch" };
  } catch {
    return null;
  }
}

async function fetchClearbitLogo(domain: string): Promise<Partial<BrandKit> | null> {
  const logo_url = `https://logo.clearbit.com/${domain}`;
  const png = await fetchImagePng(logo_url);
  if (!png) return null;
  const palette = await paletteFromLogoUrl(logo_url);
  return { logo_url, palette, fonts: [], source: "clearbit" };
}

function decodeHtmlEntities(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function absUrl(base: string, href: string): string | null {
  try {
    return decodeHtmlEntities(new URL(href, base).href);
  } catch {
    return null;
  }
}

function extractMeta(html: string, name: string): string | null {
  const re = new RegExp(
    `<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']|` +
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${name}["']`,
    "i",
  );
  const m = html.match(re);
  const raw = (m?.[1] ?? m?.[2] ?? null)?.trim() ?? null;
  return raw ? decodeHtmlEntities(raw) : null;
}

function extractLink(html: string, rel: string): string | null {
  const re = new RegExp(`<link[^>]+rel=["'][^"']*${rel}[^"']*["'][^>]+href=["']([^"']+)["']`, "i");
  const m = html.match(re);
  const raw = m?.[1]?.trim() ?? null;
  return raw ? decodeHtmlEntities(raw) : null;
}

function extractCssColors(html: string): string[] {
  const vars = [...html.matchAll(/--(?:brand|color-primary|primary|accent)[^:]*:\s*(#[0-9a-f]{3,6})/gi)];
  return uniqHex(vars.map((m) => m[1]!));
}

function extractGoogleFonts(html: string): string[] {
  const fonts: string[] = [];
  for (const m of html.matchAll(/fonts\.googleapis\.com\/css2?\?[^"']+family=([^"'&]+)/gi)) {
    const raw = decodeURIComponent(m[1]!);
    for (const part of raw.split("|")) {
      const name = part.split(":")[0]?.replace(/\+/g, " ").trim();
      if (name) fonts.push(name);
    }
  }
  return [...new Set(fonts)];
}

async function scrapeSiteMetadata(domain: string): Promise<Partial<BrandKit> | null> {
  const base = `https://${domain}`;
  try {
    const res = await fetch(base, {
      headers: { "User-Agent": "postcard-module/0.1 (+brand-kit-fetch)" },
      redirect: "follow",
      signal: AbortSignal.timeout(config.brand.timeoutMs),
    });
    if (!res.ok) return null;
    const html = await res.text();

    const theme = extractMeta(html, "theme-color");
    const palette = uniqHex([
      ...(theme && isHexColor(theme) ? [theme] : []),
      ...extractCssColors(html),
    ]);

    const icon =
      extractLink(html, "apple-touch-icon") ??
      extractLink(html, "icon") ??
      extractMeta(html, "og:image");
    const logo_url = icon ? absUrl(base, icon) : null;
    const fonts = extractGoogleFonts(html);

    if (!palette.length && !logo_url && !fonts.length) return null;

    let resolvedPalette = palette;
    if (resolvedPalette.length < 2 && logo_url) {
      const fromLogo = await paletteFromLogoUrl(logo_url);
      resolvedPalette = uniqHex([...resolvedPalette, ...fromLogo]);
    }

    return {
      logo_url,
      palette: resolvedPalette,
      fonts,
      source: "scraped",
    };
  } catch {
    return null;
  }
}

function mergeBrand(partial: Partial<BrandKit>, base: BrandKit): BrandKit {
  return {
    logo_url: partial.logo_url ?? base.logo_url,
    palette: partial.palette?.length ? partial.palette : base.palette,
    fonts: partial.fonts?.length ? partial.fonts : base.fonts,
    source: partial.source ?? base.source,
  };
}

function isComplete(kit: BrandKit): boolean {
  return kit.palette.length >= 2;
}

/** Run the Stage 0 fallback chain for a company domain. Always returns a usable kit. */
export async function fetchBrandKit(domain: string, sector: string): Promise<BrandKit> {
  const normalized = normalizeDomain(domain);
  const fallback = hardcodedBrandKit({ palette: sectorPalette(sector) });

  const steps: (() => Promise<Partial<BrandKit> | null>)[] = [
    () => fetchBrandfetch(normalized),
    () => fetchClearbitLogo(normalized),
    () => scrapeSiteMetadata(normalized),
  ];

  let kit = fallback;
  for (const step of steps) {
    const partial = await step();
    if (!partial) continue;
    kit = mergeBrand(partial, kit);
    if (kit.logo_url && isComplete(kit)) break;
  }

  if (kit.palette.length < 2) {
    kit = { ...kit, palette: sectorPalette(sector), source: kit.source === "fallback" ? "fallback" : kit.source };
  }
  if (kit.logo_url && kit.source !== "brandfetch") {
    const fromLogo = await paletteFromLogoUrl(kit.logo_url);
    if (fromLogo.length >= 2) kit = { ...kit, palette: fromLogo };
  }
  if (!kit.fonts.length) {
    kit = { ...kit, fonts: fallback.fonts };
  }

  console.log(
    `[brand] ${normalized} → source=${kit.source} palette=${kit.palette.join(",")} logo=${kit.logo_url ? "yes" : "no"}`,
  );
  return kit;
}

export { normalizeDomain, isComplete };
