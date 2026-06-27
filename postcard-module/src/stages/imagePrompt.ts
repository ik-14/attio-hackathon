import { generateJSON } from "../clients/llmClient.js";
import type { Brief, ImagePrompt } from "../types.js";

// Stage 3a — image-prompt authoring. An art director writes the prompt for the
// FRONT image. CRITICAL: no text/letters/logos/QR in the image — those are added
// deterministically in Stage 4. Leave breathing room for typesetting.

const SYSTEM = `You are an art director writing a prompt for an image model to create the FRONT of a bespoke postcard reflecting the prospect's brand aesthetic and sector. Specify palette, mood, composition and style precisely; aim for gallery-quality. CRITICAL: the image must contain NO text, letters, words, logos, watermarks or QR codes — copy, logo and QR are added later in layout. Leave visual breathing room for typesetting.

Output ONLY valid JSON matching this exact schema — every value must be a plain string, never a nested object:
{"image_prompt":"<single descriptive string>","negative_prompt":"<single descriptive string>","aspect_ratio":"<e.g. 3:2 landscape>"}`;

export async function authorImagePrompt(brief: Brief): Promise<{ prompt: ImagePrompt; via: string }> {
  const mock = (): ImagePrompt => ({
    image_prompt: `A gallery-quality abstract composition in the palette ${brief.brand_cues.palette.join(", ")}, evoking ${brief.brand_cues.sector}. ${brief.brand_cues.visual_style}. Soft directional light, premium editorial mood (${brief.tone}). Strong empty area in the lower third and upper-left for typesetting and a logo. No people, no signage.`,
    negative_prompt: "text, words, letters, logos, watermark, qr code, low quality, distorted",
    aspect_ratio: "3:2 landscape",
  });

  const { value, via } = await generateJSON<ImagePrompt>({
    system: SYSTEM,
    user: { brand_cues: brief.brand_cues, sector: brief.brand_cues.sector, tone: brief.tone },
    mock,
    label: "stage3a.imagePrompt",
  });

  const f = mock();
  const coerce = (v: unknown): string =>
    typeof v === "string" ? v.trim() : typeof v === "object" && v ? JSON.stringify(v) : "";
  const prompt: ImagePrompt = {
    image_prompt: coerce(value.image_prompt) || f.image_prompt,
    negative_prompt: coerce(value.negative_prompt) || f.negative_prompt,
    aspect_ratio: coerce(value.aspect_ratio) || f.aspect_ratio,
  };
  return { prompt, via };
}
