import QRCode from "qrcode";
import sharp, { type OverlayOptions } from "sharp";
import { PDFDocument } from "pdf-lib";
import { fetchImagePng, wordmarkPng, escapeXml } from "@/lib/postcard/util/assets";
import type { BrandKit, ComposedCard, Copy } from "@/lib/postcard/types";

const FULL_W = 1875;
const FULL_H = 1275;
const SAFE = 75;
const QR_PX = 320;

function wrap(text: string, fontSize: number, maxWidthPx: number): string[] {
  const maxChars = Math.max(6, Math.floor(maxWidthPx / (fontSize * 0.54)));
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w;
    if (candidate.length > maxChars && line) {
      lines.push(line);
      line = w;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function tspans(lines: string[], x: number, y0: number, lh: number): string {
  return lines
    .map((l, i) => `<tspan x="${x}" y="${y0 + i * lh}">${escapeXml(l)}</tspan>`)
    .join("");
}

function readableLink(bookingUrl: string): string {
  try {
    const u = new URL(bookingUrl);
    return `${u.host}${u.pathname}`;
  } catch {
    return bookingUrl.replace(/^https?:\/\//, "");
  }
}

async function buildFront(imagePng: Buffer, copy: Copy, brand: BrandKit, company: string): Promise<Buffer> {
  const base = await sharp(imagePng).resize(FULL_W, FULL_H, { fit: "cover" }).png().toBuffer();

  const headlineLines = wrap(copy.headline, 96, FULL_W - 2 * SAFE);
  const headlineBlockH = headlineLines.length * 108;
  const headlineTop = FULL_H - SAFE - headlineBlockH + 80;
  const ink = brand.palette[1] ?? "#ffffff";

  const overlay = `
    <svg width="${FULL_W}" height="${FULL_H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="50%" stop-color="#000000" stop-opacity="0"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0.66"/>
        </linearGradient>
      </defs>
      <rect x="0" y="${FULL_H * 0.45}" width="${FULL_W}" height="${FULL_H * 0.55}" fill="url(#scrim)"/>
      <text font-family="Helvetica, Arial, sans-serif" font-size="96" font-weight="700"
            fill="${ink}" letter-spacing="-1">
        ${tspans(headlineLines, SAFE, headlineTop, 108)}
      </text>
    </svg>`;

  const composites: OverlayOptions[] = [{ input: Buffer.from(overlay), top: 0, left: 0 }];
  const logoBuf =
    (await fetchImagePng(brand.logo_url)) ?? (await wordmarkPng(company, brand.palette[2] ?? "#c9a23f", "#ffffffdd"));
  const sized = await sharp(logoBuf).resize(320, 120, { fit: "inside" }).png().toBuffer();
  composites.push({ input: sized, top: SAFE, left: SAFE });

  return sharp(base).composite(composites).png().toBuffer();
}

async function buildBack(
  copy: Copy,
  brand: BrandKit,
  bookingUrl: string,
  qrPng: Buffer,
): Promise<Buffer> {
  const bg = brand.palette[1] ?? "#f2e9dc";
  const ink = brand.palette[0] ?? "#0b3d2e";
  const accent = brand.palette[2] ?? brand.palette[0] ?? "#c9a23f";

  const colW = Math.round(FULL_W * 0.56) - SAFE;
  const x = SAFE;
  let y = SAFE + 70;

  const personal = wrap(copy.personal_line, 44, colW);
  const body = wrap(copy.body, 40, colW);
  const cta = wrap(copy.cta, 40, colW - QR_PX - 40);

  const personalSvg = tspans(personal, x, y, 56);
  y += personal.length * 56 + 40;
  const bodySvg = tspans(body, x, y, 52);
  y += body.length * 52 + 50;

  const qrTop = FULL_H - SAFE - QR_PX - 60;
  const ctaY = qrTop + 30;
  const ctaSvg = tspans(cta, x + QR_PX + 40, ctaY, 50);
  const link = readableLink(bookingUrl);

  const svg = `
    <svg width="${FULL_W}" height="${FULL_H}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${FULL_W}" height="${FULL_H}" fill="${bg}"/>
      <rect x="${FULL_W * 0.62}" y="${SAFE}" width="2" height="${FULL_H - 2 * SAFE}" fill="${ink}" fill-opacity="0.12"/>
      <text font-family="Helvetica, Arial, sans-serif" font-size="44" font-weight="700" fill="${ink}">${personalSvg}</text>
      <text font-family="Helvetica, Arial, sans-serif" font-size="40" fill="${ink}">${bodySvg}</text>
      <text font-family="Helvetica, Arial, sans-serif" font-size="40" font-weight="700" fill="${accent}">${ctaSvg}</text>
      <text x="${x + QR_PX + 40}" y="${qrTop + QR_PX - 20}" font-family="Helvetica, Arial, sans-serif" font-size="26" fill="${ink}" fill-opacity="0.75">${escapeXml(link)}</text>
      <text x="${x}" y="${FULL_H - SAFE + 6}" font-family="Helvetica, Arial, sans-serif" font-size="30" font-style="italic" fill="${ink}">${escapeXml(copy.sign_off)}</text>
    </svg>`;

  const qrSized = await sharp(qrPng).resize(QR_PX, QR_PX, { fit: "fill" }).png().toBuffer();

  return sharp(Buffer.from(svg))
    .composite([{ input: qrSized, top: qrTop, left: x }])
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
  const qrPng = await QRCode.toBuffer(bookingUrl, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: QR_PX,
    color: { dark: "#000000ff", light: "#ffffffff" },
  });

  const frontPng = await buildFront(imagePng, copy, brand, company);
  const backPng = await buildBack(copy, brand, bookingUrl, qrPng);
  const pdf = await buildPdf(frontPng, backPng);

  return { frontPng, backPng, qrPng, pdf };
}
