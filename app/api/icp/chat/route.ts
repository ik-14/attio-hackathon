export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { json, options } from "@/lib/cors";
import { parseIcp } from "@/lib/clients/geminiClient";
import { setIcp, getIcp } from "@/lib/icpStore";

export function OPTIONS() {
  return options();
}

export async function POST(request: Request) {
  let body: { message?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid JSON" }, { status: 400 });
  }

  const message = body.message?.trim();
  if (!message) return json({ error: "message required" }, { status: 400 });

  const icp = await parseIcp(message);
  setIcp(icp);

  const reply = `Got it! I've updated the ICP: targeting ${icp.titles.join(", ")} in ${icp.industries.join(", ")} (headcount ${icp.headcount[0]}–${icp.headcount[1]}).`;

  return json({ icp: getIcp(), reply });
}
