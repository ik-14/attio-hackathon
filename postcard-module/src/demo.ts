import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runMailJob } from "./jobs/mail.js";
import { config } from "./config.js";
import type { MailInput } from "./types.js";

// Runnable end-to-end demo for the one rehearsed prospect.
//   npm run demo                       → uses fixtures/rehearsed-prospect.json
//   npm run demo -- path/to/input.json → any MailInput
//
// With no API keys set it runs fully offline (mock text + branded-placeholder
// image) and still writes a print-ready PDF to ./out/<tracking_id>/postcard.pdf.

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const arg = process.argv[2];
  const fixturePath = arg
    ? path.resolve(process.cwd(), arg)
    : path.resolve(__dirname, "../fixtures/rehearsed-prospect.json");

  const input = JSON.parse(await fs.readFile(fixturePath, "utf8")) as MailInput;

  // CALENDLY_URL override — useful for demo prep when the /r/:trackingId
  // redirect isn't live yet. In production the fixture/MailInput always uses
  // the tracking redirect, which forwards to Calendly after logging engagement.
  if (config.calendly.url) {
    input.booking_url = config.calendly.url;
    console.log(`[demo] CALENDLY_URL set — QR will encode: ${config.calendly.url}`);
  }

  console.log(`\n=== Postcard module — ${input.prospect.company} (${input.tracking_id}) ===\n`);
  const result = await runMailJob(input);

  console.log("\n=== Result ===");
  console.log(`mail_status : ${result.mail_status}`);
  console.log(`headline    : ${result.copy.headline}`);
  console.log(`hook        : ${result.brief.hook ?? "NULL"}`);
  if (result.pdfPath) console.log(`pdf         : ${result.pdfPath}`);
  if (result.lob_id) console.log(`lob_id      : ${result.lob_id}`);
  if (result.failure_reason) console.log(`failure     : ${result.failure_reason}`);
  console.log("");

  if (result.mail_status === "needs_human") process.exitCode = 2;
}

main().catch((err) => {
  console.error("demo failed:", err);
  process.exit(1);
});
