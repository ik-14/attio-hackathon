import sharp from "sharp";

const escapeXml = (s: string) =>
  s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!));

export async function fetchImagePng(url: string | null | undefined): Promise<Buffer | null> {
  if (!url) return null;
  try {
    if (url.startsWith("data:")) {
      const b64 = url.split(",")[1] ?? "";
      return sharp(Buffer.from(b64, "base64")).png().toBuffer();
    }
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return sharp(buf).png().toBuffer();
  } catch {
    return null;
  }
}

export async function wordmarkPng(company: string, color: string, bg = "transparent"): Promise<Buffer> {
  const initials = company
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const label = company.length > 18 ? `${company.slice(0, 18)}…` : company;
  const w = 130 + label.length * 19;
  const h = 120;
  const svg = `
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${w}" height="${h}" rx="16" fill="${bg}"/>
      <circle cx="60" cy="60" r="40" fill="${color}"/>
      <text x="60" y="60" font-family="Helvetica, Arial, sans-serif" font-size="34" font-weight="700"
            fill="#ffffff" text-anchor="middle" dominant-baseline="central">${escapeXml(initials)}</text>
      <text x="118" y="60" font-family="Helvetica, Arial, sans-serif" font-size="34" font-weight="600"
            fill="${color}" dominant-baseline="central">${escapeXml(label)}</text>
    </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export { escapeXml };
