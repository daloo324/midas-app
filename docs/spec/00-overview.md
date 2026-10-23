# 00 · Overview

## The business

Midas Media Solutions is a creative agency in Gaborone, Botswana. This app runs its social media retainer business, starting with the **Brand Launch** retainer (P3,250 a month), and is built to take more services over time.

A Brand Launch client gets, every month: 20 static posts, 4 stories, 2 reels with custom covers, 2 platforms managed, a content calendar planned a month ahead, a monthly analytics review, 1 campaign ad set, and 48-hour turnaround on requests. They start with a starter brand kit.

## The client lifecycle

The app follows the client through three phases. Each phase has its own area of the app.

```
Lead ──► Quote ──► Won ──► Phase 1: Onboarding ──► Phase 2: Monthly content ──► Phase 3: Design
(/admin)  (/admin)          questionnaire, brand kit    calendar, campaign,          weekly board,
                            (/accounts, /creative)      KPIs (/accounts)             time (/creative)
                                         │                       │                        │
                                         └──────── all visible to the client in /portal ──┘
```

1. **Lead and quote** (`/admin`): the CEO tracks the lead, sends a quote from the service catalogue, and marks it won.
2. **Onboarding** (`/accounts` + `/creative`): the account exec sends the brand discovery questionnaire link. The answers land on the client record. A designer builds the brand kit, which goes through review and client sign-off. **No content work starts until the brand kit is signed off.**
3. **Monthly content** (`/accounts`): the account exec plans each month's 26 pieces and one campaign, the client approves the plan in the portal, and the account exec records KPIs and writes the monthly review.
4. **Design** (`/creative`): designers work the approved calendar week by week, with visuals, copy and captions, timing every deliverable. Work goes through internal review and then to the client in the portal.
5. **Client portal** (`/portal`): the client approves work, follows progress, reads reports, pays invoices and downloads brand assets.

## What replaces what

The prototypes passed data between tools with CSV files. In this app everything shares one database, so:

| Prototype hand-off | In this app |
| --- | --- |
| Questionnaire downloads a brief file and a CSV | `/start/[token]` saves answers straight to the client's brief |
| Account Desk exports a calendar CSV for design | The calendar is the same records `/creative` works from |
| Designer marks the brand kit "Done" | The kit appears in the client's portal automatically |
| AE sends designs to the client by WhatsApp | The client approves in the portal; everyone sees the result live |
| KPIs typed by hand | Pulled nightly from Meta and Google Analytics (Phase 6), with manual entry as a fallback |

## Roles

| Role | Code | Signs in with |
| --- | --- | --- |
| CEO | `ceo` | Email + password |
| Account exec | `account_exec` | Email + password |
| Creative director | `creative_director` | Email + password |
| Designer | `designer` | Email + password |
| Client user | `client` | Client ID + password |

Full access rules: `01-auth-and-roles.md`.

## Limits and settings

- **Active client capacity:** 10, stored as `settings.max_active_clients` so the CEO can change it. The app blocks activating an 11th client and shows why.
- **VAT:** off. See CLAUDE.md rule 9.

## Glossary

| Term | Meaning |
| --- | --- |
| Slot | One planned deliverable in a month, coded `P01–P20` (posts), `S01–S04` (stories), `R01–R02` (reels), `A01–A03` (campaign ads) |
| Pillar | The content type: Showcase, Educate, Proof, Behind the scenes, Engage |
| Brand kit | Logo and icon files, four brand colours, fonts, a 3-page brand guide and extras |
| Client ID | A client's sign-in name, e.g. `MM-KGC-2611` |
| Sign-off | The client's written approval, recorded with who and when |
