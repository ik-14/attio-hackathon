# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state of the repo

This repo is **planning-stage only**. It contains design docs, not yet the code they describe:

- `build-plan.md` — the architecture spec (read this first; it's the source of truth). One deviation: image generation uses **Google (Gemini)**, settled — see the postcard module note below.
- `hackathon-execution-plan.md` — the 6-hour build timeline, parallel workstreams, and cut-list if behind schedule.
- `README.md` — placeholder.

The plans reference artifacts that **do not exist in this repo yet** — assume you may be the one creating them:
- An `outreach-agent/` Node.js/TypeScript service (the plans describe it as "scaffolded," but it isn't checked in here).
- `postcard-generation-agent.md` and `agentic-crm-outreach-agent.md` (referenced as shipped alongside the plans, but absent).

There is no `package.json`, build, lint, or test setup yet. When the code lands, the stack is **Node.js / TypeScript with Express**.

## What this project is

An autonomous "warm-up-then-strike" sales outreach agent for a hackathon demo. It runs a sequential state machine per lead: **discover → enrich → teaser email → (2-day wait) → physical postcard via Lob → engagement detection → write back to Attio**. Booking a Calendly meeting is the "closed the loop" success signal.

The non-negotiable demo spine, to protect above all polish: *discover → enrich → teaser → mail → Attio updates, for one rehearsed prospect.*

## Core architectural decisions (don't violate these without reason)

- **Attio is the database.** There is no separate datastore for lead data. Lead state lives in custom attributes on the Attio Person object (`sequence_stage`, `source`, `icp_match_score`, `tracking_id`, `last_touch_at`, `mail_status`), and every step also writes a note to the record's activity feed. Only the user's own Attio credential + ICP criteria live outside Attio — as `.env` config for the single-workspace hackathon scope.
- **Attio via REST directly, not MCP.** A thin `attioClient.ts` wrapper; one function per operation.
- **Every external call needs a free/sandbox mode** (Apollo free search, Lob test mode, Calendly free tier, SIE free-during-event, Tavily free credits). The system must run end-to-end on a handful of demo leads, not production volume.
- **Sequential state machine over queues/retries.** Best-effort reliability is acceptable; a clean per-lead progression matters more than robustness for the demo.

## Service shape

One Node/TS service, three entry points, all writing through the same Attio client:
1. **Frontend** — onboarding (connect Attio, set ICP) + a status dashboard that is a *window onto Attio*, not a replacement for it.
2. **Scheduler** — drives the sequence automatically (the intended end-user surface).
3. **Express server** — receives `/webhooks/calendly` (booking → `engaged`) and `/r/:trackingId` (tracked click → logs + `engaged` + redirect to booking page).

The `/jobs/:jobName` routes (`discover`, `enrich`, `teaser`, `mail`, `stale-check`) stay manually triggerable as a **dev/demo lever only** — a real user never touches them; the scheduler calls them. See `build-plan.md` §7 for the full internal API contract.

## Sponsor services to wire in (replace stubs with these)

- **SIE (`@superlinked/sie-sdk`)** — hosted open-model inference. `encode` for the real Attio-lookalike `icp_match_score` (cosine similarity of closed-won deals vs. Apollo candidates, replacing any hardcoded score); `extract` for structured enrichment fields; `generate` for teaser/postcard copy. First call to a model can take ~60s and may 504 on cold start — **retry once with `wait_for_capacity: true`** rather than fail. Suggested file: `src/clients/sieClient.ts`.
- **Tavily** — real-time web search for `getWebSignal(company)` in enrichment. Suggested file: `src/clients/tavilyClient.ts`.
- New client files should mirror the `attioClient.ts` pattern (thin wrapper, one function per primitive used).

## The postcard module (Step 5 / `/jobs/mail`)

The most involved piece — a 6-stage pipeline (brand-kit → distil → copy → image → compose → checks → store PDF → Lob send) with **no human in the happy-path loop**; a failed automated check is the only thing that pulls in a human (sets `mail_status = needs_human`, distinct from the macro `sequence_stage = needs_review`). Full spec is meant to live in `postcard-generation-agent.md` (not yet present). Key points: text stages run on SIE `generate`; **image generation uses Google (Gemini), not SIE** — this is settled (SIE has no image primitive). **Generate and cache the image early** — it's the slowest/flakiest call; never depend on a live first image call on stage.

## Demo-context reminders

- The demo is **pre-recorded in segments**, so a flaky moment means re-recording a segment, not failing live.
- Lean on Attio's own activity feed as the on-camera proof of work.
- If behind schedule, cut in the order given in `hackathon-execution-plan.md` §6 — but **never** cut the Attio writes or the one rehearsed prospect moving through `sequence_stage` end to end.
- Confirm exact Gemini/SIE model strings close to demo day — both move quickly and `-preview` IDs get retired.
