# Build phases

Seven phases. Each one ends with Dave reviewing on a preview link; the next starts only after he approves.

**How each phase runs**
1. Dave opens Claude Code in the `midas-app` folder and pastes the phase's **start prompt**.
2. Claude Code reads the listed spec files, lists what it will build, and asks anything unclear.
3. It works on a branch named after the phase, committing in small steps.
4. At the end it runs lint, type checks and tests, goes through the acceptance criteria one by one, opens a pull request and posts the preview link.
5. Dave works through the **review checklist** on the preview link.
6. Dave either lists fixes, or says "Phase N approved, merge it". Claude Code merges to `main`, which deploys production.

| Phase | Builds | Spec files |
| --- | --- | --- |
| 0 | Accounts and tools (Dave, no code) | `SETUP.md` |
| 1 | Foundation: project, design system, sign-in, roles, area shells, clients and team basics | 00, 01, 02, 08 |
| 2 | `/accounts` and the public questionnaire | 03 |
| 3 | `/creative` | 04 |
| 4 | `/portal` | 05 |
| 5 | `/admin`: sales, quotes, invoices, marketing, team, services, settings, emails | 06, 07 (email and cron parts) |
| 6 | Meta and GA4 integrations | 07 |

---

## Phase 1 · Foundation

**Start prompt**
> Read CLAUDE.md, docs/spec/00-overview.md, 01-auth-and-roles.md, 02-data-model.md and 08-deploy.md. We're doing Phase 1 from docs/PHASES.md. List what you'll build and ask me anything unclear before starting. Work on a branch called phase-1-foundation.

**Builds**
- Next.js project with TypeScript strict, Tailwind with the Midas tokens (light and dark), shadcn/ui, Archivo and Figtree fonts, lint, format, Vitest, Playwright.
- Supabase local setup and migrations for: enums, `profiles`, `client_users`, `login_attempts`, `clients`, `services` (seeded with Brand Launch), `settings` (one row), `status_events`, `comments`, `notifications`, `document_counters`, and the helper functions `auth_role()`, `is_staff()`, `is_ceo()`, `can_access_client()`.
- Staff sign-in, password reset, invite flow; client sign-in by login ID with rate limiting and generic errors; client password reset by login ID.
- Middleware and layout guards for the four areas; the "no access" page; `/` redirecting by role.
- Area shells: masthead, left rail with the planned menu items (empty pages say "Coming in Phase N"), user menu with sign-out.
- `/admin/team`: invite staff, change role, deactivate.
- `/admin/clients`: create a client, assign an account exec, set status, create a client login (welcome email via Resend).
- Seed data: one CEO, two account execs, a creative director, a designer, three clearly fake clients split between the two account execs, one client login.
- SQL access tests and Playwright tests for every sign-in rule.
- Vercel project linked, staging preview working, production on `app.midasmedia.co.bw`.

**Review checklist (Dave)**
- [ ] Sign in as each seeded role and land in the right area; try to open another area and get refused.
- [ ] Sign in to the portal with the seeded client ID. A wrong password and a wrong ID show the same message.
- [ ] Invite yourself a test staff account from `/admin/team` and receive the email.
- [ ] Create a client and a client login; the welcome email shows the login ID.
- [ ] As an account exec, confirm you can't see the other account exec's client anywhere.
- [ ] Check the look on your phone and in dark mode.
- [ ] Open https://app.midasmedia.co.bw.

---

## Phase 2 · /accounts and the questionnaire

**Start prompt**
> Phase 1 is approved and merged. Read CLAUDE.md and docs/spec/03-accounts.md, and look at docs/prototypes/account-desk.html and docs/prototypes/brand-questionnaire.html. We're doing Phase 2 from docs/PHASES.md. List what you'll build and ask anything unclear. Branch: phase-2-accounts.

**Builds**
- Tables: `brand_briefs`, `questionnaire_invites`, `brand_kits` (status only for now), `content_months`, `content_items`, `campaigns`, `kpi_months` and the `kpi_months_calc` view, with policies and tests. The `set_content_status` function.
- `/start/[token]`: the questionnaire from the prototype, saving answers and uploads straight to the client's brief. Expired or used links show a friendly message.
- Every `/accounts` page in `03-accounts.md`: home cards, onboarding, month plan, calendar, campaign brief, KPIs and review, client profile.
- Notifications for account execs (in-app; emails come in Phase 5).

**Review checklist (Dave)**
- [ ] Send yourself a questionnaire link, fill it in on your phone with images, and see the brief arrive.
- [ ] Start a month: 26 items, sensible dates, pillar mix matching the target.
- [ ] Fill a campaign brief and see A01–A03 appear in the calendar.
- [ ] Enter KPIs, write a review, publish it, and confirm it locks.
- [ ] Try activating more clients than the capacity allows.

---

## Phase 3 · /creative

**Start prompt**
> Phase 2 is approved and merged. Read CLAUDE.md and docs/spec/04-creative.md, and look at docs/prototypes/design-studio.html. We're doing Phase 3 from docs/PHASES.md. List what you'll build and ask anything unclear. Branch: phase-3-creative.

**Builds**
- Tables: `brand_kit_files`, `time_entries`, `inspiration`; storage buckets `brand-kits`, `briefs`, `content`, `inspiration`, with storage policies and tests.
- Every `/creative` page in `04-creative.md`: client cards, brief and designer notes, brand kit with all slots, zip download, weekly board, creative director's review queue, Claude suggestions, timers and the timer bar, time reports, fonts, palette builder, inspiration board.

**Review checklist (Dave)**
- [ ] Build a test brand kit: upload a logo in each slot, set colours and fonts, upload a guide, and download the zip.
- [ ] Confirm the weekly board stays locked until the kit is approved.
- [ ] Run "Suggest visuals & copy" for a week and check it only fills empty fields.
- [ ] Start a timer, open a second tab, start another, and confirm the first one stopped.
- [ ] As a designer, try to send an item to the client (it should be refused); as creative director, do it.

---

## Phase 4 · /portal

**Start prompt**
> Phase 3 is approved and merged. Read CLAUDE.md and docs/spec/05-portal.md, and look at docs/prototypes/client-portal.html. We're doing Phase 4 from docs/PHASES.md. List what you'll build and ask anything unclear. Branch: phase-4-portal.

**Builds**
- Every `/portal` page in `05-portal.md`, wired to real data: overview, approvals (content, calendar, campaign brief, brand kit), content, campaigns, reports, invoices (read-only views; invoices themselves are built in Phase 5), brand assets, account, and the CEO's preview mode.
- Playwright tests with two client logins proving neither can reach the other's data.

**Review checklist (Dave)**
- [ ] As a client, approve one post and request changes on another; see both land in `/accounts` and `/creative`.
- [ ] Approve a brand kit as the client and watch the assets appear.
- [ ] Check every portal page on your phone.
- [ ] As CEO, preview a client's portal.

---

## Phase 5 · /admin

**Start prompt**
> Phase 4 is approved and merged. Read CLAUDE.md, docs/spec/06-admin.md and the email and scheduled-jobs parts of docs/spec/07-integrations.md. We're doing Phase 5 from docs/PHASES.md. List what you'll build and ask anything unclear. Branch: phase-5-admin.

**Builds**
- Tables: `leads`, `quotes`, `quote_lines`, `invoices`, `invoice_lines`, `payments`, `credit_notes`, with the numbering function, lock triggers, policies and tests.
- Every `/admin` page in `06-admin.md`: overview, clients, sales pipeline, quotes with PDF and email, invoices with the monthly retainer run, payments, credit notes and reminders, marketing (manual entry), team and profitability, services, settings (including the VAT switch, left off).
- Resend email templates for every email in `07-integrations.md`.
- Vercel Cron jobs: `retainer-invoices`, `invoice-reminders`, `approval-nudges`, `cleanup`.

**Review checklist (Dave)**
- [ ] Add your real services and prices to the catalogue.
- [ ] Take a lead from New to Won through a quote, and see the client created.
- [ ] Issue an invoice, record a part payment and then the rest; check the client's portal at each step.
- [ ] Try to edit an issued invoice (it should be refused) and issue a credit note instead.
- [ ] Check the overview's numbers against the lists.
- [ ] Put in Midas's real company and bank details in settings.

---

## Phase 6 · Meta and Google Analytics

Start only once Meta has approved the developer app (see `07-integrations.md`). GA4 can go first if Meta is still waiting; say so in the prompt.

**Start prompt**
> Phase 5 is approved and merged. Read CLAUDE.md and docs/spec/07-integrations.md. We're doing Phase 6 from docs/PHASES.md. The Meta token and GA4 service account are set in Vercel. List what you'll build and ask anything unclear. Branch: phase-6-integrations.

**Builds**
- `metric_daily`, `integration_connections`; the linking screens in `/admin/settings`; the jobs `sync-meta`, `sync-ga4` and `rollup-kpis`; source labels on every KPI; error states.

**Review checklist (Dave)**
- [ ] Link Midas's own Page, Instagram and website, and see yesterday's numbers the next morning.
- [ ] Link one client and compare a week of figures with Meta Business Suite.
- [ ] Type a manual KPI value and confirm the next sync doesn't overwrite it.

---

## After go-live

Possible next steps, not part of this build: the Brand Partner tier, online card or mobile-money payments on invoices, posting directly to Meta from approved content, and a client mobile app.
