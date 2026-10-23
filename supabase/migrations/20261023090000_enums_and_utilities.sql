-- Enums from docs/spec/02-data-model.md, and shared utilities.
-- Every status in the app lives in one of these enums (CLAUDE.md rule 13).

create type public.staff_role as enum ('ceo', 'account_exec', 'creative_director', 'designer');
create type public.client_status as enum ('lead_won', 'onboarding', 'active', 'paused', 'ended');
create type public.goal_category as enum ('visibility', 'credibility', 'engagement', 'results');
create type public.pillar as enum ('showcase', 'educate', 'proof', 'behind_the_scenes', 'engage', 'campaign');
create type public.item_format as enum ('post', 'story', 'reel', 'ad_feed', 'ad_story', 'ad_variant');
create type public.work_status as enum (
  'planned', 'in_design', 'internal_review', 'client_review',
  'changes_requested', 'approved', 'scheduled', 'published'
);
create type public.plan_status as enum ('draft', 'sent', 'approved');
create type public.campaign_status as enum ('draft', 'sent', 'approved', 'live', 'complete');
create type public.service_unit as enum ('monthly', 'once_off', 'hourly', 'per_item');
create type public.lead_stage as enum ('new', 'contacted', 'quote_sent', 'won', 'lost');
create type public.lead_source as enum (
  'referral', 'website', 'facebook', 'instagram', 'linkedin', 'walk_in', 'event', 'other'
);
create type public.quote_status as enum ('draft', 'sent', 'accepted', 'declined', 'expired');
create type public.invoice_status as enum ('draft', 'issued', 'part_paid', 'paid', 'credited');
create type public.metric_source as enum ('manual', 'meta', 'ga4');

-- Keeps updated_at current on any table that has it.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- True when the current statement runs as the service role or a database owner
-- (migrations, seed, cron), rather than as a signed-in user.
create function public.is_trusted_caller()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'role', '') = 'service_role'
      or current_user in ('postgres', 'supabase_admin', 'service_role');
$$;
