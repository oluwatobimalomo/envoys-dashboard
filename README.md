# The Envoys Retention

Mobile-first membership retention and follow-up application for RCCG The Envoys. It includes role-based workspaces for visitor follow-up, new converts, Soul Care, research feedback, testimonies, training, and administration.

## Stack

- React 19
- React Router for role-specific deep links and browser history
- Vite 7 for local development and production builds
- Ionic React for the mobile-first app shell and shared form controls, with existing Base UI and Tailwind components retained during the gradual migration
- Geist Variable typography and a shared Envoys forest-green and gold theme
- Vitest for the test runner
- Supabase REST and Storage APIs
- Recharts and Lucide for dashboards and interface icons
- Vercel rewrites for SPA routes and the `/api` serverless functions

## Development

```sh
npm install
npm start
```

Vite serves the app at `http://localhost:5173`. Create a production bundle with `npm run build`, or inspect it locally with `npm run preview`.

Run `npm test` to execute the Vitest suite. No automated test files have been added yet.

## Interface system

The mobile-first component and interaction baseline is Ionic React. Shared Envoys colors, spacing, control sizes, and radii are in `src/theme/variables.css`; component and adoption guidance is in [`docs/design-system.md`](docs/design-system.md). Existing screens remain in place while shared controls and navigation migrate incrementally.

## Configuration

The Supabase project URL and public anon key are currently configured in `src/lib/supabase.js`. The Anthropic key used by the insight endpoint must be set as `ANTHROPIC_API_KEY` in the Vercel project environment. Supabase row-level security and Storage policies must be configured in the Supabase project.

The Mercy Convention 2026 registration module uses a separate table. Apply `supabase/migrations/20261011000000_mercy_convention_2026.sql` in the Supabase SQL editor before enabling registration submissions. Apply later Mercy Convention migrations in timestamp order; `20261014090000_mercy_convention_registration_fields.sql` adds the split name, church/denomination, and country-of-residence fields while preserving existing registrations.

The independent outbound call campaign is available at `/calls`. Before enabling it in production, apply the outbound campaign migrations in timestamp order: `20261116090000_outbound_call_campaigns.sql`, `20261116093000_call_campaign_allocation_and_followup.sql`, `20261116103000_campaign_manager_key_recovery.sql`, `20261117110000_add_call_campaign_callers.sql`, `20261117120000_allocate_contacts_per_caller.sql`, and any later campaign migrations. An active admin creates a campaign with their existing app credentials, chooses a private manager key of at least 20 characters, and uploads caller and contact CSV files. `/calls` is the campaign manager dashboard; `/calls-dashboard` provides the pastorate team with a public, read-only view of campaign totals and call outcomes. `/calls/allocate` creates campaigns, adds callers to existing campaigns, and bulk-allocates contacts to callers. If a manager key is forgotten, an admin can verify their credentials from `/calls`, select a campaign, and reset its key without deleting records. New caller lists use each caller's normalized phone number for access; lists created before phone access was introduced can still be opened using their previously registered surname. Callers can tap a `tel:` link and log outcomes, feedback, and callback date/time. The manager key opens analytics and complete response export. These campaign records are stored separately from the app's first-timer and care-call data.

## Deployment

The root `vercel.json` routes API requests to Vercel functions and application paths to the SPA entry point. Vercel builds with `npm run build`, with `dist` as the output directory. These changes are local and have not been deployed.
