# Postcard module (Workstream B)

The bespoke-postcard generator for the warm-up-then-strike outreach agent — the
body of the `/jobs/mail` handler. Turns a prospect's enrichment signal into an
on-brand, print-ready postcard carrying a per-prospect tracked QR, runs automated
pre-send checks, stores the PDF + assets, and sends via Lob — **fully
autonomously**. The only human touch is a failed check (`mail_status = needs_human`).

Built to the spec in [`../postcard-generation-agent.md`](../postcard-generation-agent.md),
**cut to essentials** per [`../hackathon-execution-plan.md`](../hackathon-execution-plan.md) §3B.

## Quick start

```bash
npm install
cp .env.example .env      # optional — runs fully offline without keys
npm run demo              # → out/<tracking_id>/postcard.pdf (+ front/back/qr/brief/copy)
npm run demo -- fixtures/no-hook.json   # exercises the needs_human gate
npm run demo -- fixtures/fetch-brand-prospect.json   # Stage 0 fetch (no brand_kit on input)
npm run fetch-brand stripe.com fintech  # smoke-test the brand-kit chain alone
```

With **no API keys** it runs end to end on mocks: deterministic text + a branded
placeholder image, still producing a valid print-ready PDF. As keys are added it
upgrades each stage in place — no separate "demo mode" (same code path runs live
and cached).

`npm run typecheck` to type-check; `npm run build` to emit `dist/`.

## Stage map (what's real vs. cut)

| Stage | What it does | Provider | Cut for hackathon? |
|---|---|---|---|
| 0 Brand kit | logo + palette + fonts | Brandfetch → Clearbit → scrape → sector fallback | optional `BRANDFETCH_API_KEY`; set `BRAND_FETCH=never` to skip |
| 1 Distil | enrichment → brief, pick the one true hook (or `null`) | SIE `generate` → mock | — |
| 2 Copy | postcard words, hook-led, QR CTA | SIE `generate` → mock | — |
| 3a Image prompt | art-direct the front, no text/logo/QR | SIE `generate` → mock | — |
| 3b Image | the front render | **Google Gemini** → flash → placeholder, cached by `tracking_id` | image is Gemini-only (settled) |
| 4 Compose | deterministic layout: image + headline + logo (front); copy + QR + link (back); 4×6 @ 300dpi PDF | code (`sharp`/`qrcode`/`pdf-lib`) | — |
| 5 Checks | hook non-null + QR decodes to `booking_url`; save PDF/assets; set `mail_status` | code | kept the 2 essential checks |
| 6 Send | Lob test mode → proof PDF; write back to Attio | Lob | — |

Text stages default to **SIE `generate`** (`TEXT_LLM_PROVIDER=sie`); set
`TEXT_LLM_PROVIDER=gemini` to use `gemini-3.5-flash` instead, or `mock` to force
offline. SIE cold-starts (first call ~60s / 504) are retried once with
`wait_for_capacity: true`.

## Inputs / outputs

`runMailJob(input: MailInput)` (see `src/types.ts`). `MailInput` is the precondition
set from `postcard-generation-agent.md`: `prospect`, `enrichment[]`, optional `brand_kit`
(omit to auto-fetch from `prospect.company_domain`), `tracking_id`, `booking_url` (the `/r/:trackingId` tracked redirect — **not** a raw
Calendly URL), `attio_record_id`. Returns `MailResult` with `mail_status`
(`sent` | `needs_human`), the `pdfPath`, and the Lob id/proof url.

Assets land in `out/<tracking_id>/`: `postcard.pdf`, `front.png`, `back.png`,
`qr.png`, `brief.json`, `copy.json`, `image-prompt.json`.

## Integration notes for the rest of the team

- **Drop-in:** copy `src/` into `outreach-agent/` — the layout already mirrors the
  project's `src/clients/` + `src/jobs/` conventions. Call `runMailJob` from the
  real `/jobs/mail` route for each `teaser_sent` lead idle 2+ days.
- **`attioClient.ts` here is a minimal shim** (logs always; PATCHes attributes +
  posts a note when `ATTIO_API_KEY` is set). The backend-core workstream owns the
  full client — swap `recordMailEvent` to call it. Requires the 6 custom attributes
  to exist (`mail_status`, `sequence_stage`, …); until then the writes 400 and are
  logged, harmlessly.
- **`booking_url` / `tracking_id` contract:** this module only *encodes* the
  redirect into the QR. The `tracking_id` must be minted at **discovery** and
  `/r/:trackingId` must handle the click → `engaged` write + Calendly prefill. The
  Stage 5 reachability check (`QR_REQUIRE_REACHABLE=true`, off by default for
  offline prep) verifies the host actually resolves — it must **not** be localhost
  on stage, or a phone scan won't work.

## Resilience (demo-day)

- The Gemini image is **cached on disk by `tracking_id`** — pre-generate the
  rehearsed prospect(s) during prep so you never wait on a live first-try Pro call.
  Hero model 503 → flash fallback → branded placeholder, so the card always composes.
- Every external call has a mock/offline path; a single malformed model response
  falls back to the deterministic mock for that stage rather than failing the run.
- Confirm exact Gemini model strings on the day (`GEMINI_IMAGE_MODEL` etc.) — they
  move and `-preview` ids get retired.
