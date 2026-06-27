import { GoogleGenAI } from "@google/genai";
import { config, has, MODELS } from "@/lib/config";
import type { Brief, Copy, ImagePrompt, MailInput, Prospect } from "@/lib/postcard/types";

let _ai: GoogleGenAI | null = null;
function ai(): GoogleGenAI {
  if (!_ai) _ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
  return _ai;
}

async function generateJson<T>(opts: {
  system: string;
  user: unknown;
  mock: () => T;
  label: string;
}): Promise<{ value: T; via: string }> {
  if (!has.gemini()) {
    console.warn(`[postcard-text] ${opts.label}: no key → mock`);
    return { value: opts.mock(), via: "mock" };
  }
  try {
    const response = await ai().models.generateContent({
      model: MODELS.textFast,
      contents: JSON.stringify(opts.user),
      config: {
        systemInstruction: opts.system,
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    });
    const text = response.text ?? "{}";
    const value = JSON.parse(text) as T;
    return { value, via: "gemini" };
  } catch (err) {
    console.warn(`[postcard-text] ${opts.label}: failed (${(err as Error).message}) → mock fallback`);
    return { value: opts.mock(), via: "mock-fallback" };
  }
}

const DISTIL_SYSTEM = `You are a creative director preparing ONE bespoke postcard for a cold prospect. From the enrichment signals provided, choose the single most specific, current, verifiably-true hook that proves we did our homework. Never invent facts; only use what is in the signals. If no strong, current hook exists, set "hook" to null. Use the supplied brand palette as-is.

Output ONLY valid JSON matching this exact schema — no wrapper keys, no extra nesting:
{"hook":"<string or null>","hook_source":"<url string or null>","brand_cues":{"palette":["<hex>"],"visual_style":"<string>","sector":"<string>"},"tone":"<string>","why_relevant":"<string>"}`;

export async function distil(input: MailInput): Promise<{ brief: Brief; via: string }> {
  const { prospect, enrichment, brand_kit } = input;

  const user = {
    prospect: {
      first_name: prospect.first_name,
      last_name: prospect.last_name,
      title: prospect.title,
      company: prospect.company,
      industry: prospect.industry,
    },
    enrichment,
    palette: brand_kit.palette,
    fonts: brand_kit.fonts,
  };

  const mock = (): Brief => {
    const sorted = [...enrichment].sort(
      (a, b) => (b.published_date ?? "").localeCompare(a.published_date ?? ""),
    );
    const top = sorted[0];
    return {
      hook: top ? top.signal : null,
      hook_source: top ? top.source_url : null,
      brand_cues: {
        palette: brand_kit.palette,
        visual_style: "clean, modern, editorial; generous negative space",
        sector: prospect.industry,
      },
      tone: "warm, curious, peer-to-peer — not salesy",
      why_relevant: top
        ? `${prospect.company} just had a notable moment (${top.signal}); a timely, human note lands now.`
        : `Reaching out to ${prospect.company} while the timing is fresh.`,
    };
  };

  const { value, via } = await generateJson<Brief>({ system: DISTIL_SYSTEM, user, mock, label: "stage1.distil" });

  const fallback = mock();
  const brief: Brief = {
    hook: value.hook ?? null,
    hook_source: value.hook_source ?? (value.hook ? fallback.hook_source : null),
    brand_cues: {
      palette: value.brand_cues?.palette?.length ? value.brand_cues.palette : brand_kit.palette,
      visual_style: value.brand_cues?.visual_style || fallback.brand_cues.visual_style,
      sector: value.brand_cues?.sector || prospect.industry,
    },
    tone: value.tone || fallback.tone,
    why_relevant: value.why_relevant || fallback.why_relevant,
  };
  return { brief, via };
}

const COPY_SYSTEM = `You write short, warm, non-salesy direct-mail copy for a cold prospect who received something physical. Reference the hook naturally — show we paid attention. Nudge them to scan the QR. No hard pitch.

CARD LAYOUT — copy is typeset on the FRONT over the brand image; the back stays clean for address + postage:
  headline → personal_line → body → cta → sign_off (left column) + QR code (bottom-right, auto-generated).

SLOT BUDGETS — stay within these or the font shrinks and the card looks cramped:
• headline:      ≤ 6 words preferred (8 words absolute max). Hook-led, large bold display type. Make it count.
• personal_line: ≤ 100 characters. Single sentence referencing the hook — shows we did our homework.
• body:          ≤ 150 characters (~25 words). Warm paragraph: why the timing matters + one natural mention of what we do. TIGHT SLOT — every word must earn its place.
• cta:           ≤ 80 characters (~10 words). "Scan to [book / grab / schedule] a [call / chat]" — always nudge toward a meeting.
• sign_off:      ≤ 40 characters (3–5 words). Warm closing.

Output ONLY valid JSON matching this exact schema — no wrapper keys, no extra nesting:
{"headline":"<≤6 words, hook-led, large display>","personal_line":"<≤100 chars, references the hook>","body":"<≤150 chars warm paragraph>","cta":"<≤80 chars, scan to book/schedule>","sign_off":"<≤40 chars warm closing>"}`;

export async function writeCopy(brief: Brief, prospect: Prospect): Promise<{ copy: Copy; via: string }> {
  const mock = (): Copy => {
    const hookLine = brief.hook
      ? `We saw ${prospect.company} ${brief.hook.replace(/^\w/, (c) => c.toLowerCase())}.`
      : `We've been following ${prospect.company}.`;
    return {
      headline: brief.hook ? "Saw your news — nice work" : "A note from us to you",
      personal_line: `${hookLine} Genuinely impressive timing.`,
      body: ((): string => {
        const full = `${brief.why_relevant} We thought a real card beat another email.`;
        return full.length <= 148 ? full : `${full.slice(0, 145).trimEnd()}…`;
      })(),
      cta: "Scan to book a quick chat — no pitch, just a conversation.",
      sign_off: "— Looking forward, the team",
    };
  };

  const { value, via } = await generateJson<Copy>({ system: COPY_SYSTEM, user: brief, mock, label: "stage2.copy" });

  const f = mock();
  const copy: Copy = {
    headline: value.headline?.trim() || f.headline,
    personal_line: value.personal_line?.trim() || f.personal_line,
    body: value.body?.trim() || f.body,
    cta: value.cta?.trim() || f.cta,
    sign_off: value.sign_off?.trim() || f.sign_off,
  };
  return { copy, via };
}

const IMAGE_PROMPT_SYSTEM = `You are a graphic designer commissioning a FRONT background image for a premium direct-mail postcard. The image must be MINIMAL and ELEGANT — think color-field painting, luxury brand campaign, or fine art print. The dominant color must come from the brand palette.

TWO NON-NEGOTIABLE COMPOSITION ZONES:
1. LOWER THIRD (bottom 35% of frame): must be naturally darker — a deep tonal gradient or vignette toward the bottom — because a large bold white headline (~96px) is typeset directly over this zone. The darkness must come from the image itself, not only a code overlay.
2. UPPER-LEFT CORNER (top ~12% height, left ~22% width): must be clean, minimal and uncluttered — a brand logo is composited here at full opacity. No texture, pattern or focal point in this zone.

OVERALL: near-solid composition — very subtle texture or soft tonal shift is acceptable, but NO complex scenes, NO objects, NO people, NO architecture, NO busy patterns. The entire image is breathing room for typography. CRITICAL: absolutely NO text, letters, numbers, logos, watermarks, QR codes or symbols anywhere.

Output ONLY valid JSON matching this exact schema — every value must be a plain string, never a nested object:
{"image_prompt":"<art direction: dominant color, lower-third tonal treatment, upper-left clarity, texture/finish, mood — 2-3 sentences>","negative_prompt":"<exhaustive list of things to exclude>","aspect_ratio":"3:2 landscape"}`;

export async function authorImagePrompt(brief: Brief): Promise<{ prompt: ImagePrompt; via: string }> {
  const mock = (): ImagePrompt => ({
    image_prompt: `A gallery-quality abstract composition in the palette ${brief.brand_cues.palette.join(", ")}, evoking ${brief.brand_cues.sector}. ${brief.brand_cues.visual_style}. Soft directional light, premium editorial mood (${brief.tone}). Strong empty area in the lower third and upper-left for typesetting and a logo. No people, no signage.`,
    negative_prompt: "text, words, letters, logos, watermark, qr code, low quality, distorted",
    aspect_ratio: "3:2 landscape",
  });

  const { value, via } = await generateJson<ImagePrompt>({
    system: IMAGE_PROMPT_SYSTEM,
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
