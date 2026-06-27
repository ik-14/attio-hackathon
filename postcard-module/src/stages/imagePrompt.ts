import { generateJSON } from "../clients/llmClient.js";
import type { Brief, ImagePrompt } from "../types.js";

// Stage 3a — image-prompt authoring. An art director writes the prompt for the
// FRONT image. CRITICAL: no text/letters/logos/QR in the image — those are added
// deterministically in Stage 4. Leave breathing room for typesetting.

// Two fixed composition zones that code composites over the image every time.
// The model must treat them as hard constraints, not suggestions:
//
//   LOWER THIRD  → a large bold white headline typeset here at ~96px
//                  (the compose stage overlays a black-to-transparent scrim,
//                  but the image itself should already support a dark tone here)
//   UPPER-LEFT   → approx. top 12% height × left 22% width — brand logo composited
//                  crisply here; this area must be clean and uncluttered

const SYSTEM = `You are a graphic designer commissioning a FRONT background image for a premium direct-mail postcard. The image must be MINIMAL and ELEGANT — think color-field painting, luxury brand campaign, or fine art print. The dominant color must come from the brand palette.

TWO NON-NEGOTIABLE COMPOSITION ZONES:
1. LOWER THIRD (bottom 35% of frame): must be naturally darker — a deep tonal gradient or vignette toward the bottom — because a large bold white headline (~96px) will be typeset directly over this zone. The darkness must come from the image itself, not only from a code overlay.
2. UPPER-LEFT CORNER (top ~12% height, left ~22% width): must be clean, minimal, and uncluttered — a brand logo will be composited here at full opacity. No texture, pattern, or gradient focal point in this zone.

OVERALL: near-solid composition — very subtle texture or soft tonal shift is acceptable, but NO complex scenes, NO objects, NO people, NO architecture, NO busy patterns. The entire image is breathing room for typography. CRITICAL: absolutely NO text, letters, numbers, logos, watermarks, QR codes, or symbols anywhere. Output JSON only.

Output schema:
{
  "image_prompt": "precise art direction: dominant color, lower-third tonal treatment, upper-left clarity, subtle texture/finish, mood — 2-3 sentences",
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
