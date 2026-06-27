import { fetchBrandKit, normalizeDomain } from "./stages/fetchBrandKit.js";

// Quick Stage 0 smoke test — no mail pipeline, just the brand-kit fetch chain.
//   npm run fetch-brand stripe.com saas
//   npm run fetch-brand attio.com saas

const [domainArg, sectorArg] = process.argv.slice(2);
if (!domainArg) {
  console.error("Usage: npm run fetch-brand <domain> [sector]");
  process.exit(1);
}

const domain = normalizeDomain(domainArg);
const sector = sectorArg ?? "saas";

console.log(`\n=== Brand kit fetch — ${domain} (${sector}) ===\n`);
const kit = await fetchBrandKit(domain, sector);
console.log(JSON.stringify(kit, null, 2));
console.log("");
