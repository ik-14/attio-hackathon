import { generateImage as generateImageRaw } from "../clients/geminiImageClient.js";
import { fetchImagePng } from "../util/assets.js";
import type { BrandKit, GeneratedImage, ImagePrompt } from "../types.js";

// Hard compositional constraints injected in code — these always reach Gemini
// regardless of what Stage 3a authored. They describe fixed zones that the
// compose stage will overlay deterministically:
//   • Lower third: black-to-transparent scrim + 96px bold headline typeset here
//   • Upper-left: brand logo composited at ~320×120px, needs a clean field
const LAYOUT_CONSTRAINTS = `
FIXED LAYOUT ZONES (enforce these as hard constraints):
- Lower third of frame: render significantly darker than the mid-tone — deep gradient or natural shadow toward the bottom. A large bold white headline will overlay this zone; low contrast here makes the card illegible.
- Upper-left area (approx. top 12% height × left 22% width): render completely clean and free of texture, pattern, or focal detail. A brand logo composites here at full opacity; any competing visual breaks the brand mark.
- No text, letters, symbols, logos, QR codes, or brand marks anywhere in the image.`.trim();

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

  // Append hard layout constraints in code so they are always present even if
  // Stage 3a's image_prompt doesn't mention the composition zones explicitly.
  const enhancedPrompt: ImagePrompt = {
    ...prompt,
    image_prompt: `${prompt.image_prompt}\n\n${LAYOUT_CONSTRAINTS}`,
  };

  return generateImageRaw(enhancedPrompt, brand.palette, trackingId, references);
}
