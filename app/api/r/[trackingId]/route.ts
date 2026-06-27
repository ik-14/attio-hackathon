export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { CORS_HEADERS, options } from "@/lib/cors";
import * as store from "@/lib/store";

export function OPTIONS() {
  return options();
}

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ trackingId: string }> }
) {
  const { trackingId } = await ctx.params;

  const lead = await store.getLeadByTrackingId(trackingId);
  if (lead) {
    await store.addNote(lead.attioRecordId, "Booking link clicked — QR/email link tracked");
    await store.updateLead(lead.attioRecordId, {
      sequenceStage: "engaged",
      dealStage: "Meeting Booked",
    });
    console.log(`[tracking] ${lead.name} clicked their link → engaged`);
  } else {
    console.log(`[tracking] unknown trackingId ${trackingId} — redirecting anyway`);
  }

  const redirectUrl = `${config.bookingPageUrl}?utm_content=${trackingId}`;
  return NextResponse.redirect(redirectUrl, { status: 302, headers: CORS_HEADERS });
}
