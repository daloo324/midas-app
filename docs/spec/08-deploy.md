# 08 · Environments and deployment

## Environments

| Environment | App | Database | Used for |
| --- | --- | --- | --- |
| Local | `npm run dev` on Dave's laptop | Supabase running locally (`supabase start`, needs Docker) | Building and testing every phase |
| Preview | Vercel preview link per branch | Supabase project **midas-app-staging** | Dave's review at the end of each phase |
| Production | `app.midasmedia.co.bw` | Supabase project **midas-app-prod** | Real staff and clients, from the first go-live |

Database changes only ever go through migration files in `supabase/migrations/`, applied with the Supabase CLI: local first, then staging, then production. Never change the production database by hand in the dashboard.

## Environment variables

Keep names (no values) in `.env.example`.

| Name | Where it's used | Secret |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser and server | No |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser and server | No (RLS protects data) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | **Yes** |
| `NEXT_PUBLIC_APP_URL` | Links in emails | No |
| `RESEND_API_KEY` | Server | **Yes** |
| `EMAIL_FROM` | Server (`Midas Media <noreply@midasmedia.co.bw>`) | No |
| `ANTHROPIC_API_KEY` | Server | **Yes** |
| `ANTHROPIC_MODEL` | Server (default `claude-sonnet-5-5`) | No |
| `CRON_SECRET` | Cron route handlers | **Yes** |
| `META_SYSTEM_USER_TOKEN` | Server (Phase 6) | **Yes** |
| `META_GRAPH_VERSION` | Server (Phase 6) | No |
| `GA4_SERVICE_ACCOUNT_JSON` | Server (Phase 6) | **Yes** |

## Domain and DNS

The domain midasmedia.co.bw is registered at Hostinger. DNS stays there; only add records, never remove existing ones (especially `MX` and email-related `TXT` records if Midas email runs on the domain).

| Record | Name | Value | For |
| --- | --- | --- | --- |
| CNAME | `app` | The value Vercel shows when you add the domain | The app |
| TXT / CNAME | As Resend shows | As Resend shows | Email sending (SPF, DKIM) |
| Records for the website | `@` and `www` | As the website's host shows | The public site (separate repo `midasmedia2026`) |

Steps are in `docs/SETUP.md`.

## Security checklist before the first real client

- [ ] Public sign-up off in Supabase Auth; email confirmation on; minimum password length 10.
- [ ] Every table has RLS and passing access tests (`npm run test:db`).
- [ ] Storage buckets are private; downloads use signed URLs only.
- [ ] Service-role key only in server code; a search of the client bundle finds no secret values.
- [ ] Production database backups are on (Supabase daily backups; consider point-in-time recovery once clients are live).
- [ ] Error monitoring on (Vercel logs at minimum; Sentry optional, ask first).
- [ ] The CEO account uses a strong password, and two-factor authentication is on for Supabase, Vercel, GitHub and Resend.

## Acceptance criteria

- [ ] Pushing to `main` deploys production; pushing a branch creates a preview.
- [ ] `https://app.midasmedia.co.bw` loads over HTTPS, and `/` redirects to the right sign-in page.
- [ ] Migrations apply cleanly to an empty database from scratch (`supabase db reset`).
