# The Envoys — Membership Retention

The retention workspace for RCCG The Envoys: first-timers, VIP follow-up calls, new converts, Soul Care, testimonies, research feedback, Night of Mercy and stewards appraisal.

**Stack:** Next.js 16 (App Router, TypeScript) · Tailwind CSS v4 · shadcn/ui (Radix) · Recharts · Supabase (existing project and tables, unchanged).

## Getting started

```bash
cp .env.example .env.local   # fill in the values
npm install
npm run dev                  # http://localhost:3000
```

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The existing Supabase project. If unset, the app falls back to the project the legacy app used. |
| `AUTH_SECRET` | Signs the session cookie. **Set this in Vercel** (`openssl rand -base64 32`). |
| `ANTHROPIC_API_KEY` | Used by `/api/generate-insight` (optional `ANTHROPIC_MODEL`). |

Scripts: `npm run build`, `npm run lint`, `npm run typecheck`.

## How it is organised

```
app/
  (app)/[section]/   every signed-in page, e.g. /members-care, /call-queue
  login/             sign-in + request access
  register, feedback, testimony, new-convert, nom-register, appraisal   public QR forms
  present/[slug]     testimony projector links (old /?present=slug links redirect here)
  api/auth/*         login / logout / refresh (signed httpOnly cookie)
components/
  ui/                shadcn/ui primitives (branded)
  app/               shell (sidebar, top bar), kit, charts, widgets, public layout
modules/             one file per area; each exports the screens listed in modules/registry.tsx
lib/                 supabase REST helper, session, nav/roles, formatting helpers
proxy.ts             route protection (Next 16 "proxy", formerly middleware)
```

- **Roles and navigation** live in `lib/nav.ts` (same roles, menus and groups as before).
- **Data access** uses the same PostgREST queries as the legacy app via `sb()` in `lib/supabase.ts`, so no database changes are needed.
- **Sign-in** is checked on the server against `app_users` (same salted SHA-256 hashes; legacy plain-text passwords are upgraded on first sign-in), then stored in a signed, httpOnly cookie for 12 hours.
- **Design tokens** (light and dark) are in `app/globals.css` and mirror the Envoys design system artifact. Brand colours: forest green `#1A7A3C`, deep green `#1B3A2D`, gold `#D4922A`. Type: Cabinet Grotesk + Satoshi (Fontshare).

## Agent skills

`.claude/skills/` vendors the `jakubkrehel/skills` (better-ui, better-typography, better-accessibility, …) and `shadcn` skills so Claude Code sessions in this repo can use them.
