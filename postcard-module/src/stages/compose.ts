import QRCode from "qrcode";
import sharp from "sharp";
import { PDFDocument } from "pdf-lib";
import { fetchImagePng, wordmarkPng, escapeXml } from "../util/assets.js";
import type { BrandKit, ComposedCard, Copy, LayoutDiagnostics, LayoutRect, TextLayout } from "../types.js";

// Stage 4 — compose deterministically (code, not AI). Layout, logo, QR,
// dimensions and bleed are repeatable and print-correct. Lob 4x6 @ 300dpi with
// bleed: 1875 × 1275 px. Safe margin 0.25" = 75 px.

const FULL_W = 1875;
const FULL_H = 1275;
const SAFE = 75;
const QR_PX = 320; // ≈ 2.7 cm at 300dpi — comfortably above the ~2cm floor
// ---------------------------------------------------------------------------
// Brand-aware font resolution
// SVG is rendered by librsvg, so only system fonts are available. We classify
// the brand font into a CSS generic family and build an appropriate fallback
// stack — the brand font name is always listed first so it renders if the
// OS has it (common for Helvetica, Georgia, etc.), otherwise the fallback
// preserves the right typographic feel (serif vs sans vs display).
// ---------------------------------------------------------------------------

type FontClass = "sans" | "serif" | "mono" | "display";

const SERIF_KEYWORDS = ["serif", "georgia", "times", "garamond", "palatino", "caslon", "baskerville", "didot", "bodoni", "playfair", "merriweather", "lora", "libre", "cormorant", "crimson", "spectral", "pt serif", "noto serif", "source serif", "trajan", "minion", "bembo"];
const MONO_KEYWORDS = ["mono", "courier", "consolas", "menlo", "monaco", "inconsolata", "code", "jetbrains", "fira code", "source code"];
const DISPLAY_KEYWORDS = ["impact", "bebas", "black", "ultra", "heavy", "condensed", "oswald"];

function classifyFont(name: string): FontClass {
  const l = name.toLowerCase().trim();
  if (MONO_KEYWORDS.some((k) => l.includes(k))) return "mono";
  if (DISPLAY_KEYWORDS.some((k) => l.includes(k))) return "display";
  if (SERIF_KEYWORDS.some((k) => l.includes(k))) return "serif";
  return "sans";
}

const FALLBACK_STACKS: Record<FontClass, string> = {
  sans: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  serif: "Georgia, 'Times New Roman', Times, serif",
  mono: "'Courier New', Courier, monospace",
  display: "Impact, 'Arial Black', Arial, sans-serif",
};

/**
 * Build a CSS font-family string using the brand's declared fonts.
 * The primary brand font is listed first; the generic-family fallback ensures
 * the right aesthetic if the font isn't installed on the render host.
 */
function resolveFontStack(brandFonts: string[]): { stack: string; isSerif: boolean } {
  const GENERICS = new Set(["sans-serif", "serif", "monospace", "system-ui", "inherit", "initial", "unset"]);
  const primary = brandFonts.find((f) => f.trim() && !GENERICS.has(f.toLowerCase().trim()));
  const cls: FontClass = primary ? classifyFont(primary) : "sans";
  const fallback = FALLBACK_STACKS[cls];
  const stack = primary
    ? `${primary.includes(" ") ? `'${primary}'` : primary}, ${fallback}`
    : fallback;
  return { stack, isSerif: cls === "serif" };
}

interface TextSpec {
  name: string;
  text: string;
  box: LayoutRect;
  maxFontSize: number;
  minFontSize: number;
  lineHeightRatio: number;
  maxLines: number;
  verticalAlign?: "top" | "center" | "bottom";
}

function measureText(text: string, fontSize: number): number {
  let units = 0;
  for (const char of text) {
    if (char === " ") units += 0.32;
    else if (/[A-Z]/.test(char)) units += 0.62;
    else if (/[0-9]/.test(char)) units += 0.55;
    else if (/[il.,'’!:;]/.test(char)) units += 0.25;
    else if (/[-–—/]/.test(char)) units += 0.38;
    else units += 0.52;
  }
  return units * fontSize;
}

function breakLongWord(word: string, fontSize: number, maxWidthPx: number): string[] {
  const chunks: string[] = [];
  let chunk = "";
  for (const char of word) {
    const candidate = `${chunk}${char}`;
    if (chunk && measureText(candidate, fontSize) > maxWidthPx) {
      chunks.push(chunk);
      chunk = char;
    } else {
      chunk = candidate;
    }
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}

function wrap(text: string, fontSize: number, maxWidthPx: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if (!w) continue;
    if (measureText(w, fontSize) > maxWidthPx) {
      if (line) {
        lines.push(line);
        line = "";
      }
      const chunks = breakLongWord(w, fontSize, maxWidthPx);
      lines.push(...chunks.slice(0, -1));
      line = chunks[chunks.length - 1] ?? "";
      continue;
    }

    const candidate = line ? `${line} ${w}` : w;
    if (measureText(candidate, fontSize) > maxWidthPx && line) {
      lines.push(line);
      line = w;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function ellipsize(text: string, fontSize: number, maxWidthPx: number): string {
  const suffix = "...";
  let out = text;
  while (out.length > 1 && measureText(`${out}${suffix}`, fontSize) > maxWidthPx) {
    out = out.slice(0, -1).trimEnd();
  }
  return `${out}${suffix}`;
}

function textBlockHeight(lines: string[], fontSize: number, lineHeight: number): number {
  return lines.length ? fontSize + (lines.length - 1) * lineHeight : 0;
}

function fitTextToBox(spec: TextSpec): TextLayout {
  for (let fontSize = spec.maxFontSize; fontSize >= spec.minFontSize; fontSize -= 2) {
    const lineHeight = Math.round(fontSize * spec.lineHeightRatio);
    const lines = wrap(spec.text, fontSize, spec.box.w);
    const maxLineWidth = Math.max(0, ...lines.map((line) => measureText(line, fontSize)));
    const blockH = textBlockHeight(lines, fontSize, lineHeight);
    if (lines.length <= spec.maxLines && maxLineWidth <= spec.box.w && blockH <= spec.box.h) {
      const y =
        spec.verticalAlign === "bottom"
          ? spec.box.y + spec.box.h - blockH
          : spec.verticalAlign === "center"
            ? spec.box.y + (spec.box.h - blockH) / 2
            : spec.box.y;
      return {
        name: spec.name,
        box: spec.box,
        bounds: { x: spec.box.x, y: Math.round(y), w: Math.ceil(maxLineWidth), h: Math.ceil(blockH) },
        lines,
        fontSize,
        lineHeight,
        minFontSize: spec.minFontSize,
        maxLines: spec.maxLines,
        fits: true,
      };
    }
  }

  const fontSize = spec.minFontSize;
  const lineHeight = Math.round(fontSize * spec.lineHeightRatio);
  const rawLines = wrap(spec.text, fontSize, spec.box.w);
  const visibleLines = rawLines.slice(0, spec.maxLines);
  if (rawLines.length > spec.maxLines && visibleLines.length) {
    visibleLines[visibleLines.length - 1] = ellipsize(visibleLines[visibleLines.length - 1], fontSize, spec.box.w);
  }
  const maxLineWidth = Math.max(0, ...visibleLines.map((line) => measureText(line, fontSize)));
  const blockH = textBlockHeight(visibleLines, fontSize, lineHeight);
  return {
    name: spec.name,
    box: spec.box,
    bounds: { x: spec.box.x, y: spec.box.y, w: Math.ceil(maxLineWidth), h: Math.ceil(blockH) },
    lines: visibleLines,
    fontSize,
    lineHeight,
    minFontSize: spec.minFontSize,
    maxLines: spec.maxLines,
    fits: false,
    detail:
      rawLines.length > spec.maxLines
        ? `${rawLines.length} lines exceeds ${spec.maxLines}`
        : `does not fit ${spec.box.w}x${spec.box.h}px box at minimum ${fontSize}px`,
  };
}

function tspans(layout: TextLayout): string {
  const y0 = layout.bounds.y + layout.fontSize;
  return layout.lines
    .map((l, i) => `<tspan x="${layout.box.x}" y="${y0 + i * layout.lineHeight}">${escapeXml(l)}</tspan>`)
    .join("");
}

function rectsOverlap(a: LayoutRect, b: LayoutRect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function sameSide(a: string, b: string): boolean {
  return a.split(".")[0] === b.split(".")[0];
}

function findText(layout: LayoutDiagnostics, name: string): TextLayout {
  const found = layout.text.find((t) => t.name === name);
  if (!found) throw new Error(`Missing text layout: ${name}`);
  return found;
}

function readableLink(bookingUrl: string): string {
  try {
    const u = new URL(bookingUrl);
    return `${u.host}${u.pathname}`;
  } catch {
    return bookingUrl.replace(/^https?:\/\//, "");
  }
}

function planLayout(copy: Copy, bookingUrl: string): LayoutDiagnostics {
  // All content (text + QR) lives on the FRONT. The back is a clean brand
  // graphic — Lob prints the address and postage directly onto it with nothing
  // from us to conflict with.

  const TEXT_W   = 1000;                        // left text column width
  const QR_SIZE  = 285;                         // QR px on front
  const QR_X     = FULL_W - SAFE - QR_SIZE;    // 1515px — right-aligned
  const QR_Y     = Math.round(FULL_H * 0.665); // 848px
  const QR_COL_X = TEXT_W + SAFE + 55;         // 1130px — right column start

  const HEADLINE_TOP = Math.round(FULL_H * 0.385); // 490px
  const HEADLINE_H   = 300;
  const PERSONAL_H   = 100;
  const BODY_H       = 130;
  const SIGNOFF_H    = 50;
  const CTA_H        = 90;
  const GAP          = 10;

  const personalY = HEADLINE_TOP + HEADLINE_H + GAP;
  const bodyY     = personalY + PERSONAL_H + GAP;
  const signOffY  = bodyY + BODY_H + 15;
  const ctaY      = QR_Y - CTA_H - 12;
  const linkY     = QR_Y + QR_SIZE + 15;

  const safeAreas = {
    logo: { x: SAFE, y: SAFE, w: 280, h: 100 },
    qr:   { x: QR_X, y: QR_Y, w: QR_SIZE, h: QR_SIZE },
  };

  const text = [
    fitTextToBox({
      name: "front.headline",
      text: copy.headline,
      box: { x: SAFE, y: HEADLINE_TOP, w: TEXT_W, h: HEADLINE_H },
      maxFontSize: 90, minFontSize: 60, lineHeightRatio: 1.12, maxLines: 3,
    }),
    fitTextToBox({
      name: "front.personalLine",
      text: copy.personal_line,
      box: { x: SAFE, y: personalY, w: TEXT_W, h: PERSONAL_H },
      maxFontSize: 42, minFontSize: 32, lineHeightRatio: 1.25, maxLines: 2,
    }),
    fitTextToBox({
      name: "front.body",
      text: copy.body,
      box: { x: SAFE, y: bodyY, w: TEXT_W, h: BODY_H },
      maxFontSize: 36, minFontSize: 28, lineHeightRatio: 1.28, maxLines: 3,
    }),
    fitTextToBox({
      name: "front.signOff",
      text: copy.sign_off,
      box: { x: SAFE, y: signOffY, w: 600, h: SIGNOFF_H },
      maxFontSize: 28, minFontSize: 22, lineHeightRatio: 1.15, maxLines: 1,
    }),
    fitTextToBox({
      name: "front.cta",
      text: copy.cta,
      box: { x: QR_COL_X, y: ctaY, w: FULL_W - QR_COL_X - SAFE, h: CTA_H },
      maxFontSize: 36, minFontSize: 28, lineHeightRatio: 1.25, maxLines: 2,
    }),
    fitTextToBox({
      name: "front.link",
      text: readableLink(bookingUrl),
      box: { x: QR_COL_X, y: linkY, w: FULL_W - QR_COL_X - SAFE, h: 42 },
      maxFontSize: 24, minFontSize: 18, lineHeightRatio: 1.15, maxLines: 1,
    }),
  ];

  const collisions: string[] = [];
  for (let i = 0; i < text.length; i += 1) {
    for (let j = i + 1; j < text.length; j += 1) {
      if (rectsOverlap(text[i].bounds, text[j].bounds)) {
        collisions.push(`${text[i].name} overlaps ${text[j].name}`);
      }
    }
  }
  const hl = text.find((t) => t.name === "front.headline");
  if (hl && rectsOverlap(hl.bounds, safeAreas.logo)) {
    collisions.push("front.headline overlaps logo");
  }
  for (const t of text) {
    if (rectsOverlap(t.bounds, safeAreas.qr)) {
      collisions.push(`${t.name} overlaps qr`);
    }
  }

  return {
    template: "all_front_clean_back",
    size: { width: FULL_W, height: FULL_H, dpi: 300, safeMargin: SAFE },
    safeAreas,
    text,
    collisions,
  };
}

async function buildFront(
  imagePng: Buffer,
  brand: BrandKit,
  company: string,
  layout: LayoutDiagnostics,
  qrPng: Buffer,
  fontStack: string,
  isSerif: boolean,
): Promise<Buffer> {
  const base = await sharp(imagePng).resize(FULL_W, FULL_H, { fit: "cover" }).png().toBuffer();

  const headline = findText(layout, "front.headline");
  const personal = findText(layout, "front.personalLine");
  const body     = findText(layout, "front.body");
  const signOff  = findText(layout, "front.signOff");
  const cta      = findText(layout, "front.cta");
  const link     = findText(layout, "front.link");
  const qr       = layout.safeAreas.qr;

  const accent        = brand.palette[2] ?? "#c9a23f";
  const letterSpacing = isSerif ? "0" : "-1";

  const overlay = `
    <svg width="${FULL_W}" height="${FULL_H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="28%" stop-color="#000000" stop-opacity="0"/>
          <stop offset="52%" stop-color="#000000" stop-opacity="0.68"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0.88"/>
        </linearGradient>
      </defs>
      <rect width="${FULL_W}" height="${FULL_H}" fill="url(#scrim)"/>
      <text font-family="${fontStack}" font-size="${headline.fontSize}" font-weight="700"
            fill="#ffffff" letter-spacing="${letterSpacing}">${tspans(headline)}</text>
      <text font-family="${fontStack}" font-size="${personal.fontSize}"
            fill="#ffffff" fill-opacity="0.92">${tspans(personal)}</text>
      <text font-family="${fontStack}" font-size="${body.fontSize}"
            fill="#ffffff" fill-opacity="0.82">${tspans(body)}</text>
      <text font-family="${fontStack}" font-size="${signOff.fontSize}" font-style="italic"
            fill="#ffffff" fill-opacity="0.68">${tspans(signOff)}</text>
      <text font-family="${fontStack}" font-size="${cta.fontSize}" font-weight="700"
            fill="${accent}">${tspans(cta)}</text>
      <text font-family="${fontStack}" font-size="${link.fontSize}"
            fill="#ffffff" fill-opacity="0.58">${tspans(link)}</text>
    </svg>`;

  const logoBuf =
    (await fetchImagePng(brand.logo_url)) ??
    (await wordmarkPng(company, brand.palette[2] ?? "#c9a23f", "#ffffffdd"));
  const logoSized = await sharp(logoBuf).resize(280, 100, { fit: "inside" }).png().toBuffer();
  const qrSized   = await sharp(qrPng).resize(qr.w, qr.h, { fit: "fill" }).png().toBuffer();

  return sharp(base)
    .composite([
      { input: Buffer.from(overlay), top: 0, left: 0 },
      { input: logoSized, top: SAFE, left: SAFE },
      { input: qrSized, top: qr.y, left: qr.x },
    ])
    .png()
    .toBuffer();
}

async function buildBack(brand: BrandKit, company: string): Promise<Buffer> {
  // Clean brand graphic — Lob prints the address and postage indicia over this.
  // No text from us; the entire canvas is available for Lob's use.
  const bg = brand.palette[0] ?? "#0b3d2e";
  const fg = brand.palette[1] ?? "#f2e9dc";

  const svg = `
    <svg width="${FULL_W}" height="${FULL_H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${bg}"/>
          <stop offset="100%" stop-color="${fg}" stop-opacity="0.55"/>
        </linearGradient>
      </defs>
      <rect width="${FULL_W}" height="${FULL_H}" fill="url(#bg)"/>
    </svg>`;

  const logoBuf =
    (await fetchImagePng(brand.logo_url)) ??
    (await wordmarkPng(company, fg, "transparent"));
  const sized = await sharp(logoBuf).resize(420, 160, { fit: "inside" }).png().toBuffer();

  return sharp(Buffer.from(svg))
    .composite([{ input: sized, gravity: "center" }])
    .png()
    .toBuffer();
}

async function buildPdf(frontPng: Buffer, backPng: Buffer): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const ptW = (FULL_W * 72) / 300;
  const ptH = (FULL_H * 72) / 300;
  for (const png of [frontPng, backPng]) {
    const page = doc.addPage([ptW, ptH]);
    const img = await doc.embedPng(png);
    page.drawImage(img, { x: 0, y: 0, width: ptW, height: ptH });
  }
  return Buffer.from(await doc.save());
}

export async function compose(
  imagePng: Buffer,
  copy: Copy,
  brand: BrandKit,
  bookingUrl: string,
  company: string,
): Promise<ComposedCard> {
  // Real QR library — never let the image model draw it. High error correction
  // so it survives print; the QR encodes the tracked redirect (/r/:trackingId).
  const qrPng = await QRCode.toBuffer(bookingUrl, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: QR_PX,
    color: { dark: "#000000ff", light: "#ffffffff" },
  });

  const { stack: fontStack, isSerif } = resolveFontStack(brand.fonts ?? []);
  const layout   = planLayout(copy, bookingUrl);
  const frontPng = await buildFront(imagePng, brand, company, layout, qrPng, fontStack, isSerif);
  const backPng  = await buildBack(brand, company);
  const pdf      = await buildPdf(frontPng, backPng);

  return { frontPng, backPng, qrPng, pdf, layout };
}
