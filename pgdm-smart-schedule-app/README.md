# IMI PGDM Smart Schedule

A live, auto-refreshing dashboard for IMI PGDM class schedules and events,
sourced directly from a Google Sheet. Supports multiple concurrently-active
batches (e.g. an outgoing 2nd-year batch and an incoming 1st-year batch),
auto-detected from the sheet itself. Built with Next.js (App Router),
TypeScript, and Tailwind CSS v4.

## Features

- **Year onboarding** — on first visit, students pick which batch/year
  they're in; every batch present in the sheet is offered automatically,
  labeled "1st Year", "2nd Year", etc. based on how recently each started
- **Live session board** — split-flap-style countdown to the current or next class
- **Today's classes** and a **weekly timetable** grid (view 1-4 weeks at once),
  filterable by subject code
- **Settings page** — switch your year/batch, choose which of your subjects
  to show (scoped per batch), toggle "show all sections", and point the app
  at a different Google Sheet without redeploying (all saved in your browser)
- **Events** page — today / upcoming / previous, filterable by category, with
  a one-click "add to Google Calendar" link
- **Notice page** — auto-detected changes to the sheet (classes/events
  added, removed, or changed), split into Class and Event notices, visible
  for 1 week, with a "Clear All" option
- Dark/light theme (persisted), installable as a **PWA** with basic offline support
- Auto-refreshes from the Google Sheet every 5 minutes

## Getting started

```bash
npm install
cp .env.example .env.local   # already done in this repo; edit values if needed
npm run dev
```

Open http://localhost:3000.

## Configuration

All configuration lives in `.env.local` (see `.env.example`):

| Variable                          | Purpose                                                            |
| --------------------------------- | ------------------------------------------------------------------ |
| `NEXT_PUBLIC_SHEET_ID`            | The Google Sheet's ID (from its URL)                               |
| `SHEET_TAB_NAME`                  | Specific tab name to read (optional — defaults to the first sheet) |
| `NEXT_PUBLIC_REFRESH_INTERVAL_MS` | Client polling interval (default 5 minutes)                        |

**The source sheet must be shared as "Anyone with the link can view."** No
API key or "Publish to web" step is required — data is read via Google's
public `gviz` JSON endpoint.

### Multi-batch support — nothing hardcoded

The app targets no fixed batch, subject list, or timing grid — everything
is read live from the sheet itself:

- **Batches**: `lib/sheet/matchBatch.ts` recognizes ANY "Batch and Section"
  cell shaped like `PGDM YYYY-YY -X` and groups rows by whatever batches
  actually appear in the sheet. Batches are ranked by start year — the
  most recently started is "1st Year", the one before it "2nd Year", and
  so on — via `lib/schedule/deriveAvailableBatches.ts`. This keeps working
  correctly as batches graduate and new ones begin, with no code changes
  needed year over year.

- **Subjects**: `lib/sheet/resolveSubjectIdentity.ts` cross-references
  every occurrence of a subject code across the WHOLE sheet to tell a
  genuine identity qualifier apart from a redundant section tag — with no
  hardcoded subject list at all. For example, if "MK629 (A)" shows up
  identically on Section A, B, _and_ C rows, that proves "(A)" isn't a
  section marker (a real section marker would vary with the row's own
  section) — so it's kept as a genuine second elective, "MK629(A)",
  distinct from "MK629(B)". But if a code's trailing bracket _always_
  matches whichever section's row it's on, it's recognized as a redundant
  tag and stripped. This is a two-pass process (see `parseSchedule.ts`):
  first collect every observation sheet-wide, then resolve and parse.

- **Session times**: `lib/sheet/parseSessionTimeHeaders.ts` reads each
  batch's own "Session No. - PGDM YYYY-YY (...)→" header row and the
  "Time" row beneath it, building that batch's actual time grid straight
  from the sheet. If a batch has no header row of its own yet (e.g. a
  brand new batch added to the schedule before its header's been set up),
  `FALLBACK_SESSION_TIMES` in `constants.ts` is used purely as a safety
  net so the UI never shows broken times — it's clearly not treated as
  real data anywhere once that batch gets its own header row.

## Project structure

```
app/                  Routes: dashboard (/), events, notices, settings, API (/api/sheet)
components/           UI, grouped by layout / dashboard / events / settings / onboarding / shared / ui / providers
hooks/                useSheetData, useCountdown, useLiveClock, useSelectedBatch, useSelectedSection, ...
lib/sheet/            Google Sheet fetching + parsing (the core parsing logic, multi-batch aware)
lib/schedule/         Pure derivation functions (stats, countdown status, event buckets, available batches/subjects)
lib/utils/            Formatting helpers, calendar links, className merging
types/                Shared TypeScript types
public/               Manifest, icons, service worker
```

## Deploying to Vercel

1. Push this repository to GitHub (or GitLab/Bitbucket).
2. In Vercel, **Add New Project** → import the repository.
3. Vercel auto-detects Next.js — no build command changes needed.
4. Add the environment variables from `.env.example` under **Project Settings → Environment Variables**.
5. Deploy. The `/api/sheet` route revalidates every 5 minutes automatically (ISR-style caching).

## Notes

- The app polls `/api/sheet`, which itself fetches and caches the Google
  Sheet server-side — the sheet is never fetched directly from the browser.
- If the sheet's structure changes (new columns, renamed batches), the
  parsing logic in `lib/sheet/` is written to key off content (the
  repeating "Date & Day" marker row, the batch/section text) rather than
  fixed row/column numbers, so it should tolerate rows being added or removed.
