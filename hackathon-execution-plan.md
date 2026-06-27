# Execution plan — next 6 hours

Team: 3-4 people. Demo format: pre-recorded walkthrough (so a flaky live moment just means re-recording that segment, not failing on stage — use that). All third-party keys (Gemini, Brandfetch/Clearbit, transactional email) still need signing up for.

**The non-negotiable spine** — protect this above everything else: *discover → enrich → teaser → mail (even an ugly one) → Attio updates, for one rehearsed prospect.* That alone clears the brief's bar. Everything past it (polished postcard, real brand-kit fetch, real frontend, real Calendly booking on camera) is upside to layer on if time allows, in the priority order in §5.

## 0. What already exists (don't rebuild)

- Concept doc (`agentic-crm-outreach-agent.md`), architecture (`build-plan.md`), postcard module spec (`postcard-generation-agent.md`).
- A working Node/TS scaffold (`outreach-agent/`) — Attio/Apollo/Lob clients, all 5 jobs, the Calendly webhook, the tracked redirect. Compiles and runs; most external calls are stubbed (see build-plan.md §3, §9).
- Wireframes for a status dashboard (3 screens, already sketched).

## 1. Pick the one rehearsed prospect — do this in the first 10 minutes

Everything downstream targets a single real-feeling example, not a generic test:

- A company + contact (real or believable): name, title, company, industry.
- A real postal address — use your own venue/office address so a physical postcard could plausibly arrive.
- A plausible enrichment hook you write by hand (e.g. "raised a seed round," "just opened a new office") — don't rely on a live web search turning up something usable on the first try.
- That company's actual logo + 2-3 brand colors, grabbed by eye from their site — hardcode this as the `brand_kit` instead of building the Brandfetch/Clearbit fallback chain. It's only used once; a live integration isn't worth the setup time today.
- 1-2 fake "closed-won" records in Attio so the lookalike-matching step has something to embed against.

Owner: whoever isn't blocked on a credential signup (see below) — start this in parallel with §2.

## 2. Credential sprint (T+0:00–0:20, whole team, parallel)

| Need | For | Priority |
|---|---|---|
| Attio API key + create 6 custom attributes (`sequence_stage`, `source`, `icp_match_score`, `tracking_id`, `last_touch_at`, `mail_status`) on the Person object | everything | **Do first — blocks all workstreams** |
| Apollo key | discovery | already established as free/no-credits |
| Lob test-mode key | postcard send | quick signup |
| Calendly account + one event type | booking signal | quick setup, no webhook tunnel needed yet |
| SIE endpoint + key | lookalike scoring, enrichment, teaser copy | already have it |
| Tavily key | enrichment web signal | already signed up |
| Gemini API key | **only** needed for Stage 3b image generation — route the postcard module's text stages (distil/copy/image-prompt) through SIE `generate` instead, since that key is already in hand and needs no new signup | sign up now, but it's not blocking the text stages |
| Transactional email key (Resend is the fastest signup) | teaser send | sign up now |
| ~~Brandfetch / Clearbit~~ | brand kit | **cut for today** — hardcoded in §1 |

## 3. Three parallel workstreams (T+0:20–3:00)

**A — Backend core** (1 person, "Dev 1")
Wire the real implementations behind the stubs already scaffolded:
- `discover.ts`: SIE `encode` on the seeded closed-won record(s) + Apollo candidates → cosine similarity → real `icp_match_score` (replaces the hardcoded `80`).
- `enrich.ts`: Tavily search → real `getWebSignal`.
- `teaser.ts`: real send via Resend (or whichever email key landed).
- `attioClient.ts`: finish `listRecordsByStage` / `findRecordByTrackingId` — every other job depends on these actually querying Attio.
- Re-verify `/r/:trackingId` and `/webhooks/calendly` still work against a real record.
- **Checkpoint @2:00**: discover → enrich → teaser run end-to-end against the rehearsed prospect; Attio record visibly updates at each step.

**B — Postcard module, cut to essentials** (1-2 people, "Dev 2" + "Creative tech")
Per `postcard-generation-agent.md`, but trimmed:
- Skip Stage 0's fallback chain — use the hardcoded brand kit from §1.
- Stages 1/2/3a (distil, copy, image-prompt): SIE `generate`, not Gemini — zero extra signup, good enough quality for one card.
- Stage 3b (image): Gemini, as soon as that key lands. **Run this early and cache the result** — it's the slowest, flakiest call (cold starts, occasional 503s) and you do not want to be waiting on a live image generation an hour before recording.
- Stage 4 (compose): real logo composited, QR pointing at the tracked redirect.
- Stage 5 (checks): keep the two that matter — hook is non-null, QR resolves. Drop the rest if short on time.
- Stage 6: submit to Lob test mode → proof PDF.
- **Checkpoint @3:00**: one finished postcard PDF for the rehearsed prospect, QR scans to the right URL.

**C — Status view, not a real frontend** (1 person, or whoever frees up first)
A full onboarding/auth UI isn't worth building today for a pre-recorded demo:
- Build the onboarding/ICP-form screen as a static, good-looking mock — record it once, it doesn't need to be wired to anything real.
- Build one *real* status view that reads actual Attio data (stage, score, source per lead) — this is what makes the payoff on camera real instead of staged.
- **Checkpoint @2:30**: status view shows live stage progression for the rehearsed prospect.

## 4. Integration rehearsal (T+3:00–4:30, whole team)

Run the full sequence once, in order, for real: discover → enrich → teaser → postcard generated → Lob test-mode send → visit `/r/:trackingId` (simulates the QR scan) → complete a real Calendly booking → confirm the webhook fires and Attio flips to `engaged`. Budget this entire block as buffer — fixing what breaks here matters more than anything else left on the list.

**Checkpoint @4:30**: one clean end-to-end run, visible in Attio's own activity log.

## 5. Record (T+4:30–5:30) and submit (T+5:30–6:00)

Record in segments, not one unbroken take — a bad segment just gets redone:
1. Problem/pitch intro
2. Onboarding screen (the static mock from §3C)
3. Discovery results appearing
4. Enrichment + teaser send
5. Postcard generation (briefly show the brief/copy/image, then the final PDF)
6. QR scan → real Calendly booking
7. Attio record updating live — stage advances, activity notes appear
8. Status dashboard wrap-up

Lean on Attio's own activity feed on camera wherever you can — it's your most credible visual, more convincing than any UI you'd build in a few hours. Stitch, trim, export, submit. Stop tuning once you're inside the last 15 minutes.

## 6. If you're behind schedule, cut in this order

1. Frontend polish — the status view can be raw and ugly, or you can just show Attio's own UI on camera instead.
2. Postcard automated checks — keep only "hook non-null" + "QR resolves."
3. A real Calendly booking on camera — fall back to manually POSTing a crafted payload to `/webhooks/calendly` and narrate over it.
4. SIE `score` reranking — was always a nice-to-have, never load-bearing.
5. Multiple recorded segments — one rougher but real single take beats a polished one that's faked.

Never cut: the Attio writes themselves, and the one rehearsed prospect actually moving through `sequence_stage` end to end.
