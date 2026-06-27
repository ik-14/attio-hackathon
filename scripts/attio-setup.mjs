// Idempotent Attio workspace setup for Strike.
// Creates the select options the pipeline writes, and tries to enable Deals.
// Run: node scripts/attio-setup.mjs   (reads ATTIO_API_KEY from .env.local)
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);
const K = env.ATTIO_API_KEY;
if (!K) throw new Error("ATTIO_API_KEY missing in .env.local");

const base = "https://api.attio.com/v2";
const H = { Authorization: `Bearer ${K}`, "Content-Type": "application/json" };

async function api(method, path, body) {
  const r = await fetch(base + path, {
    method,
    headers: H,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: r.status, json };
}

// Create a select option (idempotent — Attio 4xx if it already exists, which we ignore).
async function ensureOption(attr, title) {
  const r = await api("POST", `/objects/people/attributes/${attr}/options`, {
    data: { title },
  });
  const ok = r.status >= 200 && r.status < 300;
  const dup =
    !ok &&
    JSON.stringify(r.json).toLowerCase().includes("already") ;
  console.log(`  ${attr} ← "${title}": ${ok ? "created" : dup ? "exists" : "ERR " + r.status + " " + JSON.stringify(r.json).slice(0, 160)}`);
}

const SELECTS = {
  sequence_stage: ["discovered", "enriched", "outreach_sent", "engaged", "needs_review"],
  source: ["seed", "apollo", "attio_lookalike"],
  mail_status: ["ready_to_send", "needs_human", "sent"],
};

console.log("== Select options ==");
for (const [attr, opts] of Object.entries(SELECTS)) {
  for (const o of opts) await ensureOption(attr, o);
}

console.log("\n== Deals object ==");
const dealsCheck = await api("GET", "/objects/deals/attributes");
if (dealsCheck.status === 200) {
  console.log("  deals already enabled");
} else {
  console.log(`  deals not enabled (GET attrs → ${dealsCheck.status}). Attempting to create object…`);
  const create = await api("POST", "/objects", {
    data: {
      api_slug: "deals",
      singular_noun: "Deal",
      plural_noun: "Deals",
    },
  });
  console.log(`  create objects/deals → ${create.status} ${JSON.stringify(create.json).slice(0, 240)}`);
  if (create.status >= 200 && create.status < 300) {
    // A freshly-created custom object needs a status attribute for the stage kanban.
    const statusAttr = await api("POST", "/objects/deals/attributes", {
      data: {
        title: "Stage",
        api_slug: "stage",
        type: "status",
        is_required: false,
        is_unique: false,
        is_multiselect: false,
      },
    });
    console.log(`  create stage attr → ${statusAttr.status} ${JSON.stringify(statusAttr.json).slice(0, 200)}`);
  }
}

console.log("\nDone.");
