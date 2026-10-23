# CLAUDE.md — Midas App

Read this file at the start of every session. It holds the rules that never change. The detail lives in `docs/spec/`, and the build order lives in `docs/PHASES.md`.

## What this is

The Midas Media business app at **app.midasmedia.co.bw**. It runs four areas, each behind a sign-in:

| Route | Who | What it does |
| --- | --- | --- |
| `/admin` | CEO | Whole-business view: clients, sales pipeline, quotes and invoices, marketing, team and profitability, services, settings |
| `/accounts` | Account execs | Their assigned clients: content calendar, campaign brief, KPIs and monthly review, client profile |
| `/creative` | Designers, creative director | Brand kits, weekly design board, time tracking, shared resources and inspiration |
| `/portal` | Clients | Approvals, content progress, campaigns, reports, invoices, brand assets, account |

There are also public pages with no sign-in: `/login` (staff), `/portal/login` (clients, by client ID) and `/start/[token]` (the brand discovery questionnaire).

The owner is Dave Lottering, who runs Claude Code himself. Explain anything he must do outside the code (dashboards, DNS, secrets) as numbered steps in plain words.

## Stack

- **Next.js** (App Router, TypeScript, strict mode), server components by default, server actions for mutations
- **Tailwind CSS** and **shadcn/ui** components, styled with the Midas tokens below
- **Supabase**: Postgres, Auth, Storage, Row Level Security, `pg_cron` for scheduled jobs
- **Vercel** for hosting; **Resend** for email
- **Zod** for every input that crosses a trust boundary (forms, server actions, route handlers, CSV, webhooks)
- **Vitest** for unit tests; **Playwright** for end-to-end tests of sign-in and access rules
- **Anthropic API** (server-side only) for the design suggestions in `/creative`

Do not add another major library (state manager, ORM, UI kit, auth library) without asking Dave first.

## Folder structure

```
app/
  (public)/login, portal/login, start/[token]
  admin/        accounts/        creative/        portal/
  api/          (route handlers: cron, webhooks, file downloads)
components/     ui/ (shadcn), shared/, admin/, accounts/, creative/, portal/
lib/            supabase/ (server, browser, service-role clients), auth/, validation/, format/
supabase/
  migrations/   (one file per change, never edit an applied migration)
  seed.sql      (sample data, clearly fake)
  tests/        (SQL access-rule tests)
tests/          unit/  e2e/
docs/           spec/  prototypes/  PHASES.md  SETUP.md
```

## Rules that always apply

**Security**
1. Every table has Row Level Security switched on, with policies written in the same migration that creates the table. No table ships without policies and an access test.
2. Route guards in middleware and layouts are for convenience only. RLS is the real security. Never rely on hiding a link.
3. The Supabase service-role key is used only in server code under `lib/supabase/service.ts`, and only where the spec says so (client-ID sign-in lookup, cron jobs, invoice numbering). Never import it into a client component.
4. No secrets in code or commits. All keys go in `.env.local` and in Vercel's environment settings. Keep `.env.example` up to date with names only.
5. Nobody can sign themselves up. Staff are invited by the CEO; client logins are created by the CEO or the client's account exec.
6. Sign-in errors never reveal whether a client ID or email exists.

**Money and records**
7. Issued invoices, credit notes and payments are never deleted or edited. Corrections are credit notes. Botswana requires records to be kept for 8 years.
8. Quote and invoice lines copy the service name and price at the moment they are created, so later price changes never alter them.
9. Midas is **not VAT-registered**. Documents are titled "Invoice", with no VAT line. VAT is a setting (`settings.vat_registered`, off). When it's switched on, new documents add VAT at `settings.vat_rate` and are titled "Tax invoice"; old documents never change.
10. Currency is Botswana pula. Store amounts as `numeric(12,2)`; display as `P3,250.00`.

**Data and time**
11. Dates display in Africa/Gaborone time (UTC+2). Store timestamps as `timestamptz`.
12. Months are stored as the first day of the month (`date`, e.g. `2026-11-01`).
13. Every status lives in a Postgres enum or a check constraint, never free text.

**Code**
14. Keep components small. Put data access in server components or `lib/` functions, not in client components.
15. Every form validates with Zod on the server, even when the client also validates.
16. Write the SQL access test before marking any table done.
17. Run `npm run lint`, `npm run typecheck` and `npm test` before saying a task is finished, and report the results.

## Design

**Do not design from scratch.** The prototypes in `docs/prototypes/` are the approved design. Open the relevant prototype before building any page and reproduce it: the same layout, sections, order, components, wording, spacing, corner radii, status pills and colours. Lift values (colours, sizes, gaps, radii, shadows) straight from the prototype's CSS rather than choosing new ones. Use shadcn/ui only as the plumbing underneath, restyled to look like the prototype, never with its default look.

Where a page has no prototype (most of `/admin`), build it from the same pieces: navy masthead with the gold rule, left rail, white panels on the grey background, Archivo headings, status pills, stat tiles. When unsure how something should look, ask Dave instead of inventing a style.

The prototypes' data layer is throwaway: they keep data in the browser or in a Claude artifact store, so ignore how they save. Where a prototype and the spec disagree on behaviour, the spec wins; on looks, the prototype wins.

Tokens (define in Tailwind config and CSS variables, with a dark theme):

| Token | Light | Dark |
| --- | --- | --- |
| navy (brand, mastheads) | `#0E2A36` | `#081820` |
| navy-2 | `#18404F` | `#1C4253` |
| gold (accent) | `#B88A35` | `#D4A957` |
| gold-soft | `#F4ECDC` | `#2E2715` |
| bg | `#F2F4F5` | `#0B1A21` |
| surface | `#FFFFFF` | `#12252E` |
| ink | `#13252E` | `#E6EDF0` |
| muted | `#5A6A72` | `#94A6AE` |
| line | `#D8DFE2` | `#24404C` |
| good / warn / bad / info | `#2E7D4F` / `#A86A00` / `#B3261E` / `#1F5E8C` | `#5FBF86` / `#E0A643` / `#F08A82` / `#7DB6E0` |

Fonts: **Archivo** for headings (weights 700–900, slightly wide), **Figtree** for body text. Load both with `next/font/google`.

Copy: plain, short, active voice. Buttons say exactly what they do ("Approve", "Send to client"). Errors say what went wrong and how to fix it.

## Working style

- Work one phase at a time from `docs/PHASES.md`. Don't start the next phase until Dave says the current one passed review.
- At the start of a phase, read its spec files and list what you'll build. At the end, go through its acceptance criteria one by one and say which pass.
- If the spec is unclear or two files disagree, stop and ask. Don't guess on money, access rules or anything a client sees.
- Commit in small steps with clear messages.
