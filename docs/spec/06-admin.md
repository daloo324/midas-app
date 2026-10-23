# 06 · /admin — the CEO dashboard

For the CEO only. A complete, summarised view of the business, plus the tools only the CEO uses: clients and team, sales, quotes and invoices, the service catalogue and settings. No prototype exists for this area. Use the same design system and patterns as the other prototypes: navy masthead, left rail, panels, status pills, numbers in Archivo.

## Pages

| Route | Contents |
| --- | --- |
| `/admin` | Overview |
| `/admin/clients`, `/admin/clients/[id]` | All clients; one client's full record |
| `/admin/sales` | Lead pipeline |
| `/admin/quotes`, `/admin/quotes/new`, `/admin/quotes/[number]` | Quotes |
| `/admin/invoices`, `/admin/invoices/[number]` | Invoices, payments, credit notes |
| `/admin/marketing` | Midas's own marketing |
| `/admin/team` | Staff, roles, workload, profitability |
| `/admin/services` | Service catalogue |
| `/admin/settings` | Company details, bank details, invoicing, VAT, capacity, integrations |

The CEO can also open `/accounts`, `/creative` and `/portal/preview/[clientId]` from the masthead.

## Overview

Summary first, detail on click. Every number links to the list behind it.

**Top row**
- Monthly recurring revenue: the sum of `monthly_fee` for active clients, with change on last month.
- Clients: active out of capacity (e.g. 7 / 10), plus onboarding and paused counts.
- Cash collected this month (payments) and money owed (issued invoice balances), with overdue amount and count in red.
- Pipeline value: the sum of `estimated_value` for open leads, plus the number of quotes waiting on a reply.

**Needs your attention**: a short list, worst first:
- overdue invoices,
- client approvals waiting more than 2 working days,
- months where the calendar isn't approved by day 25,
- clients whose main-goal KPI fell for two months running,
- clients whose effective rate is under the threshold in settings (default P250 an hour),
- leads whose next action date has passed,
- brand kits stuck in one status for more than 5 working days.

**Charts** (drawn to scale, from real data):
- Revenue by month: invoiced against collected, last 12 months.
- Client health: one row per active client showing this month's content progress, main-goal trend, effective rate and invoice status as coloured pills.

## Clients

- A table of all clients: name, status, account exec, service, monthly fee, start date, brand kit status, this month's progress, balance owed, effective rate. Filter by status and account exec.
- Client record: everything from the profile plus the CEO-only fields: status (with the capacity check when activating), account exec assignment, service and fee, end date, lead it came from, client logins, invoices, time and profitability since the start, status history.
- **New client** comes from a won lead (see Sales) or from scratch: name, contact, account exec, service. It starts in `onboarding`.

## Sales

- **Pipeline board:** columns New → Contacted → Quote sent → Won / Lost. Cards show company, contact, estimated value, owner, next action and its date (red when overdue). Drag between columns, or use a status menu on phones.
- **Lead form:** company, contact name, email, phone, source, estimated value, owner, next action and date, notes.
- **Lost** asks for a reason (price, timing, chose a competitor, no response, other).
- **Won** offers to create the client: it copies the details, sets the service and fee from the accepted quote, and opens the new client in `onboarding`.
- **Numbers above the board:** leads this month, conversion rate (won ÷ closed, last 90 days), average deal value, leads by source.

## Quotes

- New quote: pick a lead or client, then add lines from the service catalogue. Each line copies the name, description, unit and price, all editable on the quote. Add free-text lines too. Set quantity (for monthly services, the number of months), intro, terms and valid-until date.
- Totals: subtotal, VAT only when registered, total.
- **Send** issues the number `MM-Q-YYYY-NNNN`, generates the PDF, and emails it to the contact with the PDF attached. The lead moves to `quote_sent`.
- Mark accepted or declined. **Accepted → Create invoice** copies the lines into a draft invoice. For a retainer, it also offers to create the client.
- Expired quotes (past valid-until) are flagged automatically.

## Invoices

- List: number, client, period, issued, due, total, paid, balance, status. Filters: status, client, month. Totals at the top: owed, overdue, collected this month.
- **Monthly retainer run:** on the 1st, a cron job creates a draft invoice for each active client (one line: "{Service} · {Month YYYY}", their fee). The CEO reviews the drafts on one screen and issues them together.
- **Issue** assigns `MM-INV-YYYY-NNNN`, sets title, issue and due dates, generates and stores the PDF, makes it visible in the portal, and emails the client contact.
- **Record payment:** amount, date, method, reference. Part payments are allowed; status follows the balance.
- **Credit note:** for any issued invoice, with an amount and reason, numbered `MM-CN-YYYY-NNNN`, with its own PDF.
- **Reminders:** an automatic email 3 days before the due date and on the 1st and 7th day overdue. The CEO can switch reminders off per client.
- PDF layout follows the invoice view in `docs/prototypes/client-portal.html`, with company, bank and footer details from settings.

## Marketing

Midas's own channels. Rows in `kpi_months` and `metric_daily` with `client_id` null.

- Facebook and Instagram: followers, reach, interactions and engagement rate by month.
- Website (GA4): visitors, top pages, enquiry form submissions.
- Leads by source by month (from `leads`), and conversion by source.
- Until Phase 6 connects Meta and GA4, the CEO enters these monthly by hand on this page.

## Team

- Staff list: name, role, active, assigned clients (for account execs), hours logged this month (for designers). Invite, change role, deactivate.
- **Workload:** for each account exec, clients and items waiting on them; for each designer, items in progress and in revisions, and hours this month.
- **Profitability per client:** monthly fee, design hours, effective rate per hour, revision rounds per item. Sortable, so the least profitable clients surface.

## Services

The catalogue (CEO edits it freely):
- Name, description, unit (monthly, once-off, hourly, per item), price, active, sort order, retainer flag, and for retainers the inclusions list shown in the portal.
- Inactive services stay on old quotes and invoices but can't be added to new ones.
- Price changes affect new quotes only (CLAUDE.md rule 8).

## Settings

- Company: name, legal name, address, email, phone, logo.
- Bank details (shown on invoices).
- Invoicing: payment terms in days (default 7), invoice footer, reminder schedule on or off.
- **VAT:** registered (off), VAT number, rate (14). When switching it on, show what changes: new quotes and invoices add VAT and are titled "Tax invoice", while old documents stay as they are.
- Capacity: maximum active clients (10). Profitability threshold (P250 an hour).
- Integrations: Meta and GA4 connection status per client and for Midas, with last sync time and errors (Phase 6).

## Acceptance criteria

- [ ] No role other than the CEO can open any `/admin` page or read leads, quotes, services or settings through the API.
- [ ] Overview numbers match the underlying lists exactly (test with seed data).
- [ ] Document numbers are sequential per type per year with no gaps, even when two documents are issued at the same moment.
- [ ] Issued invoices can't be edited or deleted, by the UI or directly in the database; corrections go through credit notes.
- [ ] The retainer run creates one draft per active client and never duplicates a month.
- [ ] Changing a service price doesn't change any existing quote or invoice.
- [ ] With VAT off, no document shows VAT; with VAT on, only documents created afterwards do.
- [ ] A won lead becomes an onboarding client with its details copied across.
