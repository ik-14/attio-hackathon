// Resend email send. Stub: logs the email + returns a fake id.

import { Resend } from "resend";
import { config, has } from "@/lib/config";

let _resend: Resend | null = null;
function client() {
  if (!_resend) _resend = new Resend(config.resendApiKey);
  return _resend;
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ id: string }> {
  if (!has.resend()) {
    console.log(`[resend stub] sendEmail to=${params.to} subject="${params.subject}"`);
    return { id: `stub-email-${Math.random().toString(36).slice(2, 10)}` };
  }
  const { data, error } = await client().emails.send({
    from: "Reachd <onboarding@resend.dev>",
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
  if (error || !data) throw new Error(error?.message ?? "resend send failed");
  return { id: data.id };
}
