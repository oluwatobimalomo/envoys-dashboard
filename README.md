# The Envoys Retention

Mobile-first membership retention and follow-up application for RCCG The Envoys. It includes role-based workspaces for visitor follow-up, new converts, Soul Care, research feedback, testimonies, training, and administration.

## Stack

- React 19
- React Router for role-specific deep links and browser history
- Vite 7 for local development and production builds
- shadcn/ui Base UI components with Tailwind CSS 4
- Geist Variable typography and an Envoys forest-green and gold theme
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

## Configuration

The Supabase project URL and public anon key are currently configured in `src/lib/supabase.js`. The Anthropic key used by the insight endpoint must be set as `ANTHROPIC_API_KEY` in the Vercel project environment. Supabase row-level security and Storage policies must be configured in the Supabase project.

The Mercy Convention 2026 registration module uses a separate table. Apply `supabase/migrations/20261011000000_mercy_convention_2026.sql` in the Supabase SQL editor before enabling registration submissions.

## Deployment

The root `vercel.json` routes API requests to Vercel functions and application paths to the SPA entry point. Vercel builds with `npm run build`, with `dist` as the output directory. These changes are local and have not been deployed.
