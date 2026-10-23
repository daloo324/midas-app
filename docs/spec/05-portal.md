# 05 · /portal — the client portal

For client users, signed in by client ID. Prototype: `docs/prototypes/client-portal.html`. Its layout, tabs and wording are the target; its sample data, simulated approvals and toast-only downloads are not.

A client user only ever sees their own client's data (enforced by RLS), and only work that has reached `client_review` or later. Drafts, internal comments, time, costs and other clients never appear.

## Pages

| Route | Contents |
| --- | --- |
| `/portal` | Overview |
| `/portal/approvals` | Everything waiting for the client |
| `/portal/content?month=YYYY-MM` | Month's content by week |
| `/portal/campaigns` | Campaigns |
| `/portal/reports?month=YYYY-MM` | Reports and insights |
| `/portal/invoices`, `/portal/invoices/[number]` | Invoices |
| `/portal/assets` | Brand assets |
| `/portal/account` | Plan, account exec, documents, sign-in |
| `/portal/preview/[clientId]` | CEO only: the same pages read-only, with a banner "Viewing as {client}" |

Left rail on desktop, a scrolling tab strip on phones. A badge on Approvals shows the waiting count.

## Overview

- Greeting with the contact's first name ("Dumela, Kagiso") and today's date.
- An approvals banner: the number waiting and the nearest deadline, with "Review now". When nothing is waiting: "You're all caught up."
- This month's content: published out of total, with a status bar.
- Next post: date, format, topic, status.
- Balance due, with a link to the invoice.
- Last published review at a glance: accounts reached, new followers, chats started, each with change on the month before, and the "what worked" line.
- Journey steps: Onboarding → Brand kit → Monthly content → Review and renew, with the current step marked.

## Approvals

One list of everything in `client_review` (content items, the brand kit) or `sent` (the month's calendar, the campaign brief), oldest deadline first.

- **Content item:** the preview image, slot and topic, format, pillar, go-live date, caption, hashtags. Buttons: **Approve** and **Request changes**.
- **Calendar:** the month's 26 slots as a table (date, format, pillar, topic). Approve or request changes.
- **Campaign brief:** goal, offer, dates, audience, ad budget (clearly marked "you pay this to Meta"), the ads that will be made. Approve or request changes.
- **Brand kit:** the logo and icon previews, palette, fonts and guide. Approving records the client user's name as `signed_off_by`.

**Request changes** requires a note ("What should change?"). It sets `changes_requested`, adds a client-visible comment, increments `revision_rounds`, and notifies the account exec and the item's designer. When an item reaches its second round, the account exec sees "Second round requested: extra revisions may be billable."

After an action: "Approved. Midas has been notified." or "Sent. Midas replies within 48 hours." There's no undo once the team has started acting on it; until then, "Undo" is available for 10 minutes.

## Content

The month's items at `client_review` or later, grouped by week, as cards with a preview, topic, date, format and status. Filters: format, status. Opening a card shows the preview, caption, platforms, status history, and the client-visible comments. Earlier months are reachable from a month picker.

## Campaigns

- The current month's campaign: status, goal, offer, dates, audience, ad budget (paid to Meta), and the ads with their status.
- Past campaigns: results (spend, results, cost per result) and the results summary.

## Reports and insights

Shown only for months whose review is published.

- A line chart of accounts reached over the client's months, with the pre-Midas baseline as the first point. Axis labels in pula and thousands where relevant; drawn to scale.
- The review: what worked, what we're changing, top piece (with its preview), next month's focus.
- Four category panels (Visibility, Credibility, Engagement, Results) with values and change on the previous month. Results carries a note that it depends partly on the client's offer, ad budget and reply speed. Cost per result counts a fall as an improvement.
- The client's main goal panel is listed first.

## Invoices

- Totals: balance due (with due date), paid this year, monthly fee.
- Table: number, period, issued, due, amount, status (Paid on date, Due, Overdue, Part paid, Credited).
- Invoice view: as the prototype, using the `settings` company details and bank details, with the payment reference set to the invoice number. **Download PDF** serves the stored PDF through a signed URL.
- A line under the totals: "Ad budgets are paid by you directly to Meta and never appear on Midas invoices."
- No VAT line while `settings.vat_registered` is false.

## Brand assets

Visible only once the brand kit is `approved`. Before that: "Your brand kit is being designed. It will appear here when you sign it off."

- Logo and icon: each colour version with SVG, PNG and PDF download buttons.
- Colours with HEX, RGB and CMYK.
- Fonts with weights, each downloadable.
- The brand guide PDF with page thumbnails.
- Patterns and extras.
- **Download full kit (.zip):** the same zip as `/creative`.
- A line: "Moved here from the Midas Design Studio when you signed it off on {date}."

## Account

- Plan: service name, monthly fee, start date, and the inclusions from `services.inclusions`.
- Account exec: name, role, email and phone shown as selectable text, office hours.
- Documents: the service agreement, brand brief and brand guide, downloadable.
- Sign-in: login ID, change password, and "Need a login for someone else on your team? Ask your account exec."

## Acceptance criteria

- [ ] A client user cannot reach any other client's data by changing an ID in a URL or an API call (Playwright test with two clients).
- [ ] Items in `planned`, `in_design` or `internal_review` never appear, including in counts.
- [ ] Approve and Request changes update the item for the account exec and the designer within seconds, with a `status_events` row naming the client user.
- [ ] Brand assets stay hidden until the kit is approved, and appear automatically after.
- [ ] Draft invoices never appear; issued invoices show the right balance after a payment is recorded.
- [ ] The CEO's preview shows exactly the client's view and allows no actions.
- [ ] Every page works on a 375 px-wide phone screen.
