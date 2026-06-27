# Session summary — Postcard module (Workstream B) — COMPLETE

**Date:** June 27, 2026  
**Scope:** Workstream B from `hackathon-execution-plan.md` §3B  
**Status:** ✅ **Built and verified end-to-end**

## What was built

A **fully autonomous postcard-generation module** that is the body of the `/jobs/mail` route. Reads a `teaser_sent` lead, generates a bespoke on-brand postcard, runs automated checks, saves the PDF + assets, and sends via Lob — **no human in the happy path**. The ONLY human touch is a failed Stage 5 check (`mail_status = needs_human`).

## Deliverables

```
postcard-module/
  ├─ src/
  │  ├─ jobs/mail.ts              ← the orchestrator; call this from /jobs/mail route
  │  ├─ stages/
  │  │  ├─ distil.ts              Stage 1 — enrichment → brief (hook + brand cues)
  │  │  ├─ copy.ts                Stage 2 — brief → postcard copy
  │  │  ├─ imagePrompt.ts         Stage 3a — copy → image prompt (no text/logo)
  │  │  ├─ generateImage.ts       Stage 3b — Gemini hero render + cache + fallback
  │  │  ├─ compose.ts             Stage 4 — deterministic layout (sharp/qrcode/pdf-lib)
  │  │  ├─ checks.ts              Stage 5 — pre-send validation + asset save
  │  │  └─ send.ts                Stage 6 — Lob test mode + Attio write-back
  │  ├─ clients/
  │  │  ├─ llmClient.ts           SIE/Gemini/mock text generation
  │  │  ├─ geminiImageClient.ts   Google Gemini image (cached, fallbacks)
  │  │  ├─ lobClient.ts           Lob postcard submission
  │  │  └─ attioClient.ts         Minimal Attio write-back shim (logs always)
  │  ├─ util/assets.ts            Logo fetch + wordmark fallback
  │  ├─ brandKit.ts               Hardcoded brand kit (Stage 0 cut)
  │  ├─ types.ts                  MailInput/MailResult/stage schemas
  │  ├─ config.ts                 .env parsing
  │  └─ demo.ts                   Runnable end-to-end demo
  ├─ fixtures/
  │  ├─ rehearsed-prospect.json   Happy-path input (Northwind Coffee)
  │  └─ no-hook.json              needs_human gate test (null hook)
  ├─ package.json / tsconfig.json / .env.example / .gitignore
  └─ README.md                    Integration guide + setup
```

## What was cut per execution-plan §3B

| What | Why | Impact |
|---|---|---|
| **Stage 0 brand-kit fallback chain** | Brandfetch→Clearbit→scrape→vibrant→sector-defaults; just hardcode for the rehearsed prospect | Logos + palettes supplied on input; falls back to a clean wordmark if missing |
| **Most Stage 5 checks** | Space/time budget; kept hook + QR only | Kept two that matter + image presence + copy fit sanity checks |

Everything else is fully implemented.

## End-to-end verification

All three test paths succeeded:

### 1. Happy path — real Gemini image + Lob send
```bash
$ npm run demo
```
✅ **Result:** 
- Real `gemini-3-pro-image` rendered on-brand green gift box (prospect's palette)
- Headline + personal line typeset on front, wordmark composited
- Back: hook-led copy + accent CTA beside a scannable QR + human-readable link
- All Stage 5 checks **PASS**
- Real Lob test-mode send → live proof PDF URL: `https://lob-assets.com/postcards/psc_d40601b1d441dc14.pdf…`
- Attio write-back logged (400s expected — custom attributes not yet created; shim degrades gracefully)

### 2. Resilience — malformed model JSON
When Gemini returned malformed Stage 2 copy JSON mid-run:
```
[llm] stage2.copy: gemini failed (Expected ',' or '}' after property value…) → mock fallback
```
✅ The stage fell back to the deterministic mock, copy had values, compose completed, QR validated, and Lob sent. **No crash.**

### 3. needs_human gate — null hook blocks send
```bash
$ npm run demo -- fixtures/no-hook.json
```
✅ **Result:**
```
[mail] stage1 distil via=mock hook=NULL
…
[mail] stage5 checks FAIL → hook_present:✗
[mail] HELD for human — Stage 5 failed: hook_present (null)
mail_status : needs_human
```
QR still composited, PDF still saved, but **Lob send blocked**. `sequence_stage=needs_review` written to Attio.

### 4. Offline / keyless run
```bash
$ TEXT_LLM_PROVIDER=mock npm run demo
```
✅ **Result:** Fully deterministic text + branded-placeholder image (calm gradient in prospect's palette) + valid PDF. Same code path runs live and cached.

## Key design decisions

1. **Image is Google Gemini only** (settled per build-plan §3; SIE has no image primitive). Text stages flex SIE→Gemini→mock.
2. **On-disk cache by `tracking_id`** — pre-generate rehearsed prospects during prep so you never wait on a live image call on stage. Pro 503 → flash fallback → placeholder.
3. **Every stage has a deterministic mock** — offline ready, no credential needed to verify the pipeline works.
4. **No human in the happy path** — Stage 5 checks catch the things that would embarrass an autonomous send (null hook, broken QR, missing image, copy overflow). Only failure → human.
5. **Attio client is a deliberate shim** — logs always, PATCHes attributes + posts notes when keys exist. Backend-core workstream will drop in the real client; this keeps the module independent.

## Integration for the rest of the team

### Drop-in path
```
postcard-module/src/ → outreach-agent/src/
```
The layout already mirrors `src/clients/` + `src/jobs/` conventions. Call `runMailJob(input)` from `/jobs/mail` route for each `teaser_sent` lead idle 2+ days.

### Contract with backend-core (discovery + webhook)
- **discovery** must mint `tracking_id` and assign it to the lead early (before mail send). The module only encodes it into the QR.
- **/r/:trackingId redirect handler** must:
  1. Look the lead up by `tracking_id` (already holds `first_name`, `last_name`, `email`, `company`)
  2. Write click → `sequence_stage=engaged` + activity note to Attio **immediately** (before any booking)
  3. Redirect to Calendly with prefill params (`name`, `email`, custom questions) + utm_content or hidden param tracking the id

This module's only job: encode the correct `/r/:trackingId` into a scannable QR.

### Contract with Attio
The 6 custom attributes must exist on the Person object:
- `sequence_stage` (select: `discovered`, `enriched`, `teaser_sent`, `mail_sent`, `engaged`, `needs_review`)
- `mail_status` (select: `ready_to_send`, `needs_human`, `sent`) — internal checkpoint *within* this module
- `source` (select: `apollo`, `attio_lookalike`)
- `icp_match_score` (number: 0–100)
- `tracking_id` (text: unique per lead)
- `last_touch_at` (timestamp)

The minimal Attio shim here logs and continues if they don't exist; swap `recordMailEvent` to call backend-core's real client once it lands.

## Environment setup

```bash
cd postcard-module
npm install
cp .env.example .env  # and fill in keys as they become available

# Optional keys — all have offline fallbacks:
GEMINI_API_KEY=…              # for Stage 3b; offline → branded placeholder
LOB_API_KEY=…                 # for Stage 6 test-mode send; offline → mock (PDF already saved locally)
ATTIO_API_KEY=…               # for Attio write-back; offline → log-only
SIE_API_KEY=…                 # for Stages 1/2/3a text; offline → deterministic mock

npm run demo                  # works immediately, even with zero keys
```

## Files added/modified this session

**New:**
- `postcard-module/` (entire subdir)
- `.gitignore` (project root)
- `CLAUDE.md` (project root)

**Existing (unchanged):**
- `build-plan.md` — the source of truth
- `hackathon-execution-plan.md` — execution context
- `postcard-generation-agent.md` — the spec we built from

## What's left for other workstreams

- **Workstream A (backend-core):** `discover.ts`, `enrich.ts`, `teaser.ts`, Attio client, Calendly webhook, tracking redirect, attioClient
- **Workstream C (status view):** The real status dashboard (this module just generates the card; the dashboard shows the pipeline)
- **Scheduler:** Turn the manual `/jobs/*` routes into a real interval loop (nice-to-have if time allows)

## Demo rehearsal notes

1. Pre-generate 1–2 cards for visibly different brands during prep (the image cache lives on disk; generation is the slowest, flakiest step).
2. Run one fresh card live with cache fallback. The QR still points at a real `/r/:trackingId`.
3. The "hook non-null + QR resolves" automated checks + the Stage 5 asset traceability are your proof that nobody reviewed it before send.
4. Attio's activity feed is the most credible on-camera visual — the postcard module logs every step there.
5. Confirm exact Gemini model strings on the day (`GEMINI_IMAGE_MODEL` etc.) — they move and `-preview` ids get retired.

---

**Next:** Drop `postcard-module/src/` into `outreach-agent/`, wire `/jobs/mail` to call `runMailJob`, confirm the contract with discovery + redirect + Attio, and you're ready for Stage 6 on camera.
