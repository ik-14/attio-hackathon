import QRCode from "qrcode";
import sharp from "sharp";
import { PDFDocument } from "pdf-lib";
import { escapeXml } from "../util/assets.js";
import type { BrandKit, ComposedCard, Copy, LayoutDiagnostics, LayoutRect, TextLayout } from "../types.js";

// Stage 4 — compose deterministically (code, not AI). Layout, logo, QR,
// dimensions and bleed are repeatable and print-correct. Lob 4x6 @ 300dpi with
// bleed: 1875 × 1275 px. Safe margin 0.25" = 75 px.

const FULL_W = 1875;
const FULL_H = 1275;
const SAFE   = 75;
const QR_PX  = 320; // used for QR generation buffer; layout uses its own QR_SIZE

// ---------------------------------------------------------------------------
// Luminance utilities — drive the dark/light text decision from the palette.
// ---------------------------------------------------------------------------

function hexToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (full.length !== 6) return 0;
  const r = hexToLinear(parseInt(full.slice(0, 2), 16) / 255);
  const g = hexToLinear(parseInt(full.slice(2, 4), 16) / 255);
  const b = hexToLinear(parseInt(full.slice(4, 6), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function isDarkColor(hex: string): boolean {
  return relativeLuminance(hex) < 0.35;
}
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


function planLayout(copy: Copy, bookingUrl: string): LayoutDiagnostics {
  // Design system:
  //   • All content and QR live on the FRONT; back is clean brand fill for Lob.
  //   • Single left-aligned text column — strict margin grid, no right column.
  //   • QR sits in the BOTTOM-RIGHT corner (opposite diagonal to the headline).
  //   • Label "Scan to schedule a chat" is flush below the QR, ≤ QR width.
  //   • Every element shares the same x=SAFE left margin or x=QR_X right anchor.

  const TEXT_W   = 900;  // text column width — leaves clear space to QR
  const QR_SIZE  = 240;  // compact QR — scannable but not dominant
  const QR_X     = FULL_W - SAFE - QR_SIZE;   // 1560px
  const LABEL_H  = 52;
  const QR_GAP   = 14;   // gap between QR and its label
  const QR_Y     = FULL_H - SAFE - QR_SIZE - QR_GAP - LABEL_H; // 844px

  // Vertical rhythm — headline anchored well below top safe edge for breathing room
  const HEADLINE_Y = 220;
  const HEADLINE_H = 290;
  const GAP_LG    = 30;
  const GAP_SM    = 18;

  const personalY = HEADLINE_Y + HEADLINE_H + GAP_LG;  // 540
  const bodyY     = personalY + 100 + GAP_SM;           // 658
  const ctaY      = bodyY    + 130 + GAP_SM;            // 806
  const signOffY  = ctaY    + 90  + 10;                 // 906
  const labelY    = QR_Y + QR_SIZE + QR_GAP;            // 1098

  const safeAreas = {
    qr:    { x: QR_X,   y: QR_Y,  w: QR_SIZE, h: QR_SIZE },
    label: { x: QR_X,   y: labelY, w: QR_SIZE, h: LABEL_H },
  };

  const text = [
    fitTextToBox({
      name: "front.headline",
      text: copy.headline,
      box: { x: SAFE, y: HEADLINE_Y, w: TEXT_W, h: HEADLINE_H },
      maxFontSize: 90, minFontSize: 64, lineHeightRatio: 1.10, maxLines: 3,
    }),
    fitTextToBox({
      name: "front.personalLine",
      text: copy.personal_line,
      box: { x: SAFE, y: personalY, w: TEXT_W, h: 100 },
      maxFontSize: 40, minFontSize: 30, lineHeightRatio: 1.25, maxLines: 2,
    }),
    fitTextToBox({
      name: "front.body",
      text: copy.body,
      box: { x: SAFE, y: bodyY, w: TEXT_W, h: 130 },
      maxFontSize: 34, minFontSize: 26, lineHeightRatio: 1.30, maxLines: 3,
    }),
    fitTextToBox({
      name: "front.cta",
      text: copy.cta,
      box: { x: SAFE, y: ctaY, w: TEXT_W, h: 90 },
      maxFontSize: 28, minFontSize: 22, lineHeightRatio: 1.25, maxLines: 2,
    }),
    fitTextToBox({
      name: "front.signOff",
      text: copy.sign_off,
      box: { x: SAFE, y: signOffY, w: 500, h: 40 },
      maxFontSize: 24, minFontSize: 18, lineHeightRatio: 1.15, maxLines: 1,
    }),
    // Fixed label — not from copy, always the same call-to-action beneath the QR.
    fitTextToBox({
      name: "front.label",
      text: "Scan to schedule\na chat",
      box: safeAreas.label,
      maxFontSize: 22, minFontSize: 16, lineHeightRatio: 1.28, maxLines: 2,
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
  // No text element (other than the label itself) should touch the QR area.
  for (const t of text.filter((t) => t.name !== "front.label")) {
    if (rectsOverlap(t.bounds, safeAreas.qr)) {
      collisions.push(`${t.name} overlaps qr`);
    }
  }

  return {
    template: "minimal_left_qr_bottomright",
    size: { width: FULL_W, height: FULL_H, dpi: 300, safeMargin: SAFE },
    safeAreas,
    text,
    collisions,
  };
}

async function buildFront(
  imagePng: Buffer,
  brand: BrandKit,
  layout: LayoutDiagnostics,
  qrPng: Buffer,
  fontStack: string,
  isSerif: boolean,
): Promise<Buffer> {
  const base = await sharp(imagePng).resize(FULL_W, FULL_H, { fit: "cover" }).png().toBuffer();

  const headline = findText(layout, "front.headline");
  const personal = findText(layout, "front.personalLine");
  const body     = findText(layout, "front.body");
  const cta      = findText(layout, "front.cta");
  const signOff  = findText(layout, "front.signOff");
  const label    = findText(layout, "front.label");
  const qr       = layout.safeAreas.qr;

  // Contrast-safe text colors derived from the dominant brand color.
  // Dark background → white text; light background → near-black text.
  const bgHex    = brand.palette[0] ?? "#1a1a2e";
  const dark     = isDarkColor(bgHex);
  const textFull = dark ? "#ffffff"              : "#0d0d0d";
  const textSoft = dark ? "rgba(255,255,255,0.80)" : "rgba(13,13,13,0.68)";
  const textDim  = dark ? "rgba(255,255,255,0.45)" : "rgba(13,13,13,0.40)";
  const accent   = brand.palette[2] ?? brand.palette[1] ?? textFull;

  // Very subtle uniform overlay — just enough to ensure text legibility if
  // the generated image is slightly off the expected near-solid background.
  const overlayColor   = dark ? "#000000" : "#ffffff";
  const overlayOpacity = "0.12";
  const letterSpacing  = isSerif ? "0" : "-0.5";

  const overlay = `
    <svg width="${FULL_W}" height="${FULL_H}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${FULL_W}" height="${FULL_H}" fill="${overlayColor}" fill-opacity="${overlayOpacity}"/>
      <text font-family="${fontStack}" font-size="${headline.fontSize}" font-weight="700"
            fill="${textFull}" letter-spacing="${letterSpacing}">${tspans(headline)}</text>
      <text font-family="${fontStack}" font-size="${personal.fontSize}"
            fill="${textSoft}">${tspans(personal)}</text>
      <text font-family="${fontStack}" font-size="${body.fontSize}"
            fill="${textSoft}">${tspans(body)}</text>
      <text font-family="${fontStack}" font-size="${cta.fontSize}" font-weight="600"
            fill="${accent}">${tspans(cta)}</text>
      <text font-family="${fontStack}" font-size="${signOff.fontSize}" font-style="italic"
            fill="${textDim}">${tspans(signOff)}</text>
      <text font-family="${fontStack}" font-size="${label.fontSize}"
            fill="${textDim}">${tspans(label)}</text>
    </svg>`;

  const qrSized = await sharp(qrPng).resize(qr.w, qr.h, { fit: "fill" }).png().toBuffer();

  return sharp(base)
    .composite([
      { input: Buffer.from(overlay), top: 0, left: 0 },
      { input: qrSized, top: qr.y, left: qr.x },
    ])
    .png()
    .toBuffer();
}

async function buildBack(brand: BrandKit): Promise<Buffer> {
  // Clean solid brand color — Lob prints address + postage indicia over this.
  // Minimal, no text, no decoration. Same color logic as front text: dark brand
  // color on a light card or light on dark, whichever the palette dictates.
  const bg  = brand.palette[0] ?? "#1a1a2e";
  const fg  = brand.palette[1] ?? "#f0f0f0";

  // Very subtle vignette toward the edges using the secondary palette color.
  const svg = `
    <svg width="${FULL_W}" height="${FULL_H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stop-color="${bg}"/>
          <stop offset="100%" stop-color="${fg}" stop-opacity="0.18"/>
        </radialGradient>
      </defs>
      <rect width="${FULL_W}" height="${FULL_H}" fill="${bg}"/>
      <rect width="${FULL_W}" height="${FULL_H}" fill="url(#vignette)"/>
    </svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
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
  const frontPng = await buildFront(imagePng, brand, layout, qrPng, fontStack, isSerif);
  const backPng  = await buildBack(brand);
  const pdf      = await buildPdf(frontPng, backPng);

  return { frontPng, backPng, qrPng, pdf, layout };
}
