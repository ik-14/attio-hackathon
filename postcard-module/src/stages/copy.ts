import { generateJSON } from "../clients/llmClient.js";
import type { Brief, Copy, Prospect, SenderContext } from "../types.js";

// Stage 2 — copy. Short, warm, non-salesy. Reference the hook, build curiosity,
// nudge to the booking link/QR. No hard pitch. The CTA points at the QR/tracked
// link, not Calendly by name (the redirect decides where it lands).

const SYSTEM = `You write short, warm, non-salesy direct-mail copy for a cold prospect who may have received a teaser that something physical was coming. Reference the hook naturally — show we paid attention. Weave in what the sender does (from "sender_context.what_we_do") naturally in the body — one sentence, no jargon, not salesy. Build curiosity and nudge them to scan the QR to book time. No hard pitch.

HARD CHARACTER LIMITS — all text appears on the front of the card, these MUST be respected:
- headline: max 8 words
- personal_line: max 80 characters (2 short lines on front)
- body: max 150 characters (3 short lines on front)
- cta: max 60 characters (bold accent line above the QR code)
- sign_off: max 40 characters

You MUST respond with a JSON object using EXACTLY these field names:
{
  "headline": "<= 8 words, hook-led",
  "personal_line": "max 100 chars — single punchy sentence referencing the hook",
  "body": "max 200 chars — why_relevant + natural mention of what we do",
  "cta": "max 80 chars — nudge to scan the QR",
  "sign_off": "max 40 chars"
}`;

export async function writeCopy(
  brief: Brief,
  prospect: Prospect,
  sender: SenderContext,
): Promise<{ copy: Copy; via: string }> {
  const mock = (): Copy => {
    const hookLine = brief.hook
      ? `We saw ${prospect.company} ${brief.hook.replace(/^\w/, (c) => c.toLowerCase())}.`
      : `We've been following ${prospect.company}.`;
    return {
      headline: brief.hook ? "Saw your news — nice work" : "A note from us to you",
      personal_line: `${hookLine} Genuinely impressive timing.`,
      body: `${brief.why_relevant} ${sender.what_we_do} We thought a real card beat another email.`,
      cta: "Scan the code to grab 15 minutes — no pitch, just a chat.",
      sign_off: "— Looking forward, the team",
    };
  };

  const user = { brief, sender_context: sender };
  const { value, via } = await generateJSON<Copy>({ system: SYSTEM, user, mock, label: "stage2.copy" });

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
