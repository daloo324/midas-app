# Midas App

The Midas Media business app at **app.midasmedia.co.bw**: `/admin` for the CEO, `/accounts` for account execs, `/creative` for designers, and `/portal` for clients, all behind sign-in.

This repo holds the build spec and the app. Claude Code builds the app from the spec, one phase at a time.

## Start here

1. `docs/SETUP.md`: tools, accounts and the domain (do this first, no coding).
2. `docs/PHASES.md`: the seven phases, the prompt to start each one, and the review checklist for each.
3. `CLAUDE.md`: the rules Claude Code follows in every session.

## The spec

| File | Covers |
| --- | --- |
| `docs/spec/00-overview.md` | The business, the client lifecycle, roles, glossary |
| `docs/spec/01-auth-and-roles.md` | Staff and client-ID sign-in, who can see what, status rules |
| `docs/spec/02-data-model.md` | Tables, enums, storage buckets |
| `docs/spec/03-accounts.md` | `/accounts`: the Account Desk |
| `docs/spec/04-creative.md` | `/creative`: the Design Studio |
| `docs/spec/05-portal.md` | `/portal`: the client portal |
| `docs/spec/06-admin.md` | `/admin`: the CEO dashboard |
| `docs/spec/07-integrations.md` | Email, Meta, Google Analytics, scheduled jobs |
| `docs/spec/08-deploy.md` | Environments, secrets, domain, security checklist |
| `docs/prototypes/` | Clickable prototypes showing the intended layout of each area |

## Running it

| Command | What it does |
| --- | --- |
| `npm run dev` | The real app, against Supabase (needs `.env.local` and `supabase start`) |
| `npm run lint`, `npm run typecheck`, `npm test` | Checks to run before calling anything finished |
| `npm run test:db`, `npm run test:e2e` | SQL access tests and end-to-end tests against local Supabase |

**Sample accounts:** locally, every seeded account uses the password `midas-local-2026` (staff at `/login`, client ID `MM-SCC-1001` at `/portal/login`). On the hosted project the password is `SEED_PASSWORD` in `.env.hosted.local`, which is never committed.
