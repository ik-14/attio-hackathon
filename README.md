# Reachd — Autonomous Sales Outreach Agent

Reachd discovers leads, researches them, and reaches out on **two channels at once** — a personalised email and a bespoke physical postcard with a scannable QR — fully autonomously. When the prospect scans the QR or books a meeting, Reachd writes the engagement back to Attio and closes the loop. No human in the loop after you set the target.

Built for the Attio Hackathon 2026.

**One app, one deploy.** The backend (API routes) and frontend (dashboard) are a single Next.js app that ships to Vercel as one unit. Attio is the only database.

---

## What it does

```
User types their ICP once ("VP Sales at fintech, 50–500 people")
         │
         ▼
1. Discover    Gemini scores each seed lead against the ICP            → person + deal created in Attio
2. Enrich      Tavily finds a "why now" signal; Gemini distils it      → enrichmentSignal written to Attio
3. Outreach    Email + postcard generated and dispatched together      → both fire in one step
               ├── Email     → Gemini copy → Resend
               └── Postcard  → 6-stage generation pipeline → Lob (physical mail, test mode)
4. Engage      Prospect scans QR / books Calendly / webhook fires      → sequence_stage = engaged in Attio
5. Stale-check Flags leads idle too long for human review              → needs_review in Attio
```

Everything is written back to Attio. The agent runs autonomously — the user only ever types their ICP.

---

## Quick start

```bash
# Requires: Node 20+, npm
npm install

cp .env.example .env.local     # fill in keys (see table below) — or leave blank to run in stub mode
npm run dev                     # http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000).

The app runs with **zero API keys** — every external client falls back to a deterministic stub, so the full flow (ICP chat → loading → dashboard → pipeline) works locally with no credentials. Drop real keys into `.env.local` and the same code paths go live.

```bash
# (Optional) create the required Attio custom attributes automatically:
node scripts/attio-setup.mjs
```

---

## Environment variables (`.env.local`)

| Variable | Required | What it does | Without it |
|---|---|---|---|
| `ATTIO_API_KEY` | Recommended | Read/write people, notes (and deals if enabled) in Attio | Store is in-memory only; Attio writes are skipped |
| `GEMINI_API_KEY` | Recommended | ICP parsing, lead scoring, email + postcard copy, image generation, fact extraction | Deterministic stubs return plausible fake data |
| `TAVILY_API_KEY` | Optional | Live web search for enrichment signals | Stub returns a canned signal |
| `RESEND_API_KEY` | Optional | Send outreach emails | Stub logs the email, returns a fake id |
| `LOB_API_KEY` | Optional | Send physical postcards (`test_` prefix = sandbox proof, nothing mailed) | Stub returns a mock proof id |
| `APOLLO_API_KEY` | Optional | Org enrichment endpoint (free tier) | Skipped |
| `BOOKING_PAGE_URL` | Optional | Calendly URL encoded into the tracked QR/link | `https://calendly.com/kiki-zhang058/30min` |
| `BASE_URL` | Optional | Public host for tracking links | `http://localhost:3000` |
| `CALENDLY_WEBHOOK_SIGNING_KEY` | Optional | Validate Calendly booking webhooks (HMAC-SHA256) | Webhook accepted without signature check |
| `GEMINI_IMAGE_MODEL` | Optional | Postcard hero image model | `gemini-3-pro-image` |
| `GEMINI_IMAGE_FALLBACK_MODEL` | Optional | Fallback image model on 5xx | `gemini-3.1-flash-image` |
| `LOB_FROM_*` | Optional | Return address on the postcard | US defaults in `lib/config.ts` |
| `MAIL_WAIT_DAYS` | Optional | Idle days before stale-check flags a lead | `0` (fires immediately, for demos) |
| `ICP_TITLES` · `ICP_INDUSTRIES` · `ICP_HEADCOUNT_MIN/MAX` | Optional | Default ICP shown before the user chats | sensible defaults |

---

## Architecture

```
attio-hackathon/                  single Next.js app → one Vercel deploy
├─ app/
│  ├─ page.tsx                     3-phase UI: ICP chat → radar loading → dashboard
│  ├─ _components/                 IcpChatScreen · LoadingScreen · DashboardScreen
│  └─ api/                         the backend (route handlers)
│     ├─ icp · icp/chat            GET current ICP · POST natural-language ICP → Gemini parse
│     ├─ status · leads            dashboard polling (counts + leads)
│     ├─ jobs/[jobName]            POST discover | enrich | outreach | stale-check (optional { leadId })
│     ├─ r/[trackingId]            QR/link redirect → mark engaged → Calendly
│     ├─ webhooks/calendly         invitee.created → Meeting Booked
│     └─ assets/[id]               serves the composed postcard front PNG (for the dashboard preview)
├─ lib/
│  ├─ config.ts · types.ts         config + key gating · shared FE↔BE contract
│  ├─ store.ts                     lead store: in-memory primary, best-effort Attio side-effects
│  ├─ clients/                     attio · gemini · tavily · resend · lob · apollo (each: live or stub)
│  ├─ jobs/                        discover · enrich · outreach · staleCheck
│  └─ postcard/                    the integrated 6-stage postcard pipeline (see below)
├─ components/strike/              dashboard UI (LeadCard, PipelineRow, Stepper, …)
└─ scripts/attio-setup.mjs         idempotent Attio attribute setup
```

The clean QR URL `/r/:trackingId` is rewritten to `/api/r/:trackingId` (see `next.config.ts`). Routes that use Buffers/sharp/crypto are pinned to `runtime = "nodejs"`.

---

## APIs and services

### Attio (REST v2) — the single source of truth

| Operation | Endpoint |
|---|---|
| Create person | `POST /v2/objects/people/records` |
| Update stage | `PATCH /v2/objects/people/records/:id` |
| Query by stage / tracking_id | `POST /v2/objects/people/records/query` |
| Add activity note | `POST /v2/notes` |
| Create / link / advance deal | `POST` / `PUT` / `PATCH /v2/objects/deals/records…` (best-effort; skipped if Deals isn't enabled) |

**Custom attributes required on the Person object** — all **text**, except `icp_match_score` (number):

| Slug | Type | Values |
|---|---|---|
| `sequence_stage` | Text | `discovered` · `enriched` · `outreach_sent` · `engaged` · `needs_review` |
| `mail_status` | Text | `ready_to_send` · `sent` · `needs_human` |
| `source` | Text (select) | `seed` · `apollo` · `attio_lookalike` |
| `icp_match_score` | Number | 0–100 |
| `tracking_id` | Text | UUID minted at discovery, encoded into the QR |
| `last_touch_at` | Text | ISO-8601 timestamp |

Run `node scripts/attio-setup.mjs` to create them, or add them in Attio Settings → Objects → People → Attributes. The store always writes via the in-memory layer first, so a missing attribute or disabled Deals object never breaks the pipeline — the Attio write just logs and continues.

### Google Gemini (`@google/genai`)

JSON tasks use structured output (`responseMimeType: application/json` + schema). Retries on 429/500/503 with backoff.

| Task | Model | Output |
|---|---|---|
| Parse ICP from natural language | `gemini-2.5-flash` | `{titles[], industries[], headcount[min,max]}` |
| Score lead vs ICP | `gemini-2.5-flash` | `{score 0-100, reason}` |
| Email copy | `gemini-2.5-flash` | `{subject, html}` |
| Postcard copy | `gemini-2.5-flash` | `{headline, personal_line, body, cta, sign_off}` |
| Image art-direction | `gemini-2.5-flash` | `{image_prompt, negative_prompt, aspect_ratio}` |
| Postcard hero image | `gemini-3-pro-image` → `gemini-3.1-flash-image` (fallback) | PNG (raw `generateContent`, `responseModalities:["IMAGE"]`) |
| Extract enrichment fact | `gemini-2.5-flash` | `{signal}` |

The hero image is cached to `os.tmpdir()/strike-postcard-cache/<trackingId>.png` on first generation and served from cache thereafter — pre-generate before a live demo. If both image models fail it falls back to an on-brand gradient placeholder so compose always completes.

### Tavily (`@tavily/core`)

Enrich job — finds a "why now" signal per company; raw snippets are distilled by Gemini `extractFacts()` into a single signal sentence stored in Attio.

### Lob (REST v1)

| | |
|---|---|
| Endpoint | `POST https://api.lob.com/v1/postcards` |
| Auth | Basic — API key as username, blank password |
| Body | `multipart/form-data` — pre-rendered **front + back PNGs** uploaded directly (no hosted URL needed) |
| Size | `4x6` |
| QR | Baked into the back PNG by the `qrcode` library (error-correction H), encoding `/r/:trackingId` — never drawn by the image model |
| Sandbox | `test_` key renders a proof PDF instantly, nothing mailed |
| Returns | `id` + `url` (proof PDF, written back to Attio + shown in the dashboard) |

### Apollo.io (REST v1)

Org enrichment only — `GET /v1/organizations/enrich?domain=…` with `X-Api-Key` (people search is paid-only; discovery uses seed leads instead).

### Resend

Sends the outreach email — from `Reachd <onboarding@resend.dev>`, subject/HTML by Gemini. (Test sender delivers only to the account owner's inbox until a domain is verified.)

### Calendly (webhook)

`POST /api/webhooks/calendly` — on `invitee.created`, ties back via `utm_content=<trackingId>` → `markEngaged()` → `sequence_stage = engaged`, deal → `Meeting Booked`, activity note. Optional HMAC verification.

---

## Postcard generation pipeline (`lib/postcard/`, 6 stages)

Runs inside the outreach job, fully autonomously. A failed pre-send check is the only intervention point — it sets `mail_status = needs_human` (and routes the lead to `needs_review`) instead of sending. Every stage has a deterministic fallback, so the pipeline runs end-to-end with zero keys.

```
Input: MailInput { prospect, enrichment[], brand_kit, tracking_id, booking_url, attio_record_id }
        │
Stage 1 — Distil        Gemini picks the single strongest, verifiably-true hook (or null).
        │               → {hook, hook_source, brand_cues, tone, why_relevant}
Stage 2 — Copy          Warm, non-salesy front-of-card copy within tight slot budgets.
        │               → {headline ≤6w, personal_line, body ≤150 chars, cta, sign_off}
Stage 3a — Image prompt Art-directs the hero image; fixed-zone constraints (dark lower third
        │               for the headline, clean upper-left for the logo) injected in code.
Stage 3b — Image        Gemini hero render (3-pro-image → flash fallback → gradient placeholder),
        │               cached by tracking_id.
Stage 4 — Compose       Deterministic, code not AI — sharp composites the image + headline + logo
        │               (front) and copy + real QR (back); pdf-lib builds the proof PDF. 4×6 @ 300dpi.
Stage 5 — Checks        hook non-null · headline ≤8 words · body ≤150 chars · image present ·
        │               QR decodes back to booking_url (jsQR).  Any fail → needs_human.
Stage 6 — Send          Lob test-mode: upload front + back PNGs → proof URL.

Output: MailResult { trackingId, mailStatus, proofUrl, copy, brief }
```

The composed front PNG is kept in memory and served at `GET /api/assets/:trackingId` so the dashboard can preview it.

---

## Frontend

Single client flow in `app/page.tsx`: **ICP chat → radar loading → dashboard**.

- **ICP chat** — describe your ideal customer in plain English; Gemini parses it into confirmation chips. "Start finding leads" fires discover.
- **Loading** — radar + rotating phrases; polls `/api/status` every 3s, transitions when leads appear.
- **Dashboard**
  - *Discovery tab* — card grid: name, company, ICP match score, source badge.
  - *Pipeline tab* — per-lead 5-step stepper (Discovered → Enriched → Outreach → Engaged → Booked). **Run enrich / Run outreach** advance everyone; each row also has its own **Enrich →** / **Reach out →** button to advance one lead (great for demos). Review banner when any lead hits `needs_review`; confetti on the first Meeting Booked.
  - *Lead detail* — slide-over with activity timeline, postcard proof, "Open in Attio".
  - *Postcard review* — modal for `needs_review` leads (front/back preview, approve / request changes).

The frontend works with **zero backend** — every API call falls back to `lib/fixture.ts` on network error, so the UI never goes blank during a demo.

---

## Tech stack

| Layer | Technology |
|---|---|
| App framework | Next.js 16 (App Router), React 19, TypeScript 5 — UI **and** API in one app |
| Styling | Tailwind CSS v4, shadcn/ui |
| AI / LLM | Google Gemini (`@google/genai`) |
| Web research | Tavily (`@tavily/core`) |
| Email | Resend · **Physical mail** Lob · **Lead sourcing** Apollo (org enrich) |
| CRM / database | Attio REST API v2 (only datastore) |
| Image / QR / PDF | sharp · qrcode · jsqr · pdf-lib |
| Deploy | Vercel (single project) |

---

## Running the demo

```bash
npm install && npm run dev          # http://localhost:3000

# 1. Describe your ICP, e.g. "VP Sales at fintech companies, 50–500 employees" → Start finding leads
#    → discover: 6 seed leads scored by Gemini, created in Attio

# 2. Advance the pipeline — top "Run enrich" / "Run outreach", or a single row's button:
#    enrich   → Tavily signal + Gemini distil → enrichmentSignal in Attio
#    outreach → Gemini email (Resend) + postcard (image → compose → QR → Lob proof) together

# 3. Simulate engagement (QR scan / tracked link):
curl http://localhost:3000/r/<trackingId>
#    → lead flips to "engaged" in Attio + note; redirects to Calendly

# 4. Book a Calendly meeting (with webhook configured) → deal "Meeting Booked" + confetti
```

Every write is visible in real time in Attio — group the People view by `sequence_stage` to watch records move through the pipeline on camera.

---

## Deploy (Vercel)

Push to GitHub → import the repo to Vercel → paste the same env vars → deploy. One project serves both the UI and the API. With `ATTIO_API_KEY` set, Attio is the source of truth, so the stateless serverless environment is fine. (The in-memory store is per-process and only persists across requests in a single `next dev` session.)
