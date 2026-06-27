# Build plan — warm-up-then-strike outreach agent

Stack: Node.js / TypeScript. Attio access: REST API directly (no MCP layer). Scope: hackathon demo, not a production system — every decision below optimizes for "works end to end on stage" over scale or polish.

## 1. Functional requirements

1. Discover new leads matching the ICP — combine an Attio lookalike query (mine existing won deals) with Apollo People Search.
2. Enrich each lead with a web signal (funding news, hiring, launch) worth referencing later **and** fetch the prospect's brand kit (logo, palette, fonts) for the postcard.
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

## 3. External services & model providers

All inference and enrichment run on **API keys already in the team's `.env`** — no SIE or other sponsor-only inference layer. Each maps onto a real gap in the scaffold:

| Service | Use here | Replaces |
|---|---|---|
| **Apollo** | People Search for discovery candidates. | hardcoded prospect lists |
| **Attio REST** | System of record — lead state, won-deal seeds for lookalike, activity notes. | any separate database |
| **Gemini text** (`gemini-3.5-flash`) | (1) Score Apollo candidates against closed-won Attio deals + ICP criteria → `icp_match_score` (Attio lookalike). (2) Write teaser email body. (3) Postcard text stages: **distil** (enrichment → brief), copy, image-prompt. (4) Optional: structured field extraction from a Tavily article when regex isn't enough. | hardcoded `icpMatchScore: 80`; `sendTeaserEmail()` no-op; postcard LLM stubs |
| **Gemini image** (`gemini-3-pro-image` / `gemini-3.1-flash-image`) | Postcard front render (Stage 3b). | — |
| **Tavily** | Real-time web search → enrichment signal (`getWebSignal`). Optional upgrade for brand-kit site-metadata step. | `getWebSignal()` stub in `src/jobs/enrich.ts` |
| **Resend** | Transactional send for the teaser email. | teaser no-op log |
| **Lob** (test mode) | Postcard print + proof PDF. | — |
| **Calendly** | Booking webhook → `engaged`. | — |
| **Clearbit / homepage scrape** (no key) | Brand-kit fetch fallback chain (Stage 0): logo + palette + fonts from `company_domain`. Reference impl: `postcard-module/src/stages/fetchBrandKit.ts`. | hand-supplied `brand_kit` only |

Suggested client files (thin wrappers, one function per primitive): `attioClient.ts`, `apolloClient.ts`, `geminiClient.ts`, `tavilyClient.ts`, `resendClient.ts`, `lobClient.ts`, `fetchBrandKit.ts`.

**Gemini reliability note:** image generation is the slowest/flakiest call (cold starts, occasional 503s). Pre-cache the rehearsed prospect's image; retry once on 503 with the flash fallback model. Text calls use `responseMimeType: application/json` for structured stage outputs.

## 4. Non-functional constraints

- Must run end-to-end on a handful of demo leads, not real production volume.
- Every external call should have a free or sandbox mode: Apollo People Search (free, no credits), Lob sandbox/test mode (instant render, no postage cost), Calendly free tier webhook, Attio dev workspace, Tavily (free credits), Gemini (hackathon quota).
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
(Apollo +    (Tavily web    (Resend +       (Stage 0–6,     (flag for
 Attio won   signal +       Gemini          see §8)          human)
 deals +     Stage 0        teaser copy)
 Gemini      brand-kit
 lookalike   fetch)
 score)
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
| `icp_match_score` | number | 0–100 (Gemini scores each candidate against closed-won Attio deals + ICP criteria, §3) |
| `tracking_id` | text | unique id embedded in the QR/link |
| `last_touch_at` | timestamp | drives the 2-day and stale-check logic |
| `mail_status` | select | `ready_to_send`, `needs_human`, `sent` — internal checkpoint state *within* the postcard module (§8), distinct from `sequence_stage`. A failed automated check sets `needs_human` here without necessarily touching the macro `needs_review` stage. |

Every step also writes a note to the record's activity feed — that note feed is the literal "Attio activity log" already mocked up in the wireframes. The postcard module additionally attaches its generated assets (brief, copy, image, final PDF) to the record for traceability — see §8 for exactly what gets stored.

Brand kit (`logo_url`, `palette`, `fonts`, `source`) is fetched during enrichment and passed forward on the mail input — it does not need its own Attio attribute for the demo, but the activity note from enrichment should log `brand_kit.source` for traceability.

One piece of state doesn't naturally live in Attio: the user's own Attio credential and ICP criteria, since those exist *before* any lead records do. For the hackathon, this is just `.env` config for a single team/workspace. For a real multi-user product, this needs its own small per-tenant config store (or, to keep "no separate DB" true, a single workspace-level Attio record dedicated to settings) — noted under "what's next."

## 7. API contracts (internal service)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/onboarding/connect` | Save the user's Attio API key/OAuth token |
| `POST` | `/onboarding/icp` | Save ICP criteria (titles, industries, size, lookalike seeds) |
| `GET` | `/onboarding/status` | Dashboard polls this for current pipeline state |
| `POST` | `/jobs/discover` | Run Apollo + Gemini-scored Attio lookalike search, create new Attio records |
| `POST` | `/jobs/enrich` | Tavily web signal + Stage 0 brand-kit fetch for each `discovered` lead → `enriched` |
| `POST` | `/jobs/teaser` | Send teaser email (Resend) to each `enriched` lead |
| `POST` | `/jobs/mail` | Run the full postcard module (§8) for each `teaser_sent` lead idle 2+ days, send via Lob |
| `POST` | `/jobs/stale-check` | Flag `mail_sent` leads idle N+ days as `needs_review` |
| `POST` | `/webhooks/calendly` | Calendly `invitee.created` event → mark `engaged` |
| `GET` | `/r/:trackingId` | Logs a click, marks `engaged`, redirects to the booking page |
| `GET` | `/health` | Liveness check |

The `/jobs/*` endpoints stay manually triggerable for live demo control. A real deployment wires the scheduler to call them automatically and never exposes them to the end user — onboarding and status are the only routes the frontend actually calls. No new external route is needed for the postcard module — it runs entirely inside the existing `/jobs/mail` handler.

## 8. The postcard module (Step 5, expanded)

Full spec lives in `postcard-generation-agent.md` (shipped alongside this plan) — written as its own runbook since it's the most involved single piece of the system. Reference implementation: `postcard-module/`.

**Pipeline:** brand-kit fetch (Stage 0, normally done in enrich) → **distil** enrichment into a brief → write copy → author + generate an image → deterministically compose front/back → automated pre-send checks → store PDF on the Attio record → send via Lob, with zero human review on the happy path. A failed automated check is the only thing that pulls in a human (`mail_status = needs_human`).

| Stage | What | Provider | Owner |
|---|---|---|---|
| **0 Brand kit** | `company_domain` → logo + palette + fonts | Clearbit → homepage scrape → `sharp` colour extraction → sector defaults; optional Brandfetch / Tavily | **Enrich job** (`/jobs/enrich`) — passes `brand_kit` on mail input |
| **1 Distil** | enrichment signals + brand kit → brief (hook, brand_cues, tone) | **Gemini text** (`gemini-3.5-flash`) → deterministic mock fallback | **Mail job** (`/jobs/mail`) |
| **2 Copy** | brief → postcard words | Gemini text | Mail job |
| **3a Image prompt** | brief → art-directed prompt (no text/logo in image) | Gemini text | Mail job |
| **3b Image** | front hero render | **Gemini image** (`gemini-3-pro-image` → flash fallback → placeholder) | Mail job |
| **4 Compose** | image + headline + logo (front); copy + QR (back); PDF | code (`sharp` / `qrcode` / `pdf-lib`) | Mail job |
| **5 Checks** | hook non-null, QR resolves, copy/image present | code | Mail job |
| **6 Send** | Lob test mode + Attio write-back | Lob | Mail job |

What to know without reading the full doc:
- **Stage 0 runs in enrichment**, not at mail time — enrich fetches the brand kit and stores/passes it forward. The postcard module accepts an optional `brand_kit` on input and only re-fetches if it's missing (`BRAND_FETCH=auto` safety net).
- **Stage 1 distil is the personalisation gate** — picks the single verifiable hook from Tavily signals; sets `hook: null` if nothing strong exists (Stage 5 blocks send → `needs_human`).
- **All text stages use Gemini** with JSON output and a per-stage deterministic mock fallback so the pipeline always produces a card offline.
- **Image generation is Gemini only** — pre-cache the rehearsed prospect; never depend on a live first image call on stage.
- **It needs object storage** for the generated PDF (or an Attio file attachment, if that's first-class via the API — unconfirmed, check on the day) — the one new piece of infrastructure this module adds beyond what's already in the architecture diagram.

## 9. Build order

Prioritized so there's a complete, demoable story even if time runs out partway through:

1. **Attio REST client + custom attributes** — foundation everything else writes to. Nothing else works without this. *(done — scaffolded)*
2. **Discovery job** — Apollo People Search + Gemini-scored lookalike against closed-won Attio deals. *(scaffolded; scoring still stubbed — see §3)*
3. **Enrichment job** — Tavily web signal + **Stage 0 brand-kit fetch** (`fetchBrandKit.ts`). Write both to Attio (note + stage → `enriched`). *(scaffolded; both still stubbed — see §3)*
4. **Teaser email send** — Resend + Gemini teaser copy. *(scaffolded; send is a no-op log)*
5. **Tracked redirect + Calendly webhook** — the "close the loop" moment. *(done — scaffolded)*
6. **Postcard module** — Stages 1–6 including **distil**, copy, image, compose, checks, Lob send. Stage 0 consumed from enrich output. *(built in `postcard-module/` — wire into `/jobs/mail`)*
7. **Stale-check / human handoff** — closes the story. *(done — scaffolded)*
8. **Minimal frontend** — onboarding + status dashboard. *(not started)*
9. **Scheduler wiring** — turn manual job triggers into an interval loop, if time allows.

Steps 1–5 alone already demonstrate the brief's bar — discover, contact, autonomously detect a booked meeting, update the CRM — without needing the mail piece to physically work on stage. Step 6 is the most visually impressive demo beat (a bespoke, on-brand postcard with a real hook from distil) but also the most failure-prone if rushed — pre-cache the rehearsed prospect's image.

## 10. Trade-offs made explicitly

- **REST over MCP**: faster to build directly against Attio's REST API than to stand up an MCP-calling agent runtime. If there's time left, a thin MCP wrapper over the same client would strengthen the "agentic" pitch narrative without changing the underlying logic.
- **Attio as the database over Postgres/SQLite**: removes a whole component to build and explain. A real product would likely want a separate event log for retries and auditability — noted as a "what's next," not a gap.
- **Polling/webhooks over Gmail push notifications**: real Gmail push requires Pub/Sub setup; out of scope for hackathon time. Email reply detection can be the weakest/optional signal — link click and Calendly booking carry the demo.
- **Sandbox over production for Lob**: test mode renders instantly and costs nothing; swap the API key later for real postage.
- **Manual job triggers (curl) over a scheduler, for the demo**: lets you drive the sequence live on stage with full control over timing. This was always a dev/demo convenience, not the end-user surface — a real user connects Attio and sets their ICP through the frontend, and the scheduler takes over from there.
- **Gemini for all text + scoring**: one API key covers lookalike scoring, teaser copy, distil/copy/image-prompt, and optional structured extraction. Simpler credential story than splitting across providers.
- **Brand-kit fetch in enrich, not mail**: keeps "what they look like" (Stage 0) alongside "what's true about them" (Tavily) in one job; mail receives a complete input and jumps straight to distil.
- **No human proofreading on the postcard send**: quality rests entirely on locked prompts plus the Stage 5 automated checks (hook present, copy fits, image present, QR resolves). This is deliberate — it's the literal "no human in the loop" claim in the brief — but it means those checks and prompts need to be locked and tested well before demo time, not improvised live.

## 11. What to revisit if this continues past the hackathon

- Real Gmail push notifications instead of polling.
- Idempotency and retry handling on the webhook endpoints.
- A real event log/queue instead of relying on Attio attribute writes as the only record of what happened.
- Per-tenant storage for Attio credentials + ICP criteria once this serves more than one workspace.
- Multi-tenant support generally if this becomes a product rather than a single-team demo.
- Confirm Brandfetch/Clearbit free-tier limits actually cover demo volume, and whether Attio's API supports first-class file attachments or needs an object-storage URL instead.
- Confirm exact Gemini model strings close to the day — `-preview` IDs get retired.
