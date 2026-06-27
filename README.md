This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Frontend

### Run instructions

```bash
cd attio-hackathon
npm install
npm run dev      # development server on http://localhost:3000
npm run build    # production build (zero type/lint errors)
npm run start    # production server
```

### Screens

The app is a single-page, three-phase flow driven by `app/page.tsx`:

1. **ICP Chat** (`app/_components/IcpChatScreen.tsx`) — conversational UI where the user describes their ideal customer. Defaults are pre-filled from `GET /api/icp`. On submit the ICP is parsed via `POST /api/icp/chat` and echoed as confirm chips. "Start finding leads" triggers `POST /api/jobs/discover` and advances to Loading.

2. **Loading** (`app/_components/LoadingScreen.tsx`) — radar animation with rotating phrases. Polls `GET /api/status` every 3s; transitions to Dashboard when leads exist.

3. **Dashboard** (`app/_components/DashboardScreen.tsx`) — sidebar + tab layout with:
   - **Discovery tab**: responsive grid of `LeadCard` components (avatar initials, name, company, source badge, ICP match score).
   - **Pipeline tab**: `PipelineRow` per lead with a 5-step stepper (Discovered → Enriched → Outreach → Engaged → Booked), review banner when any lead has `sequenceStage === "needs_review"`, and "Run enrich" / "Run outreach" job buttons.
   - **Lead detail** (`LeadDetailSheet`): slide-over panel with `ActivityTimeline` constructed from lead fields, postcard proof link, and "Open in Attio" button.
   - **Postcard review** (`PostcardReviewDialog`): modal for leads at `needs_review` stage — shows front/back postcard preview and Approve / Request changes actions.
   - canvas-confetti fires on first "Meeting Booked" lead detected.

### Fixture fallback

`lib/api.ts` wraps every API call in a try/catch. On network error or non-2xx response it logs a `console.warn` and returns data from `lib/fixture.ts`. This means the full demo flow — ICP chat → loading → dashboard with cards, pipeline stepper, and confetti — works with zero backend running.

Environment variable `NEXT_PUBLIC_API_BASE` controls the backend origin (defaults to same-origin, i.e. `""`).

### Custom components

All custom components live in `components/strike/`:
- `RadarLoader` — animated radar rings for the loading screen
- `Stepper` — 5-step pipeline stepper with filled/current/empty dot states
- `LeadCard` — discovery grid card
- `PipelineRow` — pipeline row wrapping Stepper
- `ActivityTimeline` — constructs timeline from `Lead` fields
- `LeadDetailSheet` — slide-over detail panel
- `PostcardReviewDialog` — postcard front/back review modal

Design tokens from the prototype are defined as `--strike-*` CSS custom properties in `app/globals.css`.
