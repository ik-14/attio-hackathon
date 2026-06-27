# Execution plan — next 6 hours

Team: 3-4 people. Demo format: pre-recorded walkthrough (so a flaky live moment just means re-recording that segment, not failing on stage — use that).

**The non-negotiable spine** — protect this above everything else: *discover → enrich (web signal + brand fetch) → teaser → mail (distil → postcard) → Attio updates, for one rehearsed prospect.* That alone clears the brief's bar. Everything past it (polished postcard, real frontend, real Calendly booking on camera) is upside to layer on if time allows, in the priority order in §6.

## 0. What already exists (don't rebuild)

- Concept doc (`agentic-crm-outreach-agent.md`), architecture (`build-plan.md`), postcard module spec (`postcard-generation-agent.md`).
- **Postcard module** (`postcard-module/`) — Stages 1–6 built and verified: **distil**, copy, image-prompt, Gemini image, compose, checks, Lob send. Stage 0 brand-kit fetch implemented (`fetchBrandKit.ts`); wire enrich to call it, mail to consume the result.
- A working Node/TS scaffold (`outreach-agent/`) — Attio/Apollo/Lob clients, all 5 jobs, the Calendly webhook, the tracked redirect. Compiles and runs; most external calls are stubbed (see build-plan.md §3, §9).
- Wireframes for a status dashboard (3 screens, already sketched).

## 1. Pick the one rehearsed prospect — do this in the first 10 minutes

Everything downstream targets a single real-feeling example, not a generic test:

- A company + contact (real or believable): name, title, company, **`company_domain`**, industry.
- A real postal address — use your own venue/office address so a physical postcard could plausibly arrive.
- A plausible enrichment hook you write by hand as backup (e.g. "raised a seed round," "just opened a new office") — Tavily should find something real, but don't depend on it for the first run.
- 1-2 fake "closed-won" records in Attio so the lookalike-scoring step has something to compare against.
- **Do not hardcode the brand kit** — enrichment will fetch it live from `company_domain` via Clearbit/scrape (see §3A). Pick a prospect whose site fetches cleanly (test with `npm run fetch-brand -- <domain> <sector>` in `postcard-module/`).

Owner: whoever isn't blocked on a credential signup (see below) — start this in parallel with §2.

## 2. Credential sprint (T+0:00–0:20, whole team, parallel)

All keys below are **already signed up** — no new provider signups needed for the demo spine:

| Need | For | Status |
|---|---|---|
| Attio API key + create 6 custom attributes (`sequence_stage`, `source`, `icp_match_score`, `tracking_id`, `last_touch_at`, `mail_status`) on the Person object | everything | **Do first — blocks all workstreams** |
| Apollo key | discovery | ✅ in `.env` |
| Tavily key | enrichment web signal | ✅ in `.env` |
| Gemini API key | lookalike scoring, teaser copy, **distil/copy/image-prompt**, postcard image | ✅ in `.env` |
| Resend key | teaser send | ✅ in `.env` |
| Lob test-mode key | postcard send | ✅ in `.env` |
| Calendly account + one event type | booking signal | ✅ in `.env` |
| ~~Brandfetch~~ | brand kit | optional — Clearbit + scrape cover the demo without a key |

## 3. Three parallel workstreams (T+0:20–3:00)

**A — Backend core + enrich fetch** (1 person, "Dev 1")
Wire the real implementations behind the stubs already scaffolded:
- `discover.ts`: Gemini structured scoring — closed-won Attio deal(s) + Apollo candidates → `icp_match_score` (replaces hardcoded `80`).
- **`enrich.ts` — two parallel fetches per lead:**
  1. **Tavily search** → enrichment signal(s) (`signal`, `source_url`, `published_date`).
  2. **Stage 0 brand-kit fetch** — import `fetchBrandKit(domain, industry)` from `postcard-module/src/stages/fetchBrandKit.ts` (or copy into `outreach-agent/src/clients/`). Log `brand_kit.source` in the Attio activity note.
- Attach both to the lead record / mail input payload. Advance `sequence_stage` → `enriched`.
- `teaser.ts`: Resend send + Gemini teaser copy.
- `attioClient.ts`: finish `listRecordsByStage` / `findRecordByTrackingId`.
- Re-verify `/r/:trackingId` and `/webhooks/calendly`.
- **Checkpoint @2:00**: discover → enrich (signal + brand kit visible in Attio note) → teaser; Attio record updates at each step.

**B — Postcard module integration** (1-2 people, "Dev 2" + "Creative tech")
Module is built — focus on wiring and rehearsal:
- Drop `postcard-module/src/` into `outreach-agent/src/` (or import across packages).
- Wire `/jobs/mail` → `runMailJob(input)` where input includes `enrichment[]` + `brand_kit` from enrich.
- **Stage 1 distil** (Gemini → mock fallback): verify hook is picked from Tavily signals; `hook: null` path hits `needs_human` gate.
- Stages 2/3a (copy, image-prompt): Gemini text — already wired (`TEXT_LLM_PROVIDER=gemini`).
- Stage 3b (image): Gemini. **Pre-generate and cache** the rehearsed prospect's image — slowest/flakiest step.
- Stage 4 (compose): logo composited from fetched `brand_kit.logo_url`, colours from `brand_kit.palette`.
- Stage 5 (checks): hook non-null + QR resolves (+ image/copy sanity if time).
- Stage 6: Lob test mode → proof PDF.
- Set `BRAND_FETCH=never` once enrich passes `brand_kit` — avoid double-fetching at mail time.
- **Checkpoint @3:00**: one finished postcard PDF for the rehearsed prospect; brief shows real hook from distil; QR scans to the right URL.

**C — Status view, not a real frontend** (1 person, or whoever frees up first)
A full onboarding/auth UI isn't worth building today for a pre-recorded demo:
- Build the onboarding/ICP-form screen as a static, good-looking mock — record it once, it doesn't need to be wired to anything real.
- Build one *real* status view that reads actual Attio data (stage, score, source per lead) — this is what makes the payoff on camera real instead of staged.
- **Checkpoint @2:30**: status view shows live stage progression for the rehearsed prospect.

## 4. Integration rehearsal (T+3:00–4:30, whole team)

Run the full sequence once, in order, for real:

```
discover → enrich (Tavily signal + brand fetch) → teaser → distil → postcard → Lob send
→ /r/:trackingId (QR scan) → Calendly booking → Attio engaged
```

On camera beats to verify:
- Attio activity note from enrich shows both the web signal and `brand_kit.source`.
- Distil brief (`brief.json` in assets) references the real hook, not invented copy.
- Postcard front uses fetched logo/colours; back has hook-led copy + scannable QR.

**Checkpoint @4:30**: one clean end-to-end run, visible in Attio's own activity log.

## 5. Record (T+4:30–5:30) and submit (T+5:30–6:00)

Record in segments, not one unbroken take — a bad segment just gets redone:
1. Problem/pitch intro
2. Onboarding screen (the static mock from §3C)
3. Discovery results appearing
4. Enrichment (Tavily signal + brand fetch logged) + teaser send
5. Postcard generation — show distil brief, then copy/image, then final PDF
6. QR scan → real Calendly booking
7. Attio record updating live — stage advances, activity notes appear
8. Status dashboard wrap-up

Lean on Attio's own activity feed on camera wherever you can — it's your most credible visual, more convincing than any UI you'd build in a few hours. Stitch, trim, export, submit. Stop tuning once you're inside the last 15 minutes.

## 6. If you're behind schedule, cut in this order

1. Frontend polish — the status view can be raw and ugly, or you can just show Attio's own UI on camera instead.
2. Postcard automated checks — keep only "hook non-null" + "QR resolves."
3. A real Calendly booking on camera — fall back to manually POSTing a crafted payload to `/webhooks/calendly` and narrate over it.
4. Gemini lookalike reranking polish — a simple title/industry overlap score is fine for demo.
5. Multiple recorded segments — one rougher but real single take beats a polished one that's faked.

Never cut: the Attio writes themselves, enrich fetch (signal + brand kit), distil picking a real hook, and the one rehearsed prospect actually moving through `sequence_stage` end to end.
