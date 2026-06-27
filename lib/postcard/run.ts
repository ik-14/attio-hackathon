import { distil, writeCopy, authorImagePrompt } from "@/lib/postcard/text";
import { generateImage } from "@/lib/postcard/clients/geminiImageClient";
import { fetchImagePng } from "@/lib/postcard/util/assets";
import { compose } from "@/lib/postcard/compose";
import { runChecks } from "@/lib/postcard/checks";
import { sendViaLob } from "@/lib/postcard/clients/lobClient";
import type { MailInput, MailResult } from "@/lib/postcard/types";

// Hard compositional constraints injected in code — these always reach Gemini
// regardless of what stage 3a authored, describing the fixed zones compose overlays:
// dark lower third for the headline scrim, clean upper-left for the logo.
const LAYOUT_CONSTRAINTS = `
FIXED LAYOUT ZONES (enforce as hard constraints):
- Lower third of frame: render significantly darker than the mid-tone — deep gradient or natural shadow toward the bottom. A large bold white headline overlays this zone; low contrast here makes the card illegible.
- Upper-left area (approx. top 12% height × left 22% width): render completely clean and free of texture, pattern or focal detail. A brand logo composites here at full opacity; any competing visual breaks the brand mark.
- No text, letters, symbols, logos, QR codes or brand marks anywhere in the image.`.trim();

const _postcardImages = new Map<string, Buffer>();

export function getPostcardImage(trackingId: string): Buffer | undefined {
  return _postcardImages.get(trackingId);
}

export async function runPostcard(input: MailInput): Promise<MailResult> {
  const { tracking_id, brand_kit, booking_url, prospect } = input;
  const log = (m: string) => console.log(`[postcard ${tracking_id}] ${m}`);

  const { brief, via: v1 } = await distil(input);
  log(`stage1 distil via=${v1} hook=${brief.hook ? `"${brief.hook.slice(0, 48)}"` : "NULL"}`);

  const { copy, via: v2 } = await writeCopy(brief, prospect);
  log(`stage2 copy via=${v2} headline="${copy.headline}"`);

  const { prompt, via: v3 } = await authorImagePrompt(brief);
  log(`stage3a image-prompt via=${v3}`);

  const logo = await fetchImagePng(brand_kit.logo_url);
  const references: Buffer[] = logo ? [logo] : [];
  // Always append the fixed-zone constraints so they reach the model even if
  // stage 3a's prompt didn't mention the composition zones explicitly.
  const enhancedPrompt = { ...prompt, image_prompt: `${prompt.image_prompt}\n\n${LAYOUT_CONSTRAINTS}` };
  const image = await generateImage(enhancedPrompt, brand_kit.palette, tracking_id, references);
  log(`stage3b image model=${image.model}${image.cached ? " (cached)" : ""}`);

  const card = await compose(image.png, copy, brand_kit, booking_url, prospect.company);
  log(`stage4 composed front+back+QR pdf=${card.pdf.length}b`);

  _postcardImages.set(tracking_id, card.frontPng);

  const checks = await runChecks(brief, copy, card, booking_url);
  log(`stage5 checks ${checks.ok ? "PASS" : "FAIL"} → ${checks.ran.map((r) => `${r.name}:${r.ok ? "✓" : "✗"}`).join(" ")}`);

  if (!checks.ok) {
    const reason = `Stage 5 failed: ${checks.failures.join("; ")}`;
    log(`HELD for human — ${reason}`);
    return {
      trackingId: tracking_id,
      mailStatus: "needs_human",
      frontPngAvailable: true,
      copy,
      brief,
    };
  }

  const lob = await sendViaLob(input, card.frontPng, card.backPng);
  log(`stage6 lob id=${lob.id} mock=${lob.mock}`);

  return {
    trackingId: tracking_id,
    mailStatus: "sent",
    proofUrl: lob.proof_url,
    frontPngAvailable: true,
    copy,
    brief,
  };
}
