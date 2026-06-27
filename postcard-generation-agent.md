# Postcard generation — agent runbook (Step 4: "Mail sent")

> Module of the **warm-up-then-strike outreach agent** (Tech Europe × Attio — Agentic CRM track).
> Turns a prospect's enrichment signal into a bespoke postcard carrying a per-prospect tracked booking link, **saves the PDF to storage, then sends it via Lob — fully autonomously** — writing every step back to Attio.
>
> **This is where all personalisation lives.** The teaser email (Step 3) is deliberately generic; the mail piece is the payoff. Protect its quality.
>
> **No human in the loop on the happy path.** The agent generates, validates, stores and sends on its own — a human is only pulled in if an automated check fails. This is the brief's "close a deal without a human in the loop" north star, end to end.

## Where this sits

Runs after **Step 2 (enrichment)** — which now also fetches the prospect's **brand kit** (Stage 0) alongside news signals — and is triggered when the lead reaches the "mail" stage. The module generates the card, runs automated pre-send checks, stores the PDF, and sends via Lob without stopping, then hands off to **Step 5 (deal advanced)** via the engagement signals. A failed check is the only thing that flags a human.

> **Upstream dependency (Calendly plan):** the QR on this card encodes a per-prospect **tracked redirect** (`/r/:trackingId`), not a raw Calendly link. That means the lead must already have a `tracking_id` minted **at discovery**, before this module composes its card. Confirm with the discovery job that `tracking_id` is assigned early, not at send time — Stage 4 cannot build the QR without it.

## Inputs (preconditions)

```typescript
interface MailInput {
  prospect: {
    first_name: string;
    last_name: string;
    title: string;
    company: string;
    company_domain: string;        // used by the brand-kit fetch
    industry: string;
    email: string;                 // NOT printed on the card — used downstream to prefill Calendly on scan
    postal_address: {              // for Lob — never sent to the LLM
      line1: string; line2?: string;
      city: string; postcode: string; country: string;
    };
  };
  enrichment: Array<{              // from Step 2
    signal: string;                // e.g. "Closed £6m Series A, opening Shoreditch store"
    source_url: string;
    published_date?: string;
  }>;
  brand_kit: {                     // from Stage 0 (see below)
    logo_url: string | null;
    palette: string[];             // hex
    fonts: string[];
    source: "brandfetch" | "clearbit" | "scraped" | "fallback";
  };
  tracking_id: string;             // per-prospect id minted at discovery — the key Attio uses to attribute a scan/booking
  booking_url: string;             // the tracked redirect: https://<host>/r/:trackingId  (NOT a raw Calendly link)
  attio_record_id: string;
}
```

> **`booking_url` is the tracked redirect, not Calendly itself.** It points at `/r/:trackingId`, which on scan (a) logs the click and flips the lead to `engaged` in Attio, then (b) redirects to the Calendly booking page with the prospect's details prefilled. This module only needs to encode that redirect into the QR — it does **not** build the Calendly URL, prefill params, or webhook handling itself (see "Scan-time behaviour" below).

## Output

A print-ready postcard (front + back, with QR + real logo composited) that is **saved to storage, recorded on the Attio record, and submitted to Lob in test mode → proof PDF — all autonomously**. Engagement webhooks (QR scan/click → booking) later advance the deal.

## Scan-time behaviour (downstream — not this module, but the contract it serves)

Documented here so the QR target is unambiguous. When a prospect scans the QR:

1. The request hits `/r/:trackingId`. The redirect handler looks the lead up by `tracking_id` — it already holds `first_name`, `last_name`, `email`, `company`.
2. It **writes the click to Attio** (`sequence_stage = engaged` + activity note) immediately — before any booking happens.
3. It **redirects to Calendly with prefill + attribution params**, e.g.
   `https://calendly.com/<you>/intro?name=Jane%20Doe&email=jane@acme.com&a1=Acme%20Inc&utm_content=<tracking_id>`
   - `name` / `email` — Calendly built-in prefill so the prospect types nothing.
   - `a1`/`a2`… — custom-question answers (e.g. company). Requires those questions to exist on the event type.
   - `utm_content=<tracking_id>` (or a hidden custom question) — so the `invitee.created` webhook can map the booking back to the exact lead even if they book with a different email.

The postcard module's only responsibility in this chain is encoding the correct `/r/:trackingId` into a scannable QR. Prefill construction and webhook attribution live in the redirect/webhook handlers.

## Design principles (the four that keep it good and safe to send unsupervised)

1. **Distil before you generate** — build a creative brief from the enrichment signal first; never generate from raw research.
2. **Separate text from image** — generate the visual with *no words or logos in it*, then typeset copy and composite the real logo + QR in the layout layer. Avoids garbled AI text and keeps brand marks crisp.
3. **Compose deterministically** — layout, logo, QR, dimensions and bleed are code, not AI. Repeatable and print-correct.
4. **Validate automatically before sending** — since no human proofreads, an automated check gates the send (Stage 5). It catches the things that would embarrass an autonomous send: a fabricated/empty hook, broken QR, missing image, overflowing copy.

---

## Stage 0 — Brand-kit fetch (in Step 2 enrichment)

**Purpose:** pull the prospect's real logo, colours and fonts so the card is art-directed *for them*, not generic. Runs in parallel with the news-signal enrichment; keep the two jobs separate (brand kit = "what they look like"; enrichment = "what's true about them now").

**Fallback chain (domain in → brand kit out):**
1. **Brandfetch Brand API** (primary) — domain → logo + colour palette + fonts in one structured call. Best fit; purpose-built for this.
2. **Clearbit logo endpoint** (`logo.clearbit.com/{domain}`) for the mark if Brandfetch has no record.
3. **Site metadata** — parse `<link rel="icon">`, `apple-touch-icon`, and the `og:image` meta tag from the homepage HTML; read CSS custom properties (`--brand`, `--color-primary`) and `@font-face` for colours/fonts.
4. **Dominant-colour extraction** (e.g. node-vibrant) over the logo or a homepage screenshot if no palette is declared.
5. **Sector defaults** — a curated fallback palette/aesthetic per industry so a missing brand kit degrades gracefully instead of failing.

**Output schema:**
```json
{ "logo_url": "string|null", "palette": ["#..."], "fonts": ["..."], "source": "brandfetch|clearbit|scraped|fallback" }
```

**Feeds two places:** `palette`/`fonts` → Stage 1's `brand_cues` (populate directly rather than letting the LLM guess from prose); `logo_url` → Stage 3b (reference image) and Stage 4 (composited crisply in layout — never drawn by the model).

*Cautions:* coverage thins for small/obscure prospects (likely with Apollo ICP targeting) — that's why the chain ends in sector defaults. Confirm Brandfetch/Clearbit free-tier limits cover a demo. Use a prospect's brand assets only for the single personalised piece; don't redistribute. For the demo, pick a rehearsed prospect whose brand fetches cleanly.

## Stage 1 — Distil enrichment → personalisation brief

**Purpose:** pick the single strongest, current, true hook and assemble the brief. **Model:** `gemini-3.5-flash`. **Output:** JSON.

**System prompt:**
> You are a creative director preparing ONE bespoke postcard for a cold prospect. From the enrichment signals provided, choose the single most specific, current, verifiably-true hook that proves we did our homework. Never invent facts; only use what is in the signals. If no strong, current hook exists, set "hook" to null. Use the supplied brand palette as-is. Output JSON only.

**User:** `{ prospect (no address), enrichment, brand_kit.palette, brand_kit.fonts }`

**Output schema:**
```json
{
  "hook": "the one signal to reference (or null)",
  "hook_source": "source_url — for our verification",
  "brand_cues": { "palette": ["#..."], "visual_style": "", "sector": "" },
  "tone": "",
  "why_relevant": "why our outreach is timely given the hook"
}
```

> A `null` hook must **not** be sent blind — Stage 5's checks catch it and flag a human (see below).

## Stage 2 — Copy

**Purpose:** the words on the card — reference the hook, build curiosity, point to the booking link, no hard pitch. **Model:** `gemini-3.5-flash`. **Output:** JSON.

**System prompt:**
> You write short, warm, non-salesy direct-mail copy for a cold prospect who may have received a teaser that something physical was coming. Reference the hook naturally — show we paid attention. Build curiosity and nudge them to the booking link. No hard pitch. Keep it postcard-short. Output JSON only.

**User:** the brief JSON from Stage 1.

**Output schema:**
```json
{
  "headline": "<= 8 words, hook-led",
  "personal_line": "the 'we noticed…' line, 1–2 sentences",
  "body": "1–2 warm sentences carrying why_relevant",
  "cta": "low-friction nudge to the booking link / QR",
  "sign_off": ""
}
```

> The CTA should point at the **QR / tracked link**, not name Calendly directly — the redirect handles where it lands. "Scan to grab a time" reads better than a raw URL and keeps the printed card clean.

## Stage 3a — Image-prompt authoring

**Purpose:** a reasoning model writes the image prompt. **Model:** `gemini-3.5-flash`. **Output:** JSON.

**System prompt:**
> You are an art director writing a prompt for an image model to create the FRONT of a bespoke postcard reflecting the prospect's brand aesthetic and sector. Specify palette, mood, composition and style precisely; aim for gallery-quality. CRITICAL: the image must contain NO text, letters, words, logos, watermarks or QR codes — copy, logo and QR are added later in layout. Leave visual breathing room for typesetting. Output JSON only.

**User:** brief JSON (`brand_cues`, `sector`, `tone`).

**Output schema:**
```json
{
  "image_prompt": "full art-directed visual description",
  "negative_prompt": "text, words, letters, logos, watermark, qr code, low quality, distorted",
  "aspect_ratio": "3:2 landscape"
}
```

> The QR lives on the **back** (deterministic layout, Stage 4), so the front image carries no QR — the `negative_prompt` above already excludes it. If a layout ever puts the QR on the front, instruct the model to reserve a high-contrast quiet corner for it.

## Stage 3b — Generate image

- **Hero render:** `gemini-3-pro-image` (Nano Banana Pro) — best fidelity for the print/stage card.
- **Iterate + fallback:** `gemini-3.1-flash-image` (Nano Banana 2) — fast 512px previews while dialling in the prompt during prep; also the live fallback if Pro 503s.
- **Feed `brand_kit.logo_url` (and any sample imagery) as reference images** (NB2 takes up to 14) to pull the look toward their brand — but the logo must **not** appear *in* the generated image (no-text/no-logo rule); it's composited cleanly in Stage 4. The agent auto-selects the first successful variant.

*Confirm exact model strings + credits at the DeepMind table — these move (the `-preview` IDs were already retired).*

## Stage 4 — Compose (deterministic, code)

Text, logo and QR go on here — not the image model.

- **Front:** generated image + `headline` (and optionally `personal_line`) typeset in the brand font (`brand_kit.fonts`), with the **real logo** composited crisply.
- **Back:** `body` + `cta` + `sign_off` + **QR encoding `booking_url`** (= `/r/:trackingId`) + a short human-readable tracked link. Leave Lob's address + postage area clear.
- **QR:** render `booking_url` to a high-contrast QR ≥ ~2cm so it scans off paper — this is the engagement mechanism (scan/click = instant signal; completed booking = strongest). Generate it with a real QR library; never let the image model draw it.
- **Spec:** Lob postcard size (e.g. 6×4 / A6 equivalent), +bleed, 300dpi. Export front + back to a print-ready PDF.

## Stage 5 — Save to storage + automated pre-send checks (no human gate)

No human proofreads. Instead, an automated gate runs, then the agent stores and continues on its own.

1. **Automated pre-send checks** — abort and flag a human only if one fails:
   - `hook` is non-null (no fabricated or empty hook going out unsupervised).
   - Copy fits: `headline` ≤ ~8 words; `body` within the postcard's character budget.
   - Image present and at correct dimensions/resolution.
   - **QR resolves** — decode the rendered QR, confirm it decodes back to `booking_url` (`/r/:trackingId`), then fetch that URL and expect it to resolve (2xx, and to redirect onward toward the booking page). For the demo this also implicitly validates the `tracking_id` is real and the redirect host is publicly reachable — **not `localhost`**, or a phone scan won't resolve.
   - `brand_kit.source` logged (so a `fallback`-sourced card is traceable, not silently off-brand).
2. **Save the PDF** to object storage and **record it on the prospect's Attio record** (file attribute / note attachment, or the storage URL if files aren't first-class), with the generated assets (brief, copy, image, QR target) attached for traceability, status `ready_to_send`.
3. **On pass → proceed automatically to Stage 6.** On fail → status `needs_human`, write the failure reason to Attio, stop. (This is the only human touch, and it matches the project's "flag a human if something stalls" rule.)

*Confirm Attio's file-attachment support via API/MCP; if files aren't first-class, store the PDF in object storage and write the URL onto the record.*

## Stage 6 — Send via Lob (automatic) + write back to Attio

- Submit the final front/back to Lob in **test mode** → returns a proof PDF, no postage charged. (Pre-order one real card to your own address before the day for the physical prop.)
- **Store the final proof PDF on the Attio record**, set mail status to `sent`, keep `booking_url`. The booking_url's scan/click and the Calendly `invitee.created` webhook later flip the deal stage (Step 5).

*Confirm Lob's per-recipient merge-variable / QR support; if unsupported, submit the finished pre-rendered artifact per prospect.*

---

## Model reference (verify on the day)

| Role | Model string |
|---|---|
| Distil / copy / image-prompt | `gemini-3.5-flash` (or SIE `generate` on an open model — see build-plan.md §3) |
| Hero image | `gemini-3-pro-image` (Nano Banana Pro) |
| Image iteration + fallback | `gemini-3.1-flash-image` (Nano Banana 2) |

## Resilience & cost

- **Pre-generate and cache the full chain for the rehearsed prospects** — the hot image model throws 503s; never depend on a live first-try Pro call on stage. Wrap the image call in retry-with-backoff, fall back to a cached NB2 variant. Drive caching off `tracking_id`: if a saved artifact exists for that id, serve it; otherwise generate. Same code path runs live and cached — no separate "demo mode."
- **Demo gallery:** keep a few pre-generated cards for visibly different brands (distinct logos, palettes, sectors) to prove real customisation, then attempt one fresh card live with cache fallback. The QR on the live card still points at a real `/r/:trackingId` so the scan → `engaged` beat stays genuine.
- Generate **one** card live in the demo; show "runs as a batch" lightly. Don't fire hundreds of image calls (cost + abuse limits).
- All Gemini calls run **server-side**; keys in `.env`, gitignored — a key pushed to GitHub gets auto-revoked and silently breaks the whole team.
- **With no human proofread, quality rests entirely on the prompts + the Stage 5 checks.** Lock the prompts in AI Studio during prep (especially the "never fabricate a hook → null" behaviour), and demo on a pre-tested prospect.

## Build notes

- **Lock the Stage 0–3 JSON schemas in the first 15 minutes** — they're the data contract every node integrates against; build against mocks.
- **Confirm the `tracking_id` → `booking_url` contract with whoever owns discovery and the redirect/webhook handlers early** — this module assumes `tracking_id` is minted upstream and that `/r/:trackingId` handles prefill + attribution. If those aren't ready, the QR still composites, but the scan→engaged demo beat won't fire.
- The **fully autonomous loop is the demo headline** — "the agent finds the lead, researches it, designs a bespoke postcard, checks its own work, stores it in the CRM, and mails it — no human in the loop, Attio updating at every step." That's the brief's north star stated literally.
- **Ownership:** Dev 1 — enrichment + brand-kit (Stage 0) → distil; Dev 2 — copy + image + Lob + Attio write-back; Creative tech — compose/logo/QR/layout + the automated-check logic + demo; Marketing — hook quality + copy voice.
