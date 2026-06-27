import { generateJSON } from "../clients/llmClient.js";
import type { Brief, Copy, Prospect, SenderContext } from "../types.js";

// Stage 2 — copy. Short, warm, non-salesy. Reference the hook, build curiosity,
// nudge to the booking link/QR. No hard pitch. The CTA points at the QR/tracked
// link, not Calendly by name (the redirect decides where it lands).

// Physical card layout — ALL copy lives on the FRONT, typeset over the hero
// image. Back is a clean solid brand color (Lob prints address + postage there).
// Slot budgets are COMFORTABLE TARGETS — aim for these so each field renders at
// its intended font size, not the scaled-down emergency minimum.
//
// FRONT (single side, left column; QR bottom-right corner — code-generated):
//   headline      — large bold display, ~90px, 3-line box (900px wide)
//   personal_line — medium opener,      ~40px, 2-line box (900px wide)
//   body          — body paragraph,     ~34px, 3-line box (900px wide) ← tight!
//   cta           — bold accent,        ~28px, 2-line box
//   sign_off      — small italic,               1 line

const SYSTEM = `You write short, warm, non-salesy direct-mail copy for a cold prospect who received something physical. Reference the hook naturally — show we paid attention. In the body, weave in one natural sentence about what the sender does (from sender_context.what_we_do) — no jargon, not salesy. Nudge them to scan the QR. No hard pitch.

CARD LAYOUT — everything on the FRONT, typeset over the brand image. No flip side:
  headline → personal_line → body → cta → sign_off (left column) + QR code (bottom-right, auto-generated).

SLOT BUDGETS — stay within these or the font shrinks and the card looks cramped:
• headline:      ≤ 6 words preferred (8 words absolute max). Hook-led. Large bold display type. Make it count.
• personal_line: ≤ 100 characters. Single sentence. The hook reference — shows we did our homework.
• body:          ≤ 150 characters (~25 words). Warm paragraph. Why this timing matters + one mention of what we do. TIGHT SLOT — every word must earn its place.
• cta:           ≤ 80 characters (~10 words). "Scan to [book / grab / schedule] a [call / chat / conversation]" — always nudge toward a meeting.
• sign_off:      ≤ 40 characters (3–5 words). Warm closing.

You MUST respond with a JSON object using EXACTLY these field names:
{
  "headline": "≤ 6 words, hook-led, large display type — make it count",
  "personal_line": "≤ 100 chars — single sentence referencing the hook",
  "body": "≤ 150 chars — warm paragraph: why_relevant + natural sender mention",
  "cta": "≤ 80 chars — scan to book/schedule a chat",
  "sign_off": "≤ 40 chars — warm closing"
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
      body: (() => {
        const full = `${brief.why_relevant} ${sender.what_we_do}`;
        return full.length <= 148 ? full : `${full.slice(0, 145).trimEnd()}…`;
      })(),
      cta: "Scan to book a quick chat — no pitch, just a conversation.",
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
