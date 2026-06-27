# Build plan — warm-up-then-strike outreach agent

Stack: Node.js / TypeScript. Attio access: REST API directly (no MCP layer). Scope: hackathon demo, not a production system — every decision below optimizes for "works end to end on stage" over scale or polish.

## 1. Functional requirements

1. Discover new leads matching the ICP — combine an Attio lookalike query (mine existing won deals) with Apollo People Search.
2. Enrich each lead with a web signal (funding news, hiring, launch) worth referencing later.
3. Send a content-free teaser email — no pitch, just "something's coming."
4. Watch for engagement for 2 days: email reply, tracked link/QR click, or a Calendly booking.
5. If nothing lands in 2 days, send one physical mail piece via Lob, personalized to the prospect's real brand and a verified enrichment hook, validated automatically before an autonomous send (see §8, postcard module).
6. On any engagement signal, write the result back to Attio and advance the deal stage — booking a meeting is the strongest signal and the one treated as "closed the loop."
7. If mail also gets no engagement after N days, flag the lead for a human instead of escalating further automatically.
8. Let a non-technical user connect their Attio account and define their ICP without touching code, curl, or an API client directly.

## 2. User flow & onboarding

The end user is a sales/founder type chasing a target ICP — not someone who'll run curl or paste a JSON payload. Their product surface is three steps:

1. **Connect Attio** — OAuth (or, for the hackathon demo, paste an API key) authorizes the agent to read/write their workspace. This is the only "integration" step; there's no separate signup or database to create — their Attio account *is* the account. They need an existing Attio workspace; this product augments it rather than replacing it.
2. **Define the ICP** — a short form: target titles, industries, company size band, optionally pointing at a few existing closed-won deals for the lookalike model to learn from. This replaces hand-editing `getIcpCriteriaFromAttioLookalikes()` / Apollo search params in code.
3. **Walk away** — once connected, the agent runs on its own schedule (discover → enrich → teaser → mail → stale-check). Day-to-day visibility lives inside Attio itself — stage, source, match score, activity notes — not a parallel tool they have to learn.

A thin dashboard (the wireframes already sketched: discovery results, stage stepper, activity log) covers step 2 plus a "what's happening right now" status view — but it's a window onto Attio, not a replacement for it. Nobody using the real product should ever need to know `/jobs/:jobName` exists; that route stays as an internal dev/demo lever, not something the end user touches.

## 3. Hackathon-sponsored services: SIE & Tavily

Two services are sponsor-provided for this event and worth wiring in for real rather than leaving stubbed — both also feed the "best open-source solution" side prize.

**SIE (Superlinked Inference Engine)** — not the structured-data Superlinked framework, but a hosted inference API standing up open models on a GPU cluster for the event, free of per-token cost. TS SDK: `@superlinked/sie-sdk`. Four primitives, each maps onto a real gap in the scaffold:

| Primitive | Use here | Replaces |
|---|---|---|
| `encode` | Embed each closed-won Attio deal and each Apollo candidate with the same model, cosine-similarity the two → real `icp_match_score`. This is the actual "Attio lookalike" matching logic. | `getIcpCriteriaFromAttioLookalikes()` / `findAttioLookalikes()` stubs and the hardcoded `icpMatchScore: 80` in `src/jobs/discover.ts` |
| `score` | Optional second pass: cross-encoder rerank discovered candidates against a written ICP description for a sharper ranking than cosine similarity alone. | nothing yet — pure upside |
| `extract` | Zero-shot field extraction from a messy enrichment article (funding amount, event type, company name) or a scraped homepage. | `getWebSignal()` stub in `src/jobs/enrich.ts`; also useful for the postcard module's brand-kit site-metadata fallback (§8) |
| `generate` | Text generation on a small open model (e.g. `Qwen/Qwen3-4B-Instruct-2507`). Two uses: (1) write the teaser email body — `sendTeaserEmail()` in `src/jobs/teaser.ts` is currently a no-op log; (2) optionally swap the postcard module's text stages (distil/copy/image-prompt) off Gemini onto an open model, leaning further into the open-source track. Image generation itself still needs Gemini — SIE doesn't generate images. |

Cold-start note: first call to a given model can take ~60s and may 504 while it loads. Code should retry once with `wait_for_capacity: true` rather than fail — matters live on stage.

Suggested file: `src/clients/sieClient.ts`, mirroring the existing `attioClient.ts` pattern (thin wrapper, one function per primitive used).

**Tavily** — real-time web search/extraction API, 1,000 free credits. Real implementation for `getWebSignal(company)` in `src/jobs/enrich.ts` (currently a stubbed string), and a candidate for the postcard module's brand-kit fallback chain (site metadata scraping, §8) instead of hand-rolled HTML parsing.

Suggested file: `src/clients/tavilyClient.ts`.

## 4. Non-functional constraints

- Must run end-to-end on a handful of demo leads, not real production volume.
- Every external call should have a free or sandbox mode: Apollo People Search (free, no credits), Lob sandbox/test mode (instant render, no postage cost), Calendly free tier webhook, Attio dev workspace, SIE (free during the event), Tavily (free credits).
- No separate database — Attio itself is the system of record (see data model below). One less moving part to build and explain.
- Best-effort reliability is fine. A clean sequential state machine per lead matters more than retries/queues for a demo.
- The end-user-facing surface must require zero command-line or API knowledge — connecting Attio and setting an ICP happen through a UI form, and once configured the agent runs on a schedule, not via manually-triggered endpoints.

## 5. High-level architecture

```
                         ┌──────────────────────┐
                         │   Frontend (web)      │
                         │ onboarding + ICP form  │
                         │  + status dashboard    │
                         └─────────┬──────────────┘
                                   │ connect Attio / set ICP
                                   ▼
                         ┌──────────────────────┐
                         │  Onboarding/config     │
                         │   API (Express)        │
                         └─────────┬──────────────┘
                                   │ stores config
                                   ▼
                         ┌─────────────────────┐
                         │   Scheduler (cron)   │
                         │  drives the sequence │
                         └─────────┬────────────┘
                                   │
   ┌────────────┬──────────────┬──┴───────────┬───────────────┐
   ▼            ▼              ▼              ▼               ▼
Discover     Enrich        Teaser email    Postcard module  Stale check
(Apollo +    (Tavily +     (SIE generate)  (Stage 0–6, see  (flag for
 SIE encode   SIE extract)                  §8 / postcard-   human)
 lookalike)                                 generation-
                                            agent.md)
   │            │              │              │               │
   └────────────┴──────────────┴──────────────┴───────────────┘
                                   │
                                   ▼
                         ┌─────────────────────┐
                         │   Attio REST client  │◄──── single source of truth
                         └─────────▲────────────┘      (people/deals + custom
                                   │                     attributes + notes)
                         ┌─────────┴────────────┐
                         │   Webhook server      │
                         │  /webhooks/calendly    │
                         │  /r/:trackingId (click)│
                         └────────────────────────┘
```

One Node/TS service, three entry points: a small frontend for onboarding/status, a scheduler that walks leads forward automatically, and an Express server that receives Calendly's webhook and tracked-link clicks. All three write through the same Attio client. The `/jobs/:jobName` manual-trigger routes still exist underneath the scheduler for demo control, but they're a dev lever, not part of the product surface.

## 6. Data model — Attio is the database

No separate DB for lead data. Add custom attributes to the Attio Person or Deal object:

| Attribute | Type | Values |
|---|---|---|
| `sequence_stage` | select | `discovered`, `enriched`, `teaser_sent`, `mail_sent`, `engaged`, `needs_review` |
| `source` | select | `apollo`, `attio_lookalike` |
| `icp_match_score` | number | 0–100 (now produced by SIE `encode` cosine similarity, §3) |
| `tracking_id` | text | unique id embedded in the QR/link |
| `last_touch_at` | timestamp | drives the 2-day and stale-check logic |
| `mail_status` | select | `ready_to_send`, `needs_human`, `sent` — internal checkpoint state *within* the postcard module (§8), distinct from `sequence_stage`. A failed automated check sets `needs_human` here without necessarily touching the macro `needs_review` stage. |

Every step also writes a note to the record's activity feed — that note feed is the literal "Attio activity log" already mocked up in the wireframes. The postcard module additionally attaches its generated assets (brief, copy, image, final PDF) to the record for traceability — see §8 for exactly what gets stored.

One piece of state doesn't naturally live in Attio: the user's own Attio credential and ICP criteria, since those exist *before* any lead records do. For the hackathon, this is just `.env` config for a single team/workspace. For a real multi-user product, this needs its own small per-tenant config store (or, to keep "no separate DB" true, a single workspace-level Attio record dedicated to settings) — noted under "what's next."

## 7. API contracts (internal service)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/onboarding/connect` | Save the user's Attio API key/OAuth token |
| `POST` | `/onboarding/icp` | Save ICP criteria (titles, industries, size, lookalike seeds) |
| `GET` | `/onboarding/status` | Dashboard polls this for current pipeline state |
| `POST` | `/jobs/discover` | Run Apollo + SIE-scored Attio lookalike search, create new Attio records |
| `POST` | `/jobs/enrich` | Pull a web signal (Tavily) for each `discovered` lead |
| `POST` | `/jobs/teaser` | Send teaser email to each `enriched` lead |
| `POST` | `/jobs/mail` | Run the full postcard module (§8) for each `teaser_sent` lead idle 2+ days, send via Lob |
| `POST` | `/jobs/stale-check` | Flag `mail_sent` leads idle N+ days as `needs_review` |
| `POST` | `/webhooks/calendly` | Calendly `invitee.created` event → mark `engaged` |
| `GET` | `/r/:trackingId` | Logs a click, marks `engaged`, redirects to the booking page |
| `GET` | `/health` | Liveness check |

The `/jobs/*` endpoints stay manually triggerable for live demo control. A real deployment wires the scheduler to call them automatically and never exposes them to the end user — onboarding and status are the only routes the frontend actually calls. No new external route is needed for the postcard module — it runs entirely inside the existing `/jobs/mail` handler.

## 8. The postcard module (Step 5, expanded)

Full spec lives in `postcard-generation-agent.md` (shipped alongside this plan) — written as its own runbook since it's the most involved single piece of the system: brand-kit fetch → distil enrichment into a brief → write copy → author + generate an image → deterministically compose front/back → automated pre-send checks → store PDF on the Attio record → send via Lob, with zero human review on the happy path. A failed automated check is the only thing that pulls in a human (`mail_status = needs_human`).

What to know without reading the full doc:
- **It replaces the simple "Lob sandbox mail send" build-order step** with six sub-stages (Stage 0–6) — see that file for prompts, schemas, and model strings.
- **It currently specs Gemini** (`gemini-3.5-flash` for text, `gemini-3-pro-image`/`gemini-3.1-flash-image` for images) for its generation stages. Per §3, the text stages (distil/copy/image-prompt) are swappable onto SIE `generate` if there's appetite to lean into the open-source track; the image stages stay on Gemini regardless, since SIE doesn't do image generation.
- **It needs its own brand-kit fallback chain** (Brandfetch → Clearbit → site-metadata scrape → dominant-colour extraction → sector defaults) — Tavily or SIE `extract` (§3) are reasonable substitutes for the site-metadata scraping step if Brandfetch/Clearbit free tiers are too thin for the demo prospects.
- **It needs object storage** for the generated PDF (or an Attio file attachment, if that's first-class via the API — unconfirmed, check on the day) — the one new piece of infrastructure this module adds beyond what's already in the architecture diagram.
- **Ownership note from the spec**: it's scoped for 2 devs + creative tech + marketing, i.e. expects to be its own workstream rather than something bolted on solo — worth confirming who picks this up.

## 9. Build order

Prioritized so there's a complete, demoable story even if time runs out partway through:

1. **Attio REST client + custom attributes** — foundation everything else writes to. Nothing else works without this. *(done — scaffolded)*
2. **Discovery job** — Apollo People Search + Attio lookalike via SIE `encode`. *(scaffolded; lookalike scoring is still stubbed — see §3)*
3. **Enrichment job** — web signal via Tavily, optionally structured with SIE `extract`. *(scaffolded; `getWebSignal` still stubbed — see §3)*
4. **Teaser email send** — simplest outreach step, advances `sequence_stage`. *(scaffolded; send is a no-op log, no real email client wired yet)*
5. **Tracked redirect + Calendly webhook** — the "close the loop" moment. Built before mail — it's the most autonomous, highest-impact part of the pitch and doesn't depend on physical logistics. *(done — scaffolded)*
6. **Postcard module** — full Stage 0–6 pipeline, see §8 / `postcard-generation-agent.md`. *(not started — biggest remaining chunk of work)*
7. **Stale-check / human handoff** — closes the story ("and if nothing happens, a person gets pinged instead of the agent going quiet"). *(done — scaffolded)*
8. **Minimal frontend** — onboarding (connect Attio, set ICP) + status dashboard hitting the endpoints in §7. Turns the project from "a script you drive with curl" into something a non-technical person could actually use. *(not started — agreed as the next concrete piece of code)*
9. **Scheduler wiring** — turn the manual job triggers into a real interval-driven loop, if time allows.

Steps 1–5 alone already demonstrate the brief's bar — discover, contact, autonomously detect a booked meeting, update the CRM — without needing the mail piece to physically work on stage. Step 6 is the most visually impressive demo beat (a bespoke, on-brand postcard generated live) but also the most failure-prone if rushed — it has its own resilience notes in `postcard-generation-agent.md` (pre-cache one rehearsed prospect, don't depend on a live first image call on stage).

## 10. Trade-offs made explicitly

- **REST over MCP**: faster to build directly against Attio's REST API than to stand up an MCP-calling agent runtime. If there's time left, a thin MCP wrapper over the same client would strengthen the "agentic" pitch narrative without changing the underlying logic.
- **Attio as the database over Postgres/SQLite**: removes a whole component to build and explain. A real product would likely want a separate event log for retries and auditability — noted as a "what's next," not a gap.
- **Polling/webhooks over Gmail push notifications**: real Gmail push requires Pub/Sub setup; out of scope for hackathon time. Email reply detection can be the weakest/optional signal — link click and Calendly booking carry the demo.
- **Sandbox over production for Lob**: test mode renders instantly and costs nothing; swap the API key later for real postage.
- **Manual job triggers (curl) over a scheduler, for the demo**: lets you drive the sequence live on stage with full control over timing. This was always a dev/demo convenience, not the end-user surface — a real user connects Attio and sets their ICP through the frontend, and the scheduler takes over from there.
- **SIE open models over Gemini for the postcard module's text stages**: free, fits the open-source side prize, and `generate`/`extract` are good enough for distil/copy/prompt-authoring quality. Image generation is the one place this trade-off doesn't apply — SIE has no image primitive, so Gemini's image models stay regardless of which way the text-stage decision goes.
- **No human proofreading on the postcard send**: quality rests entirely on locked prompts plus the Stage 5 automated checks (hook present, copy fits, image present, QR resolves). This is deliberate — it's the literal "no human in the loop" claim in the brief — but it means those checks and prompts need to be locked and tested well before demo time, not improvised live.

## 11. What to revisit if this continues past the hackathon

- Real Gmail push notifications instead of polling.
- Idempotency and retry handling on the webhook endpoints.
- A real event log/queue instead of relying on Attio attribute writes as the only record of what happened.
- Per-tenant storage for Attio credentials + ICP criteria once this serves more than one workspace.
- Multi-tenant support generally if this becomes a product rather than a single-team demo.
- Confirm Brandfetch/Clearbit free-tier limits actually cover demo volume, and whether Attio's API supports first-class file attachments or needs an object-storage URL instead.
- Confirm exact Gemini/SIE model strings close to the day — both move quickly and `-preview` IDs get retired.
