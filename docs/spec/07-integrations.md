# 07 · Integrations

Built in Phase 6. Until then every metric is entered by hand, and the app must work fully without these connections.

## Email: Resend

- Sends from `noreply@midasmedia.co.bw`, display name "Midas Media", reply-to the account exec (client emails) or the CEO (invoices).
- Used for: staff invites, client welcome emails with login ID, password resets, approvals waiting, changes requested, review published, quote sent, invoice issued, payment reminders.
- Supabase Auth emails (invite, reset) go through Resend via custom SMTP, so they come from the same address.
- Templates in `emails/` using React Email, with the Midas header and plain wording. Every email has a single clear button.
- Needs DNS records at Hostinger for domain verification (SPF, DKIM), set up in `08-deploy.md`.

## Meta (Facebook Pages and Instagram)

**Approach:** one Midas connection reads every client's insights. In Phase 1, clients add Midas as a partner in Meta Business Suite, so Midas's Business Manager already has access to their Pages and Instagram accounts. A **system user** in Midas's Business Manager gets a long-lived token with read access to those assets. No client ever logs in to Meta through this app.

**Before any code works, Dave must:**
1. Put the website live on midasmedia.co.bw.
2. Verify the domain in Meta Business Manager.
3. Complete business verification (company registration details must match).
4. Create a Meta developer app (type: Business), connect it to the Business Manager, and request advanced access to the insights permissions the app needs (read Page engagement and insights, Instagram basic data and insights, and ads read for campaign results). Meta reviews this; allow several weeks.
5. Create the system user, assign it the client assets, generate its token and store it as `META_SYSTEM_USER_TOKEN`.

**Build:**
- `integration_connections` holds each client's Page ID and Instagram account ID. In `/admin/settings`, list the Pages and Instagram accounts the token can see, and let the CEO link each one to a client.
- A nightly job (02:00 Gaborone time) pulls the previous day's figures per connected account into `metric_daily`: reach, views or impressions, followers, profile visits, interactions, comments, shares, saves, reel plays and link clicks. Use the Graph API version in `META_GRAPH_VERSION`, so upgrading is a config change.
- It also pulls campaign results from the Marketing API for clients where Midas runs the ads (spend, results, cost per result) into the campaign's `results_metrics`.
- Monthly rollup: on the 1st, and again whenever data arrives late, fill `kpi_months.metrics` for keys whose source isn't `manual`. A manual value always wins and is never overwritten.
- Meta changes metric names over time. Keep the mapping from Meta's metric names to our keys in one file, `lib/integrations/meta/metrics.ts`, with a test.
- Errors: store `last_error`, set status `error`, show it in `/admin/settings` and on the account exec's KPI page ("Meta data missing since {date}, enter by hand or ask the CEO to reconnect"). Retry with backoff; never block the rest of the sync.

## Google Analytics 4

**Approach:** a Google Cloud **service account** with the Analytics Data API enabled. Each client (and Midas's own website) adds the service account's email as a **Viewer** on their GA4 property.

**Dave must:**
1. Create a Google Cloud project, enable the Google Analytics Data API, create a service account and download its JSON key.
2. Store the key's contents as `GA4_SERVICE_ACCOUNT_JSON` (Vercel environment variable; never committed).
3. For each property, add the service account email as Viewer, then link the property ID to the client in `/admin/settings`.

**Build:**
- The nightly job pulls the previous day per property into `metric_daily`: sessions, users, new users, key events (e.g. enquiry form submissions), and top pages by views.
- Monthly rollup feeds website figures to the KPI pages and the `/admin/marketing` tab.

## Scheduled jobs

Use Vercel Cron calling protected route handlers (`/api/cron/*`), authenticated with a `CRON_SECRET` header. Each job is safe to re-run.

| Job | When (Gaborone time) | Does |
| --- | --- | --- |
| `sync-meta` | Daily 02:00 | Meta insights and ad results → `metric_daily`, campaigns |
| `sync-ga4` | Daily 02:30 | GA4 → `metric_daily` |
| `rollup-kpis` | Daily 03:00 | `metric_daily` → `kpi_months` (non-manual keys only) |
| `retainer-invoices` | 1st of month, 06:00 | Draft retainer invoices for active clients |
| `invoice-reminders` | Daily 08:00 | Due-soon and overdue reminder emails |
| `approval-nudges` | Weekdays 09:00 | Notify AEs of client approvals waiting more than 2 working days |
| `cleanup` | Sunday 04:00 | Delete login attempts older than 30 days, expire old questionnaire links |

Vercel Cron schedules are in UTC, so 02:00 Gaborone is `0 0 * * *`.

## Acceptance criteria

- [ ] Every job can run twice for the same day without duplicating rows.
- [ ] A manual KPI value is never overwritten by a sync.
- [ ] Turning off Meta (bad token) shows a clear error in settings and on the KPI page, while GA4 and the rest of the app carry on.
- [ ] No token or key appears in client-side code, logs or the repo.
- [ ] Emails arrive from noreply@midasmedia.co.bw and pass SPF and DKIM.
