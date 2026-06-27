# Reachd — Autonomous Sales Outreach Agent

Reachd is an AI agent that discovers leads, researches them, then sends a personalised email and a bespoke physical postcard in one shot — fully autonomously. When the prospect scans the QR code or books a meeting, Reachd writes the engagement back to Attio and closes the loop.

Built for the Attio Hackathon 2026.

---

## What it does

```
User types their ICP once ("VP Sales at fintech, 50-500 people")
         │
         ▼
1. Discover    Score Apollo candidates against the ICP using Gemini          → person + deal created in Attio
2. Enrich      Tavily web search finds a "why now" signal per company        → enrichmentSignal written to Attio
3. Outreach    Gemini writes personalised email + postcard copy simultaneously → both dispatched in one step
               ├── Email  → Resend
               └── Postcard → 6-stage generation pipeline → Lob (physical mail)
4. Engage      Prospect scans QR / books Calendly / webhook fires            → sequence_stage = engaged in Attio
5. Stale-check Flags leads idle too long for human review                    → needs_review in Attio
```

Everything is written back to Attio. No separate database. The agent runs autonomously — the user never touches a terminal after initial setup.

---

## Repository layout

The project is split across two branches that merge for the demo:

| Branch | What it contains |
|---|---|
| `ali/noref/backend` | Next.js 16 full-stack app: frontend (ICP chat, pipeline dashboard), all API routes, job runners, Attio/Gemini/Tavily/Resend/Apollo/Lob client wrappers, in-memory store with Attio sync |
| `yewen` | Standalone postcard-generation module: 6-stage pipeline that produces a print-ready PDF, QR code, and Lob submission |

```
attio-hackathon/                   ← ali/noref/backend
├── app/
│   ├── _components/               ICP chat, loading radar, pipeline dashboard
│   └── api/
│       ├── icp/                   Parse ICP from natural language (Gemini)
│       ├── jobs/[jobName]/        Trigger discover / enrich / outreach / stale-check
│       ├── leads/                 List leads for dashboard
│       ├── r/[trackingId]/        QR click tracking → engaged
│       ├── assets/[id]/           Serve Gemini-generated postcard image
│       ├── webhooks/calendly/     Booking webhook → engaged
│       └── status/                Pipeline health
├── lib/
│   ├── clients/                   Attio · Gemini · Tavily · Resend · Apollo · Lob
│   ├── jobs/                      discover · enrich · outreach · staleCheck
│   ├── store.ts                   In-memory store with Attio side-effect sync
│   ├── types.ts                   Shared FE/BE contract (Lead, SequenceStage, …)
│   ├── config.ts                  Key-aware config + has.* stub guards
│   └── seed.ts                    Demo prospect seed data
└── scripts/
    └── attio-setup.mjs            Idempotent Attio workspace setup script

postcard-module/                   ← yewen
├── src/
│   ├── clients/
│   │   ├── llmClient.ts           Gemini text wrapper with mock fallback
│   │   ├── geminiImageClient.ts   Gemini image generation + disk cache
│   │   ├── lobClient.ts           Lob postcard submission
│   │   └── attioClient.ts         Attio shim (mail_status write + activity note)
│   ├── stages/
│   │   ├── distil.ts              Stage 1 — pick the strongest news hook
│   │   ├── copy.ts                Stage 2 — write headline, body, CTA
│   │   ├── imagePrompt.ts         Stage 3a — art-direct the image prompt
│   │   ├── generateImage.ts       Stage 3b — Gemini image generation
│   │   ├── compose.ts             Stage 4 — PDF layout (pdf-lib + sharp)
│   │   ├── checks.ts              Stage 5 — QR decode, word count, dimensions
│   │   └── send.ts                Stage 6 — Lob submit + Attio update
│   ├── jobs/mail.ts               Orchestrator for all 6 stages
│   └── types.ts                   MailInput / MailResult contract
└── fixtures/
    └── rehearsed-prospect.json    Demo input (Jane Doe, Northwind Coffee)
```

---

## Quick start

### Main app (Next.js)

```bash
# Requires: Node 20+, npm
git checkout ali/noref/backend
npm install

cp .env.local.example .env.local   # fill in keys (see table below)
npm run dev                         # http://localhost:3000

# (Optional) create Attio custom attributes automatically:
node scripts/attio-setup.mjs
```

Open [http://localhost:3000](http://localhost:3000). The app works with **zero API keys** — every client falls back to deterministic stubs so the full UI flow (ICP chat → loading → dashboard with leads and stepper) runs locally with no credentials.

### Postcard module (standalone test)

```bash
git checkout yewen
cd postcard-module
npm install

cp .env.example .env   # fill in keys
npm run demo           # generates out/trk_demo_northwind_001/postcard.pdf

# Force a fresh Gemini image (skips disk cache):
rm out/cache/trk_demo_northwind_001.png && npm run demo

# Test the needs_human gate (lead with no hook):
npm run demo -- fixtures/no-hook.json
```

---

## Environment variables

### Main app — `.env.local`

| Variable | Required | What it does | Without it |
|---|---|---|---|
| `ATTIO_API_KEY` | Recommended | Read/write people, deals, notes in Attio | Stubs log Attio calls; store is in-memory only |
| `GEMINI_API_KEY` | Recommended | ICP parsing, lead scoring, email/postcard copy, image generation | Deterministic stubs return plausible fake data |
| `TAVILY_API_KEY` | Optional | Live web search for enrichment signals | Stub returns canned signal string |
| `RESEND_API_KEY` | Optional | Send outreach emails | Stub logs email, returns fake ID |
| `LOB_API_KEY` | Optional | Send physical postcards (use `test_` prefix for sandbox) | Stub logs postcard, returns fake proof URL |
| `APOLLO_API_KEY` | Optional | Org enrichment endpoint (free tier) | Stub returns null |
| `BOOKING_PAGE_URL` | Optional | Calendly URL encoded into tracked links | Defaults to `https://calendly.com/kiki-zhang058/30min` |
| `BASE_URL` | Optional | Public host for tracking links and image URLs | Defaults to `http://localhost:3000` |
| `CALENDLY_WEBHOOK_SIGNING_KEY` | Optional | Validate Calendly booking webhooks | Webhooks accepted without signature check |

### Postcard module — `postcard-module/.env`

| Variable | Required | What it does | Without it |
|---|---|---|---|
| `GEMINI_API_KEY` | Recommended | Text stages 1/2/3a + image stage 3b | Deterministic mock text + branded gradient image |
| `GEMINI_TEXT_MODEL` | Optional | Text model override | `gemini-2.5-flash` |
| `GEMINI_IMAGE_MODEL` | Optional | Image model | `gemini-2.0-flash-preview-image-generation` |
| `LOB_API_KEY` | Optional | Send to Lob (use `test_` prefix for sandbox) | PDF saved locally, not submitted |
| `ATTIO_API_KEY` | Optional | Write `mail_status` + activity note to Attio | Logs only |
| `TEXT_LLM_PROVIDER` | Optional | `gemini` or `mock` | `gemini` |
| `OUT_DIR` | Optional | Where PDFs and image cache are saved | `./out` |

---

## APIs and services used

### Attio (REST v2)

The single source of truth. No separate database.

| Operation | Endpoint | What we send | What we get |
|---|---|---|---|
| Create person | `POST /v2/objects/people/records` | name, email, source, icp_match_score, tracking_id, sequence_stage | `record_id` UUID |
| Update stage | `PATCH /v2/objects/people/records/:id` | sequence_stage, last_touch_at (or mail_status) | 200 OK |
| Query by stage | `POST /v2/objects/people/records/query` | filter on sequence_stage attribute | Array of person records |
| Add note | `POST /v2/notes` | parent_object=people, parent_record_id, content | Note object |
| Create deal | `POST /v2/objects/deals/records` | name, stage | `record_id` UUID |
| Link person → deal | `PUT /v2/objects/deals/records/:id/associations/people` | person record_id | 200 OK |
| Update deal stage | `PATCH /v2/objects/deals/records/:id` | stage status | 200 OK |

**Custom attributes required on the Attio Person object** (all text, except `icp_match_score` which is number):

`sequence_stage` · `mail_status` · `source` · `icp_match_score` · `tracking_id` · `last_touch_at`

Run `node scripts/attio-setup.mjs` to create them automatically, or add them manually in Attio Settings → Objects → People → Attributes.

---

### Google Gemini (`@google/genai`)

Used for six distinct tasks. All JSON outputs use `responseMimeType: "application/json"` with explicit `responseSchema` to prevent hallucinated wrapper keys.

| Task | Model | Input | Output schema |
|---|---|---|---|
| Parse ICP from natural language | `gemini-2.5-flash` | Free-text ICP description | `{titles[], industries[], headcount[min,max]}` |
| Score lead against ICP | `gemini-2.5-flash` | Lead details + ICP criteria | `{score: 0-100, reason: string}` |
| Write email copy | `gemini-2.5-flash` | Lead name, company, enrichment signal, ICP | `{subject, html}` |
| Write postcard copy | `gemini-2.5-flash` | Lead name, company, signal | `{personalLine, body, cta}` |
| Art-direct image prompt | `gemini-2.5-flash` | Brand cues, sector, tone | `{image_prompt, negative_prompt, aspect_ratio}` |
| Generate postcard front image | `gemini-2.0-flash-preview-image-generation` | Art-directed text prompt | Base64-encoded PNG |
| Extract enrichment facts | `gemini-2.5-flash` | Raw Tavily search snippets | `{signal: string}` |

Images are cached to disk at `postcard-module/out/cache/<trackingId>.png` on first generation. Subsequent runs serve from cache — always pre-generate before the demo.

---

### Tavily (`@tavily/core`)

Used in the Enrich job to find a "why now" signal for each prospect company.

| | |
|---|---|
| Endpoint | `client.search()` via SDK |
| Query | `"<company> latest news funding hiring 2024 2025"` |
| Options | `maxResults: 3`, `searchDepth: "basic"` |
| Output | Top 3 result snippets concatenated, truncated to 500 chars |

Raw snippets are passed to Gemini `extractFacts()` to distil into a single actionable signal sentence stored in Attio.

---

### Lob (REST v1)

Submits the finished postcard for physical printing and mailing.

| | |
|---|---|
| Endpoint | `POST https://api.lob.com/v1/postcards` |
| Auth | Basic auth — `lobApiKey` as username, blank password |
| Size | `6x11` |
| Front | HTML with embedded Gemini-generated image |
| Back | HTML with personalised copy + URL |
| QR code | Native Lob `qr_code` object — redirects to `/r/:trackingId` |
| Sandbox | `test_` prefixed key renders a PDF proof instantly, nothing mailed |
| Returns | `id` (postcard ID), `url` (proof PDF URL written back to Attio) |

---

### Apollo.io (REST v1)

Organisation enrichment — free tier endpoint only (people search requires paid plan).

| | |
|---|---|
| Endpoint | `GET https://api.apollo.io/v1/organizations/enrich?domain=<domain>` |
| Auth | `X-Api-Key` header |
| Returns | `{name, industry, estimated_num_employees, short_description}` |

---

### Resend (`resend` SDK)

Sends the personalised outreach email.

| | |
|---|---|
| From | `Strike <onboarding@resend.dev>` |
| To | Lead email address from seed data |
| Subject / HTML | Generated by Gemini based on lead + enrichment signal |
| Returns | `{id}` — logged to Attio activity note |

---

### Calendly (webhook)

Receives booking events when a prospect clicks through and books a meeting.

| | |
|---|---|
| Endpoint on Strike | `POST /api/webhooks/calendly` |
| Event type | `invitee.created` |
| Verification | Optional HMAC-SHA256 (`CALENDLY_WEBHOOK_SIGNING_KEY`) |
| Action | `store.markEngaged(trackingId)` → `sequence_stage = engaged`, `dealStage = "Meeting Booked"`, activity note in Attio |

---

## Data flow — end to end

```
User → ICP Chat UI
         │
         ▼
POST /api/icp/chat  ─── Gemini parseIcp() ─────────────────► ICP stored in memory
         │
         ▼
POST /api/jobs/discover
   For each seed lead:
   ├── Gemini scoreLead(lead, icp) ─────────────────────────► score: 0-100
   └── store.createLead()
       ├── Attio: POST /v2/objects/people/records ──────────► person record_id
       ├── Attio: POST /v2/notes ───────────────────────────► "Lead discovered" note
       └── Attio: POST /v2/objects/deals/records ──────────► deal record_id
         │
         ▼
POST /api/jobs/enrich
   For each "discovered" lead:
   ├── Tavily search("<company> news") ─────────────────────► raw snippets
   ├── Gemini extractFacts(snippets) ───────────────────────► signal string
   └── store.updateLead(enrichmentSignal, stage="enriched")
       └── Attio: PATCH sequence_stage = enriched
         │
         ▼
POST /api/jobs/outreach
   For each "enriched" lead (email + postcard in parallel):
   ├── (a) Email
   │   ├── Gemini writeEmailCopy() ─────────────────────────► {subject, html}
   │   └── Resend sendEmail() ──────────────────────────────► email delivered
   │
   └── (b) Postcard
       ├── Gemini imagePrompt() ────────────────────────────► {prompt, negative}
       ├── Gemini generateImage(prompt, trackingId) ─────────► PNG cached to disk
       ├── GET /api/assets/:trackingId serves it ───────────► image URL for Lob
       ├── Gemini writePostcardCopy() ──────────────────────► {personalLine, body, cta}
       └── Lob sendPostcard(front, back, qr_code) ──────────► {id, proofUrl}
   └── Attio: PATCH sequence_stage = outreach_sent, mail_status = sent
   └── Attio: POST /v2/notes "Outreach dispatched…"
         │
         ▼
Prospect scans QR (or clicks email link, or books Calendly)
         │
         ▼
GET /r/:trackingId
   ├── store.markEngaged(trackingId) ───────────────────────► stage = engaged
   ├── Attio: PATCH sequence_stage = engaged
   ├── Attio: POST /v2/notes "Booking link clicked"
   └── 302 redirect → Calendly booking page
         │
         ▼
POST /webhooks/calendly  (on meeting booked)
   ├── store.markEngaged(trackingId, "Meeting Booked") ─────► dealStage = Meeting Booked
   ├── Attio: PATCH deal stage
   └── Attio: POST /v2/notes "Meeting booked"
```

---

## Postcard generation pipeline (6 stages)

The postcard module (`yewen` branch) runs fully autonomously. A failed automated check is the only intervention point — it sets `mail_status = needs_human` instead of sending.

```
Input: MailInput
  prospect: {name, title, company, industry, email, postal_address}
  enrichment: [{signal, source_url, published_date}]
  brand_kit:  {palette, fonts, logo_url}
  tracking_id: "trk_…"
  booking_url: "https://…/r/:trackingId"
  attio_record_id: "<uuid>"
        │
        ▼
Stage 1 — Distil  [lib: distil.ts]
  Gemini picks the single strongest, most specific, verifiably-true hook from the
  enrichment signals. Never invents facts. hook = null if nothing qualifies.
  Output: {hook, hook_source, brand_cues{palette, visual_style, sector}, tone, why_relevant}
        │
        ▼
Stage 2 — Copy  [lib: copy.ts]
  Gemini writes warm, non-salesy direct-mail copy referencing the hook naturally.
  Output: {headline (≤8 words), personal_line, body (2-3 sentences), cta, sign_off}
        │
        ▼
Stage 3a — Image prompt  [lib: imagePrompt.ts]
  Gemini art-directs the front image. CRITICAL: no text/logos/QR in prompt.
  Output: {image_prompt, negative_prompt, aspect_ratio}
        │
        ▼
Stage 3b — Image generation  [lib: generateImage.ts]
  Gemini generates the image. Cached to out/cache/<trackingId>.png.
  Falls back to a branded gradient placeholder on failure.
        │
        ▼
Stage 4 — Compose  [lib: compose.ts]
  pdf-lib + sharp build the print-ready PDF:
  Front: generated image + headline overlay + brand logo (if provided)
  Back:  personal_line + body + CTA + QR code pointing at booking_url
  Output: postcard.pdf saved to out/<trackingId>/
        │
        ▼
Stage 5 — Automated checks  [lib: checks.ts]
  ✓ hook is non-null
  ✓ headline ≤ 8 words
  ✓ body ≤ 320 characters
  ✓ front image present at correct dimensions
  ✓ QR decodes back to the correct booking URL (jsqr)
  Any fail → mail_status = needs_human
  All pass → Stage 6
        │
        ▼
Stage 6 — Send  [lib: send.ts]
  Lob test-mode: submits front + back HTML, returns proof PDF URL.
  Attio: PATCH mail_status = sent, sequence_stage = outreach_sent
  Attio: POST /v2/notes with proof URL

Output: MailResult
  {tracking_id, attio_record_id, mail_status, pdfPath, lob_id, proof_url}
```

Every stage degrades gracefully — if Gemini is unavailable, deterministic mock outputs keep the pipeline runnable end-to-end with zero API keys.

---

## Frontend screens

**ICP Chat** — User types their ideal customer profile in plain English. Gemini parses it into structured criteria (titles, industries, headcount range) shown as confirmation chips. "Start finding leads" fires the discover job.

**Loading** — Animated radar screen with rotating status phrases. Polls `/api/status` every 3 seconds and transitions to the dashboard automatically when leads appear.

**Pipeline Dashboard**
- Discovery tab: Card grid — name, company, ICP match score, source badge.
- Pipeline tab: Per-lead 5-step stepper (Discovered → Enriched → Outreach → Engaged → Booked). "Run enrich" and "Run outreach" buttons advance the pipeline. Review banner appears when any lead reaches `needs_review`.
- Lead detail: Slide-over panel with activity timeline, postcard proof PDF link, "Open in Attio" deep link.
- Postcard review: Modal for `needs_review` leads showing front/back preview with Approve / Request changes actions.
- Confetti fires on first `Meeting Booked` lead detected.

The frontend works with **zero backend** — all API calls fall back to fixture data in `lib/fixture.ts` on network error, so the UI never goes blank during a demo.

The brand name **Reachd** is used throughout the app — from address on emails/postcards, activity notes posted to Attio, and the dashboard UI.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend framework | Next.js 16 (App Router), React 19, TypeScript 5 |
| Styling | Tailwind CSS v4, shadcn/ui |
| Data fetching | SWR |
| AI / LLM | Google Gemini (`@google/genai`) |
| Web research | Tavily (`@tavily/core`) |
| Email delivery | Resend |
| Physical mail | Lob |
| CRM / database | Attio REST API v2 |
| Lead sourcing | Apollo.io (org enrichment, free tier) |
| PDF generation | pdf-lib |
| Image processing | sharp |
| QR generation | qrcode |
| QR verification | jsqr |
| Runtime | Node.js 20+ |

---

## Attio workspace setup

All lead data lives in Attio — no separate database. Six custom attributes must exist on the **Person** object:

| Attribute slug | Type | Values |
|---|---|---|
| `sequence_stage` | Text | `discovered` · `enriched` · `outreach_sent` · `engaged` · `needs_review` |
| `mail_status` | Text | `ready_to_send` · `sent` · `needs_human` |
| `source` | Text | `seed` · `apollo` · `attio_lookalike` |
| `icp_match_score` | Number | 0–100 |
| `tracking_id` | Text | UUID minted at discovery, encoded into QR |
| `last_touch_at` | Text | ISO 8601 timestamp |

```bash
# Create all attributes automatically:
ATTIO_API_KEY=your_key node scripts/attio-setup.mjs
```

Or manually: Attio Settings → Objects → People → Attributes → Add attribute.

---

## Running the full demo sequence

```bash
# 1. Start the app
git checkout ali/noref/backend
npm install && npm run dev    # http://localhost:3000

# 2. Open http://localhost:3000 and describe your ICP, e.g.:
#    "VP Sales or Head of Revenue at fintech companies, 50-500 employees"

# 3. Click "Start finding leads"
#    → discover job runs: 6 seed leads scored and created in Attio

# 4. Click "Run enrich"
#    → Tavily fetches a news signal per company; Gemini distils it
#    → enrichmentSignal written to each Attio person record

# 5. Click "Run outreach"
#    → Gemini writes personalised email + postcard copy per lead
#    → Resend delivers the email
#    → Gemini generates the front image (cached)
#    → Lob test-mode sends the postcard; proof PDF URL stored in Attio

# 6. Simulate a QR scan (or click the tracked link):
curl http://localhost:3000/r/<trackingId>
#    → Lead flips to "engaged" in Attio + activity note posted
#    → Dashboard stepper advances; redirects to Calendly booking page

# 7. Book a real Calendly meeting (if webhook tunnel is configured):
#    → Deal stage flips to "Meeting Booked"
#    → Confetti fires on the dashboard
```

Every stage write is visible in real time in your Attio workspace — activity feed, custom attributes, deal stage — even before the dashboard refreshes.
