import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { config } from "@/lib/config";
import type { GeneratedImage, ImagePrompt } from "@/lib/postcard/types";

const ASPECT_DIMS: Record<string, { w: number; h: number }> = {
  "3:2 landscape": { w: 1500, h: 1000 },
  "3:2": { w: 1500, h: 1000 },
  "4:3": { w: 1333, h: 1000 },
  "1:1": { w: 1200, h: 1200 },
};

function dimsFor(aspect: string) {
  return ASPECT_DIMS[aspect] ?? ASPECT_DIMS["3:2 landscape"];
}

async function cachePath(trackingId: string): Promise<string> {
  const dir = path.join(os.tmpdir(), "strike-postcard-cache");
  await fs.mkdir(dir, { recursive: true });
  return path.join(dir, `${trackingId}.png`);
}

async function brandedPlaceholder(palette: string[], aspect: string): Promise<Buffer> {
  const { w, h } = dimsFor(aspect);
  const c1 = palette[0] ?? "#0b3d2e";
  const c2 = palette[1] ?? palette[0] ?? "#123";
  const c3 = palette[2] ?? c1;
  const svg = `
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${c1}"/>
          <stop offset="100%" stop-color="${c2}"/>
        </linearGradient>
        <radialGradient id="r" cx="78%" cy="28%" r="55%">
          <stop offset="0%" stop-color="${c3}" stop-opacity="0.55"/>
          <stop offset="100%" stop-color="${c3}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="${w}" height="${h}" fill="url(#g)"/>
      <rect width="${w}" height="${h}" fill="url(#r)"/>
      <circle cx="${w * 0.2}" cy="${h * 0.82}" r="${h * 0.28}" fill="${c3}" fill-opacity="0.10"/>
    </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function callGemini(model: string, prompt: ImagePrompt, referenceImages: Buffer[]): Promise<Buffer> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.geminiApiKey}`;
  const parts: unknown[] = [
    {
      text:
        `${prompt.image_prompt}\n\nAspect ratio: ${prompt.aspect_ratio}.\n` +
        `STRICT: no text, letters, words, logos, watermarks or QR codes in the image. ` +
        `Avoid: ${prompt.negative_prompt}`,
    },
    ...referenceImages.map((b) => ({
      inlineData: { mimeType: "image/png", data: b.toString("base64") },
    })),
  ];
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: { responseModalities: ["IMAGE"] },
    }),
  });
  if (!res.ok) throw new Error(`Gemini image ${model} ${res.status}: ${await res.text()}`);
  const data: unknown = await res.json();
  const inline = (data as { candidates?: { content?: { parts?: { inlineData?: { data?: string } }[] } }[] })
    ?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData?.data;
  if (!inline) throw new Error(`Gemini image ${model}: no image in response`);
  const { w, h } = dimsFor(prompt.aspect_ratio);
  return sharp(Buffer.from(inline, "base64")).resize(w, h, { fit: "cover" }).png().toBuffer();
}

export async function generateImage(
  prompt: ImagePrompt,
  palette: string[],
  trackingId: string,
  referenceImages: Buffer[] = [],
): Promise<GeneratedImage> {
  const cache = await cachePath(trackingId);

  try {
    const png = await fs.readFile(cache);
    return { png, model: "cache", cached: true };
  } catch {
    /* not cached yet */
  }

  if (!config.geminiApiKey) {
    console.warn("[image] no GEMINI_API_KEY → branded placeholder");
    const png = await brandedPlaceholder(palette, prompt.aspect_ratio);
    await fs.writeFile(cache, png);
    return { png, model: "placeholder", cached: false };
  }

  for (const model of [config.imageModel, config.imageFallbackModel]) {
    try {
      const png = await callGemini(model, prompt, referenceImages);
      await fs.writeFile(cache, png);
      return { png, model, cached: false };
    } catch (err) {
      console.warn(`[image] ${model} failed: ${(err as Error).message}`);
    }
  }

  console.warn("[image] all Gemini models failed → branded placeholder");
  const png = await brandedPlaceholder(palette, prompt.aspect_ratio);
  await fs.writeFile(cache, png);
  return { png, model: "placeholder", cached: false };
}
