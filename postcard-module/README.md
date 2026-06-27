# Postcard module — Workstream B

## Where this fits

This is **step 4 of 5** in the outreach sequence:

```
1. Discover      find leads matching the ICP (Apollo + Attio)         → Workstream A
2. Enrich        find a news hook for each lead (Tavily)               → Workstream A
3. Teaser email  send a vague "something's coming" email (Resend)      → Workstream A
         ↓  wait 2 days, if no reply...
4. Postcard      generate + mail a bespoke physical card               → THIS BRANCH
         ↓  if they scan the QR on the card...
5. Engaged       mark them in Attio, redirect to Calendly              → Workstream A
```

The postcard module is the body of the `/jobs/mail` handler. It runs autonomously — no human reviews the card before it's sent. The only human touch is a failed automated check (`mail_status = needs_human`).

---

## What it does (6 stages)

```
Input: prospect details + enrichment signals + brand kit + tracking ID

Stage 1  Distil     picks the single best news hook from enrichment signals
Stage 2  Copy       writes headline, personal line, body, CTA, sign-off
Stage 3a ImagePrompt art-directs a prompt for the front image (no text/logos)
Stage 3b Image      generates the front image (Gemini), cached to disk
Stage 4  Compose    lays out front (image + headline + logo) and back
                    (copy + QR code + URL) as a 4×6 print-ready PDF
Stage 5  Checks     validates before autonomous send:
                      - hook is non-null
                      - headline ≤ 8 words, body ≤ 320 chars
                      - front image is present at correct dimensions
                      - QR decodes back to the correct booking URL
Stage 6  Send       submits front/back PNGs to Lob (test mode),
                    writes mail_status + activity note back to Attio

Output: mail_status (sent | needs_human), PDF path, Lob proof URL
```

---

## APIs used

| API | What we send | What we get back |
|---|---|---|
| **Gemini** (`gemini-2.5-flash`) | Stage 1/2/3a: system prompt + prospect/enrichment data as JSON | JSON matching our schema (hook, copy fields, image prompt) |
| **Gemini** (`gemini-3-pro-image` → `gemini-3.1-flash-image` fallback) | Stage 3b: image prompt text + optional logo as reference image | Base64-encoded image |
| **Lob** (test mode) | Stage 6: front PNG, back PNG, prospect postal address, our from-address | Postcard ID + proof PDF URL |
| **Attio** (REST) | Stage 5+6: PATCH `mail_status` / `sequence_stage` on the person record; POST activity note | 200 OK (or 400 if attributes don't exist yet) |

---

## Data in / data out

### Input (`MailInput`)

```jsonc
{
  "prospect": {
    "first_name": "Jane", "last_name": "Doe",
    "title": "VP of Growth", "company": "Northwind Coffee",
    "company_domain": "northwindcoffee.com", "industry": "retail",
    "email": "jane@northwindcoffee.com",   // used for Calendly prefill downstream
    "postal_address": { "line1": "...", "city": "...", "state": "CA", "postcode": "...", "country": "US" }
  },
  "enrichment": [
    { "signal": "Closed a $6m Series A and opening a flagship Shoreditch store", "source_url": "...", "published_date": "2026-06-20" }
  ],
  "brand_kit": {
    "logo_url": null,                        // or a URL — fetched and used as a Gemini reference image
    "palette": ["#0b3d2e", "#f2e9dc", "#c9a23f"],
    "fonts": ["Helvetica", "Arial"],
    "source": "fallback"
  },
  "tracking_id": "trk_demo_northwind_001",   // minted at discovery by Workstream A
  "booking_url": "https://calendly.com/kiki-zhang058/30min",  // encoded into QR; will be /r/:trackingId in prod
  "attio_record_id": "01bc05b4-..."          // real Attio UUID of the person record
}
```

This input comes from **Workstream A** in production — they read the lead's Attio record and build this object before calling `runMailJob()`. For isolated testing, it's supplied via `fixtures/rehearsed-prospect.json`.

### Output (`MailResult`)

```jsonc
{
  "tracking_id": "trk_demo_northwind_001",
  "attio_record_id": "01bc05b4-...",
  "mail_status": "sent",          // or "needs_human" if Stage 5 fails
  "brief": { "hook": "...", ... },
  "copy": { "headline": "...", "body": "...", ... },
  "pdfPath": "./out/trk_demo_northwind_001/postcard.pdf",
  "lob_id": "psc_abc123",
  "proof_url": "https://lob-assets.com/postcards/psc_abc123.pdf"
}
```

### Attio writes

Two writes happen per run:

1. **PATCH** `/v2/objects/people/records/:attio_record_id` — updates `mail_status` and `sequence_stage` on the person
2. **POST** `/v2/notes` — posts an activity note to the person's feed (this is the on-camera proof in the demo)

---

## Running it

```bash
cd postcard-module
npm install
cp .env.example .env     # fill in keys (see below)
npm run demo             # happy path → out/trk_demo_northwind_001/postcard.pdf
npm run demo -- fixtures/no-hook.json   # tests the needs_human gate
```

### Keys needed (`.env`)

| Key | What for | Without it |
|---|---|---|
| `GEMINI_API_KEY` | Text stages 1/2/3a + image stage 3b | Mock text + branded gradient placeholder |
| `LOB_API_KEY` | Send via Lob test mode | Logged as mock, PDF still saved locally |
| `ATTIO_API_KEY` | Write mail_status + activity note | Logged only, no Attio update |

**The pipeline runs end-to-end with zero keys** — you get deterministic mock text, a branded gradient image, and a valid PDF. Keys upgrade each stage in place.

### Force a fresh image

The Gemini image is cached by `tracking_id` at `out/cache/<tracking_id>.png`. Delete it to re-generate:

```bash
rm out/cache/trk_demo_northwind_001.png
npm run demo
```

---

## Integration for Workstream A

1. Copy `src/` into `outreach-agent/src/` — the layout already mirrors `src/clients/` + `src/jobs/`
2. In your `/jobs/mail` route, for each lead with `sequence_stage = teaser_sent` idle 2+ days:

```ts
import { runMailJob } from "./jobs/mail.js";

const result = await runMailJob({
  prospect:         /* built from Attio person record */,
  enrichment:       /* signals stored by the enrich job */,
  brand_kit:        /* fetched at enrich time or here */,
  tracking_id:      /* from Attio person record */,
  booking_url:      `https://<your-host>/r/${tracking_id}`,
  attio_record_id:  /* Attio person record UUID */,
});
```

3. The `attioClient.ts` here is a minimal shim — swap `recordMailEvent` for the real client once it lands. It degrades gracefully (logs only) if attributes don't exist yet.

### Contract this module depends on from Workstream A

- `tracking_id` must be minted at **discovery** and stored on the Attio record
- `/r/:trackingId` must handle the click: write `sequence_stage = engaged` + an activity note to Attio, then redirect to Calendly with name/email prefilled
- The 6 custom attributes must exist on the Attio Person object: `sequence_stage`, `mail_status`, `source`, `icp_match_score`, `tracking_id`, `last_touch_at`
