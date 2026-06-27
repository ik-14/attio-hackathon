import { generateImage as generateImageRaw } from "../clients/geminiImageClient.js";
import { fetchImagePng } from "../util/assets.js";
import type { BrandKit, GeneratedImage, ImagePrompt } from "../types.js";

// Stage 3b — generate the front image (Google Gemini). Feeds the real logo as a
// REFERENCE image to pull the look toward their brand — the logo must NOT appear
// in the generated image (no-text/no-logo rule); it is composited in Stage 4.
// Cache + fallbacks live in the client.
export async function generateFrontImage(
  prompt: ImagePrompt,
  brand: BrandKit,
  trackingId: string,
): Promise<GeneratedImage> {
  const references: Buffer[] = [];
  const logo = await fetchImagePng(brand.logo_url);
  if (logo) references.push(logo);
  return generateImageRaw(prompt, brand.palette, trackingId, references);
}
