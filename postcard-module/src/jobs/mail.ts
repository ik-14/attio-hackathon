import { promises as fs } from "node:fs";
import path from "node:path";
import { config } from "../config.js";
import { recordMailEvent } from "../clients/attioClient.js";
import { distil } from "../stages/distil.js";
import { writeCopy } from "../stages/copy.js";
import { authorImagePrompt } from "../stages/imagePrompt.js";
import { generateFrontImage } from "../stages/generateImage.js";
import { compose } from "../stages/compose.js";
import { runChecks } from "../stages/checks.js";
import { send } from "../stages/send.js";
import type { MailInput, MailResult } from "../types.js";

// The postcard module = the body of the /jobs/mail handler. Runs Stage 1→6 for a
// single `teaser_sent` lead idle 2+ days, fully autonomously. The ONLY human
// touch is a failed Stage 5 check → mail_status = needs_human. Stage 0 (brand
// kit) is cut and supplied on the input per execution-plan workstream B.

async function persist(trackingId: string, files: Record<string, Buffer | string>): Promise<Record<string, string>> {
  const dir = path.resolve(config.outDir, trackingId);
  await fs.mkdir(dir, { recursive: true });
  const written: Record<string, string> = {};
  for (const [name, data] of Object.entries(files)) {
    const p = path.join(dir, name);
    await fs.writeFile(p, typeof data === "string" ? data : new Uint8Array(data));
    written[name] = p;
  }
  return written;
}

export async function runMailJob(input: MailInput): Promise<MailResult> {
  const { tracking_id, attio_record_id, brand_kit, booking_url, prospect } = input;
  const log = (m: string) => console.log(`[mail ${tracking_id}] ${m}`);

  // Stage 1–3a — text (SIE generate primary; mock keeps it running offline).
  const { brief, via: v1 } = await distil(input);
  log(`stage1 distil via=${v1} hook=${brief.hook ? `"${brief.hook.slice(0, 48)}…"` : "NULL"}`);

  const { copy, via: v2 } = await writeCopy(brief, prospect);
  log(`stage2 copy via=${v2} headline="${copy.headline}"`);

  const { prompt, via: v3 } = await authorImagePrompt(brief);
  log(`stage3a image-prompt via=${v3}`);

  // Stage 3b — image (Google Gemini; cache + placeholder fallback).
  const image = await generateFrontImage(prompt, brand_kit, tracking_id);
  log(`stage3b image via=${image.model}${image.cached ? " (cached)" : ""}`);

  // Stage 4 — deterministic compose.
  const card = await compose(image.png, copy, brand_kit, booking_url, prospect.company);
  log(`stage4 composed front+back+QR, pdf=${card.pdf.length}b`);

  // Stage 5 — automated checks + save assets for traceability.
  const checks = await runChecks(brief, copy, card, booking_url);
  const assets = await persist(tracking_id, {
    "brief.json": JSON.stringify(brief, null, 2),
    "copy.json": JSON.stringify(copy, null, 2),
    "image-prompt.json": JSON.stringify(prompt, null, 2),
    "front.png": card.frontPng,
    "back.png": card.backPng,
    "qr.png": card.qrPng,
    "postcard.pdf": card.pdf,
  });
  log(`stage5 checks ${checks.ok ? "PASS" : "FAIL"} → ${checks.ran.map((r) => `${r.name}:${r.ok ? "✓" : "✗"}`).join(" ")}`);

  const assetPointers = {
    pdf: assets["postcard.pdf"],
    image: assets["front.png"],
    brief: assets["brief.json"],
    qr_target: booking_url,
    brand_source: brand_kit.source,
  };

  if (!checks.ok) {
    const reason = `Stage 5 failed: ${checks.failures.join("; ")}`;
    await recordMailEvent({
      attio_record_id,
      mail_status: "needs_human",
      sequence_stage: "needs_review",
      note: `Postcard held for review. ${reason}`,
      assets: assetPointers,
    });
    log(`HELD for human — ${reason}`);
    return { tracking_id, attio_record_id, mail_status: "needs_human", brief, copy, pdfPath: assets["postcard.pdf"], failure_reason: reason };
  }

  await recordMailEvent({
    attio_record_id,
    mail_status: "ready_to_send",
    note: `Postcard generated and passed all pre-send checks. Hook: "${brief.hook}". Brand source: ${brand_kit.source}.`,
    assets: assetPointers,
  });

  // Stage 6 — send via Lob (test mode) + write back.
  const lob = await send(input, card);
  await recordMailEvent({
    attio_record_id,
    mail_status: "sent",
    sequence_stage: "mail_sent",
    note: `Postcard sent via Lob${lob.mock ? " (mock — no key)" : " test mode"} id=${lob.id}. QR → ${booking_url}.`,
    assets: { ...assetPointers, lob_id: lob.id, ...(lob.proof_url ? { lob_proof: lob.proof_url } : {}) },
  });
  log(`stage6 sent via Lob id=${lob.id}${lob.mock ? " (mock)" : ""}`);

  return {
    tracking_id,
    attio_record_id,
    mail_status: "sent",
    brief,
    copy,
    pdfPath: assets["postcard.pdf"],
    lob_id: lob.id,
    proof_url: lob.proof_url,
  };
}
