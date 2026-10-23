# 02 · Data model

All tables live in the `public` schema with RLS on (CLAUDE.md rule 1). Every table has `id uuid primary key default gen_random_uuid()` unless stated, plus `created_at timestamptz default now()` and, where rows change, `updated_at` maintained by a trigger. Policies use the helpers in `01-auth-and-roles.md`.

This file defines the shape. Build each table in the phase that first needs it (see `PHASES.md`), not all at once.

## Enums

| Enum | Values |
| --- | --- |
| `staff_role` | `ceo`, `account_exec`, `creative_director`, `designer` |
| `client_status` | `lead_won`, `onboarding`, `active`, `paused`, `ended` |
| `goal_category` | `visibility`, `credibility`, `engagement`, `results` |
| `pillar` | `showcase`, `educate`, `proof`, `behind_the_scenes`, `engage`, `campaign` |
| `item_format` | `post`, `story`, `reel`, `ad_feed`, `ad_story`, `ad_variant` |
| `work_status` | `planned`, `in_design`, `internal_review`, `client_review`, `changes_requested`, `approved`, `scheduled`, `published` |
| `plan_status` | `draft`, `sent`, `approved` (content month calendar) |
| `campaign_status` | `draft`, `sent`, `approved`, `live`, `complete` |
| `service_unit` | `monthly`, `once_off`, `hourly`, `per_item` |
| `lead_stage` | `new`, `contacted`, `quote_sent`, `won`, `lost` |
| `lead_source` | `referral`, `website`, `facebook`, `instagram`, `linkedin`, `walk_in`, `event`, `other` |
| `quote_status` | `draft`, `sent`, `accepted`, `declined`, `expired` |
| `invoice_status` | `draft`, `issued`, `part_paid`, `paid`, `credited` |
| `metric_source` | `manual`, `meta`, `ga4` |

## People

**`profiles`**: one row per staff member. `id` = `auth.users.id`.
`full_name`, `email`, `role staff_role`, `active bool default true`, `avatar_path`.

**`client_users`**: one row per client login.
`user_id` → `auth.users` (unique), `client_id` → `clients`, `full_name`, `email`, `login_id text unique` (e.g. `MM-KGC-2611`), `is_primary bool`, `active bool`.

**`login_attempts`**: `login_id`, `succeeded bool`, `ip`, `created_at`. Service role only, no policies for other roles. Old rows deleted after 30 days by cron.

## Clients

**`clients`**
`name`, `client_code text unique` (the `MM-XXX-0000` code), `industry`, `status client_status`, `account_exec_id` → `profiles`, `service_id` → `services` (their retainer), `monthly_fee numeric(12,2)` (copied from the service when won), `start_date`, `end_date`, `contact_name`, `contact_role`, `contact_email`, `contact_phone`, `decision_maker`, `platforms text[]` (e.g. `{facebook,instagram}`), `pillar_mix jsonb` (default `{"showcase":6,"educate":5,"proof":3,"behind_the_scenes":3,"engage":3}`, must total 20), `main_goal goal_category`, `expectation_notes`, `baseline jsonb` (followers, reach, interactions, profile_visits, messages), `notes`, `lead_id` → `leads`.

Client users can read only: `name`, `client_code`, `status`, `start_date`, `platforms`, `monthly_fee`, and their account exec's name and contact details. Expose these through a view `portal_client` rather than opening the table.

**`brand_briefs`**: the questionnaire answers.
`client_id` (unique), `answers jsonb` (array of `{section, question, answer}`), `uploads jsonb` (array of storage paths with notes), `submitted_at`, `design_notes text` (written by designers).

**`questionnaire_invites`**: `client_id`, `token text unique` (32 random characters), `expires_at` (30 days), `used_at`. Public access only through a security-definer function that checks the token.

## Brand kit

**`brand_kits`**: one per client (`client_id` unique).
`status work_status default 'planned'`, `shown_to_client_at timestamptz`, `colors jsonb` (`{primary, secondary, tertiary, accent}` as `#RRGGBB`; black and white are implied), `heading_font`, `body_font`, `voice text`, `guide_checks jsonb` (keys: `sheet`, `clear_space`, `min_size`, `do_dont`, `pairings`, `extras`), `signed_off_by text`, `signed_off_at timestamptz`, `assigned_designer_id` → `profiles`.

**`brand_kit_files`**
`client_id`, `slot text`, `storage_path`, `file_name`, `size_bytes`, `mime_type`, `uploaded_by`.
Fixed slots, unique per client: `logo_{full|black|white}_{svg|png|pdf}`, `icon_{full|black|white}_{svg|png|pdf}`, `font_{heading|body}_{400|500|600|700}`, `guide_pdf`. Extras use slot `extra` (many allowed).
A check constraint limits `slot` to these values. Required items for "kit complete": 9 logo files, 9 icon files, 4 colours set, at least one weight per font role, and the guide (25 items).

## Content

**`content_months`**: one per client per month (`unique(client_id, month)`).
`month date` (first of month), `plan_status plan_status`, `plan_sent_at`, `plan_approved_at`, `plan_approved_by`, `checklist jsonb` (keys from `03-accounts.md`), `review jsonb` (`working`, `adjust`, `top_piece`, `focus`), `review_published_at`.

**`content_items`**
`month_id`, `client_id` (denormalised for RLS), `slot_code text` (`P01`…`A03`, unique per month), `format item_format`, `scheduled_date date`, `pillar pillar`, `platform text` (`facebook`, `instagram`, `both`, …), `topic text`, `notes text` (AE notes, e.g. campaign details), `status work_status default 'planned'`, `visual text`, `graphic_copy text` (text on the design, max 8 words recommended), `caption text`, `hashtags text`, `final_file_path text`, `preview_path text` (an image the client sees in the portal), `revision_rounds int default 0`, `assigned_designer_id`, `shown_to_client_at timestamptz` (set the first time the item moves to `client_review`, never cleared).
For calendar approval, clients read plan fields only (slot, format, date, pillar, topic, platform) through a view `portal_calendar`, for months whose `plan_status` is `sent` or `approved`.
Clients see a full item (design fields, preview, status) only when `shown_to_client_at` is set. This is what "client_review or later" means throughout the spec: an item sent back by the creative director before the client ever saw it stays hidden, while an item the client asked to change stays visible as "Changes requested".

**`status_events`**: the audit trail for every status move.
`entity_type text` (`content_item`, `brand_kit`, `content_month`, `campaign`), `entity_id`, `from_status`, `to_status`, `comment`, `actor_id`, `actor_kind` (`staff`, `client`), `created_at`. Insert-only for everyone.

**`comments`**: discussion on any piece of work. `entity_type`, `entity_id`, `body`, `author_id`, `author_kind`, `visible_to_client bool`. Clients see only `visible_to_client = true`.

**`campaigns`**: one per client per month.
`client_id`, `month_id`, `status campaign_status`, `name`, `goal`, `main_kpi`, `offer`, `start_date`, `end_date`, `ad_budget numeric(12,2)` (paid by the client to Meta, never invoiced), `ads_run_by text` (`midas`, `client`), `audience jsonb` (location, age, interests, retarget), `message jsonb` (hook, headline_a, headline_b, primary_text, cta, test_angle), `creative_direction text`, `launch jsonb` (landing, tracking, replier, reply_time), `results text`, `results_metrics jsonb` (spend, results, cost_per_result), `client_approved_at`.
Creating a campaign also creates content items `A01` (`ad_feed`), `A02` (`ad_story`), `A03` (`ad_variant`) in that month, pillar `campaign`.

## Performance

**`kpi_months`**: one per client per month (`unique(client_id, month)`); `client_id` null means Midas's own channels.
`metrics jsonb` with keys: `reach`, `views`, `followers`, `profile_visits`, `saves`, `reviews`, `first_round_approved`, `interactions`, `comments`, `shares`, `reel_plays`, `link_clicks`, `messages`, `ad_spend`, `ad_results`, `enquiries`; `sources jsonb` (per key: `manual`, `meta` or `ga4`); `locked bool` (set when the review is published).
Calculated in a view `kpi_months_calc`, never stored: net new followers, published vs planned, first-round approval rate, engagement rate (interactions ÷ reach), cost per ad result.

**`metric_daily`**: raw pulls from Meta and GA4 (Phase 6).
`client_id` (null for Midas), `source metric_source`, `channel text` (`facebook`, `instagram`, `website`), `day date`, `metrics jsonb`, `unique(client_id, source, channel, day)`.

**`integration_connections`**: `client_id` (null for Midas), `provider` (`meta`, `ga4`), `external_ids jsonb` (page_id, ig_user_id, ga4_property_id), `status` (`connected`, `error`, `disconnected`), `last_synced_at`, `last_error`. CEO only.

## Time and resources

**`time_entries`**
`user_id`, `client_id`, `content_item_id` (null for brand kit work), `is_brand_kit bool`, `started_at`, `ended_at` (null while running), `minutes int` (set on stop or for manual entries), `manual bool`, `note`.
A partial unique index allows only one running entry per user: `unique(user_id) where ended_at is null`.

**`inspiration`**: `storage_path`, `note`, `tags text[]`, `client_id` (optional), `uploaded_by`. Staff only.

## Sales and money (CEO only unless stated)

**`services`**: the catalogue the CEO edits.
`name`, `description`, `unit service_unit`, `price numeric(12,2)`, `active bool`, `sort int`, `is_retainer bool`, `inclusions jsonb` (e.g. Brand Launch's 20 posts, 4 stories…, shown in the portal's Account tab).
Seed: Brand Launch (monthly, P3,250, retainer). Dave adds the rest.

**`leads`**: `company`, `contact_name`, `email`, `phone`, `source lead_source`, `stage lead_stage`, `estimated_value numeric(12,2)`, `owner_id`, `next_action`, `next_action_date`, `lost_reason`, `notes`, `client_id` (set when won).

**`quotes`**: `number text unique` (`MM-Q-2026-0001`), `lead_id`, `client_id`, `status quote_status`, `issue_date`, `valid_until` (default +30 days), `intro text`, `terms text`, `subtotal`, `vat_rate`, `vat_amount`, `total`, `sent_at`, `accepted_at`.
**`quote_lines`**: `quote_id`, `service_id`, `description` (copied), `unit` (copied), `quantity numeric`, `unit_price` (copied), `line_total`, `sort`.

**`invoices`**: `number text unique` (`MM-INV-2026-0001`), `client_id`, `quote_id`, `status invoice_status`, `period_label` (e.g. "November 2026"), `issue_date`, `due_date` (default +`settings.payment_terms_days`), `subtotal`, `vat_rate` (0 while not registered), `vat_amount`, `total`, `amount_paid`, `balance` (generated), `title` (`Invoice` or `Tax invoice`, set at issue from settings), `pdf_path`, `issued_at`.
**`invoice_lines`**: same shape as `quote_lines`.
**`payments`**: `invoice_id`, `amount`, `paid_on`, `method` (`eft`, `cash`, `mobile_money`, `card`, `other`), `reference`, `recorded_by`.
**`credit_notes`**: `number` (`MM-CN-2026-0001`), `invoice_id`, `amount`, `reason`, `issued_on`.

Rules:
- Numbers come from a database function using one counter per document type per year (`document_counters` table, service role), so they never skip or repeat.
- Once `status` leaves `draft`, a trigger blocks updates to amounts, lines and numbers, and blocks deletes. Status can still move forward (issued → part_paid → paid; or → credited via a credit note).
- Retainer invoices are created in bulk on the 1st of each month for every `active` client (cron), as **drafts** for the CEO to review and issue.
- Client users read their own invoices where `status <> 'draft'`, with lines and payments.

**`settings`**: a single row.
`company_name` ("Midas Media Solutions"), `legal_name`, `address`, `email`, `phone`, `logo_path`, `bank_details jsonb` (bank, account_name, account_number, branch_code), `payment_terms_days` (7), `vat_registered bool default false`, `vat_number`, `vat_rate numeric default 14`, `max_active_clients int default 10`, `profit_threshold_per_hour numeric(12,2) default 250`, `reminders_enabled bool default true`, `invoice_footer text`.

Add `reminders_enabled bool default true` to `clients` too, so the CEO can switch payment reminders off for one client.

## Notifications

**`notifications`**: `user_id`, `title`, `body`, `link`, `read_at`. Created by triggers on key events (see each area spec). Email copies go through Resend for: client approvals waiting, changes requested, invoice issued, review published.

## Storage buckets (all private)

| Bucket | Path | Who reads |
| --- | --- | --- |
| `brand-kits` | `{client_id}/{slot}/{file}` | Staff with client access; the client **only when** `brand_kits.status = 'approved'` |
| `briefs` | `{client_id}/{file}` | Staff with client access; the client |
| `content` | `{client_id}/{month}/{slot}/{file}` | Staff with client access; the client for items at `client_review` or later |
| `inspiration` | `{uuid}/{file}` | Staff |
| `documents` | `{client_id}/invoices/…`, `{client_id}/agreements/…` | CEO; the client for their own issued documents |

Downloads go through signed URLs created server-side, valid for 10 minutes.
