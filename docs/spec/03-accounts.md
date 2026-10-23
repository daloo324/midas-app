# 03 · /accounts — the Account Desk

For account execs (their assigned clients) and the CEO (all clients). Prototype: `docs/prototypes/account-desk.html`.

## Pages

| Route | Contents |
| --- | --- |
| `/accounts` | Client cards for this month |
| `/accounts/clients/[id]` | Month plan (default tab) |
| `/accounts/clients/[id]/calendar?month=YYYY-MM` | Content calendar |
| `/accounts/clients/[id]/campaign?month=YYYY-MM` | Campaign brief |
| `/accounts/clients/[id]/kpis?month=YYYY-MM` | KPIs and monthly review |
| `/accounts/clients/[id]/profile` | Client profile |
| `/accounts/clients/[id]/onboarding` | Onboarding status, questionnaire link, client logins |

## Home: client cards

One card per assigned client: name, industry, status, a bar showing this month's items by status, published / total, items waiting on the client, month checklist progress, campaign status, next item due. Cards needing action sort first: anything waiting on the account exec, then overdue client approvals.

Clients in `onboarding` show onboarding progress instead (questionnaire received, brand kit status, logins created).

## Onboarding page

1. **Questionnaire link:** "Create questionnaire link" makes a `questionnaire_invites` token and shows `https://app.midasmedia.co.bw/start/{token}` with a copy button. It shows whether the link was opened and when answers arrived. One active link per client; making a new one expires the old.
2. **Brief:** once answers arrive, the brief shows here, read-only, grouped by section, with uploaded images.
3. **Brand kit progress:** the kit's status and items ready, out of 25 (read-only; the work happens in `/creative`).
4. **Client logins:** add a login (name, email), see existing ones, deactivate, resend the welcome email. See `01-auth-and-roles.md`.
5. **Activate:** once the brand kit is `approved`, the account exec can move the client to `active`, which unlocks month planning. This is blocked if the active-client capacity is full, with a message naming the limit.

## Month plan

The month checklist, eight steps, each with its due rule:

| Key | Step | Due |
| --- | --- | --- |
| `review_sent` | Last month's review published, next month's focus agreed | Day 3 |
| `calendar_drafted` | Calendar drafted (all 26 slots have a topic) | Day 20 of the month before |
| `calendar_approved` | Client approved the calendar | Day 25 of the month before |
| `brief_approved` | Client approved the campaign brief | Day 25 of the month before |
| `weeks_1_2` | Weeks 1–2 content approved and scheduled | Before day 1 |
| `weeks_3_4` | Weeks 3–4 content approved and scheduled | Day 14 |
| `campaign_live` | Campaign live | Campaign start date |
| `report_sent` | Monthly review published to the client | Day 3 of next month |

Steps that the app can see tick themselves: `calendar_drafted`, `calendar_approved`, `brief_approved`, `campaign_live` and `report_sent` follow the records' statuses. The rest are ticked by hand. Overdue steps show in amber.

Beside the checklist: this month's status bar, items waiting on the client (with how long they've waited), the client's main goal, and the four expectation categories with "Covered" or "Partly" (Results is "Partly": it depends on the client's offer, ad budget and reply speed).

## Calendar

- **Start month** creates the `content_months` row and 26 `content_items`: 20 posts on weekdays spread evenly, 4 stories spread across the month, 2 reels in weeks 2 and 4. Pillars are assigned from the client's `pillar_mix`, interleaved so no pillar repeats more than twice in a row. Stories default to Engage, Showcase, Behind the scenes, Engage; reels to Educate, Behind the scenes.
- An editable table, grouped by format: slot, date, pillar, topic, platform, status, plus a notes field per row. Status is read-only here except the account exec's own moves (`approved → scheduled → published`, and approving on the client's behalf with a note).
- Panel: post pillar mix (planned against the client's target), status counts.
- **Send to client for approval** sets `plan_status = sent` and creates the portal approval. When the client approves, `plan_status = approved` and the items become visible on the designers' board. Until then designers see the month greyed out with "Waiting for client approval".
- Calendar rules shown as hints: no more than 2 Showcase posts in a row; keep 2 posts flexible for mid-month news.

## Campaign brief

Five parts, matching the prototype and the data model:

1. **Objective and offer:** goal, main KPI, offer, start and end dates, ad budget (labelled "paid by the client to Meta"), who runs the ads.
2. **Audience:** location and radius, age range, interests, retargeting.
3. **Message and copy:** hook, headline A, headline B, main text, call to action, test angle.
4. **Creative:** visual direction, plus the status of `A01–A03` (read from the content items).
5. **Launch and reporting:** where people land, how results are tracked, who replies on the client's side and how fast, results summary.

Status flow: `draft → sent` (account exec sends to the portal) `→ approved` (client) `→ live` (account exec on the start date) `→ complete` (account exec enters results). Before marking `live`, a confirmation lists: the offer is real and in stock, someone answers messages within the agreed time, the landing link works.

## KPIs and review

- Four category panels (Visibility, Credibility, Engagement, Results), each with its question and its metrics from `kpi_months`. Every metric shows its source (manual, Meta or GA4) and the change against last month, or against the baseline in month 1.
- Calculated metrics come from `kpi_months_calc` and can't be edited.
- The client's main goal is highlighted.
- Monthly review: what worked, what to adjust, top piece (a picker of the month's published items), next month's focus.
- **Publish review** locks the month's KPIs, makes the review visible in the portal, notifies the client, and ticks `report_sent`. Unpublishing is CEO only.

## Client profile

Editable by the account exec: contact details, decision maker, platforms (2 on Brand Launch, shown as a hint), pillar mix (5 numbers that must total 20), main goal, expectation notes, baseline figures. Read-only: status, service, monthly fee, start date, assigned account exec (the CEO changes these in `/admin`).

## Notifications for the account exec

- The client approved or requested changes on anything.
- The creative director moved an item to `client_review` (so the AE can nudge the client).
- An item has waited in `client_review` for more than 2 working days.
- Questionnaire answers arrived.

## Acceptance criteria

- [ ] An account exec sees only assigned clients everywhere, including search and direct URLs.
- [ ] Starting a month creates exactly 26 items with valid dates in that month and a post pillar mix equal to the client's target.
- [ ] A calendar sent to the client appears in their portal; their approval updates the plan status and the checklist live.
- [ ] Designers can't see a month's items as workable until the plan is approved.
- [ ] A campaign creates `A01–A03`, and its status flow matches the table above.
- [ ] Publishing a review locks the KPIs and shows the review in the portal.
- [ ] Activating an 11th client is blocked with a clear message.
- [ ] The questionnaire link works once per client, expires after 30 days, and the answers appear on the client record.
