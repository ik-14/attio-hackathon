import { config } from "../config.js";
import type { MailStatus } from "../types.js";

// Minimal Attio write-back shim. The full attioClient is owned by the backend-core
// workstream; this covers only what the postcard module needs to report:
// the mail_status checkpoint, the macro sequence_stage, an activity note, and a
// pointer to the stored PDF/assets. Logs always; hits the REST API when a key is
// present. Kept deliberately small so it slots behind the real client later.

interface MailEvent {
  attio_record_id: string;
  mail_status: MailStatus;
  sequence_stage?: "mail_sent" | "needs_review";
  note: string;
  assets?: Record<string, string>; // label -> path/url (brief, copy, image, pdf, qr target)
}

export async function recordMailEvent(ev: MailEvent): Promise<void> {
  const assetLines = ev.assets
    ? Object.entries(ev.assets).map(([k, v]) => `  • ${k}: ${v}`).join("\n")
    : "";
  console.log(
    `[attio] record=${ev.attio_record_id} mail_status=${ev.mail_status}` +
      (ev.sequence_stage ? ` sequence_stage=${ev.sequence_stage}` : "") +
      `\n        ${ev.note}` +
      (assetLines ? `\n${assetLines}` : ""),
  );

  if (!config.attio.apiKey) return; // log-only mode (prep / offline)

  const base = "https://api.attio.com/v2";
  const headers = {
    authorization: `Bearer ${config.attio.apiKey}`,
    "content-type": "application/json",
  };

  const values: Record<string, unknown> = { mail_status: ev.mail_status };
  if (ev.sequence_stage) values.sequence_stage = ev.sequence_stage;

  try {
    const res = await fetch(
      `${base}/objects/${config.attio.object}/records/${ev.attio_record_id}`,
      { method: "PATCH", headers, body: JSON.stringify({ data: { values } }) },
    );
    if (!res.ok) console.warn(`[attio] attribute update ${res.status}: ${await res.text()}`);
  } catch (err) {
    console.warn(`[attio] attribute update failed: ${(err as Error).message}`);
  }

  // Activity note — the literal "Attio activity log" the demo leans on.
  try {
    const body = ev.note + (assetLines ? `\n\nAssets:\n${assetLines}` : "");
    const res = await fetch(`${base}/notes`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        data: {
          parent_object: config.attio.object,
          parent_record_id: ev.attio_record_id,
          title: "Postcard module",
          format: "plaintext",
          content: body,
        },
      }),
    });
    if (!res.ok) console.warn(`[attio] note ${res.status}: ${await res.text()}`);
  } catch (err) {
    console.warn(`[attio] note failed: ${(err as Error).message}`);
  }
}
