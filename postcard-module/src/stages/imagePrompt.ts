import { generateJSON } from "../clients/llmClient.js";
import type { Brief, ImagePrompt } from "../types.js";

// Stage 3a — image-prompt authoring. An art director writes the prompt for the
// FRONT image. CRITICAL: no text/letters/logos/QR in the image — those are added
// deterministically in Stage 4. Leave breathing room for typesetting.

const SYSTEM = `You are a graphic designer commissioning a background for a premium direct-mail postcard. The image must be MINIMAL and ELEGANT — think color-field painting, luxury brand campaign, or fine art print. The dominant color must come from the brand palette provided. The composition should be nearly solid — very subtle texture, soft vignette, or a gentle tonal shift is acceptable, but NO complex scenes, NO objects, NO people, NO architecture. The entire image should feel like breathing room for typography. CRITICAL: absolutely NO text, letters, numbers, logos, watermarks, QR codes, or symbols of any kind. Output JSON only.

Output schema:
{
  "image_prompt": "precise art direction: dominant color, subtle texture/finish, mood — 2-3 sentences max",
  "negative_prompt": "exhaustive list of things to exclude",
  "aspect_ratio": "3:2 landscape"
}`;

export async function authorImagePrompt(brief: Brief): Promise<{ prompt: ImagePrompt; via: string }> {
  const dominantColor = brief.brand_cues.palette[0] ?? "#1a1a2e";
  const accentColor   = brief.brand_cues.palette[1] ?? "#ffffff";

  const mock = (): ImagePrompt => ({
    image_prompt: `Minimal color-field background: a near-solid wash of ${dominantColor} with a very subtle radial vignette darkening toward the edges. Micro-texture like brushed metal or fine linen — barely perceptible. Soft gradient breath from ${dominantColor} to a slightly lighter ${accentColor} in the lower-right. Premium, gallery-quality, no subjects.`,
    negative_prompt: "people, faces, hands, objects, furniture, buildings, nature, sky, text, letters, words, numbers, logos, brand marks, watermarks, QR codes, barcodes, patterns, busy backgrounds, noise, grain, complex textures, photography, photorealism, HDR, oversaturated, cluttered, multiple colors fighting",
    aspect_ratio: "3:2 landscape",
  });

  const { value, via } = await generateJSON<ImagePrompt>({
    system: SYSTEM,
    user: {
      palette: brief.brand_cues.palette,
      sector: brief.brand_cues.sector,
      tone: brief.tone,
      instruction: "Near-solid minimal background. One dominant brand color. Maximum elegance, minimum complexity.",
    },
    mock,
    label: "stage3a.imagePrompt",
  });

  const f = mock();
  const prompt: ImagePrompt = {
    image_prompt: value.image_prompt?.trim() || f.image_prompt,
    negative_prompt: value.negative_prompt?.trim() || f.negative_prompt,
    aspect_ratio: value.aspect_ratio?.trim() || f.aspect_ratio,
  };
  return { prompt, via };
}
