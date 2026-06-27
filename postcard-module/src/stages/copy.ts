import { generateJSON } from "../clients/llmClient.js";
import type { Brief, Copy, Prospect } from "../types.js";

// Stage 2 — copy. Short, warm, non-salesy. Reference the hook, build curiosity,
// nudge to the booking link/QR. No hard pitch. The CTA points at the QR/tracked
// link, not Calendly by name (the redirect decides where it lands).

const SYSTEM = `You write short, warm, non-salesy direct-mail copy for a cold prospect who may have received a teaser that something physical was coming. Reference the hook naturally — show we paid attention. Build curiosity and nudge them to the booking link. No hard pitch. Keep it postcard-short. Output JSON only.`;

export async function writeCopy(brief: Brief, prospect: Prospect): Promise<{ copy: Copy; via: string }> {
  const mock = (): Copy => {
    const hookLine = brief.hook
      ? `We saw ${prospect.company} ${brief.hook.replace(/^\w/, (c) => c.toLowerCase())}.`
      : `We've been following ${prospect.company}.`;
    return {
      headline: brief.hook ? "Saw your news — nice work" : "A note from us to you",
      personal_line: `${hookLine} Genuinely impressive timing.`,
      body: `${brief.why_relevant} We thought a real card beat another email.`,
      cta: "Scan the code to grab 15 minutes — no pitch, just a chat.",
      sign_off: "— Looking forward, the team",
    };
  };

  const { value, via } = await generateJSON<Copy>({ system: SYSTEM, user: brief, mock, label: "stage2.copy" });

  // Backfill any field a live model omitted, so compose always has full copy.
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
