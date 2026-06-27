export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createHmac } from "crypto";
import { json, options } from "@/lib/cors";
import { config, has } from "@/lib/config";
import * as store from "@/lib/store";

export function OPTIONS() {
  return options();
}

function verifyCalendlySignature(rawBody: string, header: string | null): boolean {
  if (!has.calendly() || !header) {
    // Skip verification gracefully if no signing key configured
    return true;
  }
  // Header format: t=<timestamp>,v1=<hmac>
  const parts = Object.fromEntries(
    header.split(",").map((s) => s.split("=") as [string, string])
  );
  const ts = parts["t"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;

  const expected = createHmac("sha256", config.calendlyWebhookSigningKey)
    .update(`${ts}.${rawBody}`)
    .digest("hex");

  return expected === v1;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("Calendly-Webhook-Signature");

  if (!verifyCalendlySignature(rawBody, signature)) {
    console.warn("[calendly] invalid webhook signature");
    return json({ error: "invalid signature" }, { status: 401 });
  }

  let body: { event?: string; payload?: Record<string, unknown> };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return json({ error: "invalid JSON" }, { status: 400 });
  }

  if (body.event !== "invitee.created") {
    return json({ ignored: true, event: body.event });
  }

  const payload = body.payload ?? {};
  // Calendly puts utm_content in payload.tracking.utm_content
  const tracking = payload.tracking as Record<string, string> | undefined;
  const trackingId = tracking?.utm_content;

  if (trackingId) {
    const lead = await store.getLeadByTrackingId(trackingId);
    if (lead) {
      await store.markEngaged(trackingId, "Meeting Booked");
      await store.addNote(
        lead.attioRecordId,
        `Calendly booking received — meeting scheduled, deal → Meeting Booked`
      );
      console.log(`[calendly] ${lead.name} booked a meeting → engaged + Meeting Booked`);
    } else {
      console.log(`[calendly] invitee.created — no lead for trackingId=${trackingId}`);
    }
  } else {
    console.log(`[calendly] invitee.created — no utm_content in tracking`, {
      email: payload.email,
    });
  }

  return json({ ok: true });
}
