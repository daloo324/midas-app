-- Phase 2: content months and items, campaigns and KPIs, with the functions
-- that move them through their statuses (01-auth-and-roles.md, 03-accounts.md).
--
-- Statuses, item creation and locking change only through the security-definer
-- functions below. Those run as the table owner, so the guard triggers treat
-- them as trusted (is_trusted_caller); signed-in users editing rows directly
-- can change only the fields their role owns.

-- Today's date in Botswana.
create function public.today_gaborone()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Africa/Gaborone')::date;
$$;

grant execute on function public.today_gaborone() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- content_months
-- ---------------------------------------------------------------------------

create table public.content_months (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id),
  month date not null check (extract(day from month) = 1),
  plan_status public.plan_status not null default 'draft',
  plan_sent_at timestamptz,
  plan_approved_at timestamptz,
  plan_approved_by uuid references auth.users (id),
  -- Steps ticked by hand; the others follow the records (03-accounts.md).
  checklist jsonb not null default '{}'::jsonb check (
    jsonb_typeof(checklist) = 'object'
    and checklist - array['review_sent', 'weeks_1_2', 'weeks_3_4'] = '{}'::jsonb
  ),
  review jsonb not null default '{}'::jsonb check (
    jsonb_typeof(review) = 'object'
    and review - array['working', 'adjust', 'top_piece', 'focus'] = '{}'::jsonb
  ),
  review_published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, month)
);

create trigger content_months_updated_at before update on public.content_months
  for each row execute function public.set_updated_at();

-- Users edit only the hand-ticked checklist steps and the review, and the
-- review only until it's published.
create function public.guard_content_month_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_trusted_caller() then
    return new;
  end if;
  if new.review is distinct from old.review and old.review_published_at is not null then
    raise exception 'This review is published. Ask the CEO to unpublish it before changing it.'
      using errcode = 'P0001';
  end if;
  if exists (
    select 1 from jsonb_each(new.checklist) e where jsonb_typeof(e.value) <> 'boolean'
  ) then
    raise exception 'Checklist steps are ticked or unticked.' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger content_months_guard_update before update on public.content_months
  for each row execute function public.guard_content_month_update();

alter table public.content_months enable row level security;

create policy "Staff read content months" on public.content_months
  for select to authenticated using (public.is_staff() and public.can_access_client(client_id));
create policy "CEO and account exec update content months" on public.content_months
  for update to authenticated
  using (public.auth_role() in ('ceo', 'account_exec') and public.can_access_client(client_id))
  with check (public.auth_role() in ('ceo', 'account_exec') and public.can_access_client(client_id));

grant select on public.content_months to authenticated;
grant update (checklist, review) on public.content_months to authenticated;
grant select, insert, update, delete on public.content_months to service_role;

-- ---------------------------------------------------------------------------
-- content_items: 26 per month (P01-P20, S01-S04, R01-R02), plus A01-A03 when
-- the month has a campaign.
-- ---------------------------------------------------------------------------

create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  month_id uuid not null references public.content_months (id),
  client_id uuid not null references public.clients (id),
  slot_code text not null check (slot_code ~ '^(P(0[1-9]|1[0-9]|20)|S0[1-4]|R0[1-2]|A0[1-3])$'),
  format public.item_format not null,
  scheduled_date date,
  pillar public.pillar not null,
  platform text not null default 'both'
    check (platform in ('both', 'facebook', 'instagram', 'tiktok', 'linkedin', 'x', 'youtube')),
  topic text,
  notes text,
  status public.work_status not null default 'planned',
  visual text,
  graphic_copy text,
  caption text,
  hashtags text,
  final_file_path text,
  preview_path text,
  revision_rounds int not null default 0 check (revision_rounds >= 0),
  assigned_designer_id uuid references public.profiles (id),
  shown_to_client_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (month_id, slot_code),
  -- The slot letter fixes the format; campaign pillar only on ad slots.
  check (
    (left(slot_code, 1) = 'P' and format = 'post')
    or (left(slot_code, 1) = 'S' and format = 'story')
    or (left(slot_code, 1) = 'R' and format = 'reel')
    or (slot_code = 'A01' and format = 'ad_feed')
    or (slot_code = 'A02' and format = 'ad_story')
    or (slot_code = 'A03' and format = 'ad_variant')
  ),
  check ((left(slot_code, 1) = 'A') = (pillar = 'campaign')),
  check (left(slot_code, 1) = 'A' or scheduled_date is not null)
);

create index content_items_client_id_idx on public.content_items (client_id);
create index content_items_status_idx on public.content_items (status);

create trigger content_items_updated_at before update on public.content_items
  for each row execute function public.set_updated_at();

-- Plan fields belong to the account exec, design fields to the creative team
-- (01-auth-and-roles.md). Everything else changes only through functions.
create function public.guard_content_item()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  role text := public.auth_role();
  month_start date;
begin
  select m.month into month_start from public.content_months m where m.id = new.month_id;
  if new.scheduled_date is not null
     and (new.scheduled_date < month_start or new.scheduled_date >= (month_start + interval '1 month')::date) then
    raise exception 'The date must be in the month being planned.' using errcode = '22023';
  end if;

  if tg_op = 'INSERT' or public.is_trusted_caller() then
    return new;
  end if;

  if new.status is distinct from old.status
     or new.shown_to_client_at is distinct from old.shown_to_client_at
     or new.revision_rounds is distinct from old.revision_rounds
     or new.month_id is distinct from old.month_id
     or new.client_id is distinct from old.client_id
     or new.slot_code is distinct from old.slot_code
     or new.format is distinct from old.format then
    raise exception 'Use the status buttons to move an item.' using errcode = '42501';
  end if;

  if role not in ('ceo', 'account_exec')
     and (new.scheduled_date is distinct from old.scheduled_date
       or new.pillar is distinct from old.pillar
       or new.platform is distinct from old.platform
       or new.topic is distinct from old.topic
       or new.notes is distinct from old.notes) then
    raise exception 'Only the account exec plans dates, pillars, platforms and topics.' using errcode = '42501';
  end if;

  if role not in ('ceo', 'creative_director', 'designer')
     and (new.visual is distinct from old.visual
       or new.graphic_copy is distinct from old.graphic_copy
       or new.caption is distinct from old.caption
       or new.hashtags is distinct from old.hashtags
       or new.final_file_path is distinct from old.final_file_path
       or new.preview_path is distinct from old.preview_path
       or new.assigned_designer_id is distinct from old.assigned_designer_id) then
    raise exception 'Only the creative team edits the design.' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger content_items_guard before insert or update on public.content_items
  for each row execute function public.guard_content_item();

alter table public.content_items enable row level security;

create policy "Staff read content items" on public.content_items
  for select to authenticated using (public.is_staff() and public.can_access_client(client_id));
create policy "Staff update content items" on public.content_items
  for update to authenticated
  using (public.is_staff() and public.can_access_client(client_id))
  with check (public.is_staff() and public.can_access_client(client_id));

grant select on public.content_items to authenticated;
grant update (
  scheduled_date, pillar, platform, topic, notes,
  visual, graphic_copy, caption, hashtags, final_file_path, preview_path, assigned_designer_id
) on public.content_items to authenticated;
grant select, insert, update, delete on public.content_items to service_role;

-- ---------------------------------------------------------------------------
-- campaigns: one per client per month.
-- ---------------------------------------------------------------------------

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id),
  month_id uuid not null unique references public.content_months (id),
  status public.campaign_status not null default 'draft',
  name text,
  goal text,
  main_kpi text,
  offer text,
  start_date date,
  end_date date,
  ad_budget numeric(12, 2) check (ad_budget >= 0), -- paid by the client to Meta, never invoiced
  ads_run_by text check (ads_run_by in ('midas', 'client')),
  audience jsonb not null default '{}'::jsonb check (
    jsonb_typeof(audience) = 'object'
    and audience - array['location', 'age', 'interests', 'retarget'] = '{}'::jsonb
  ),
  message jsonb not null default '{}'::jsonb check (
    jsonb_typeof(message) = 'object'
    and message - array['hook', 'headline_a', 'headline_b', 'primary_text', 'cta', 'test_angle'] = '{}'::jsonb
  ),
  creative_direction text,
  launch jsonb not null default '{}'::jsonb check (
    jsonb_typeof(launch) = 'object'
    and launch - array['landing', 'tracking', 'replier', 'reply_time'] = '{}'::jsonb
  ),
  results text,
  results_metrics jsonb not null default '{}'::jsonb check (
    jsonb_typeof(results_metrics) = 'object'
    and results_metrics - array['spend', 'results', 'cost_per_result'] = '{}'::jsonb
  ),
  client_approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create index campaigns_client_id_idx on public.campaigns (client_id);

create trigger campaigns_updated_at before update on public.campaigns
  for each row execute function public.set_updated_at();

-- A complete campaign is a record; only the CEO changes it after that.
create function public.guard_campaign_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_trusted_caller() then
    return new;
  end if;
  if old.status = 'complete' and not public.is_ceo() then
    raise exception 'This campaign is complete, so it can''t be changed.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger campaigns_guard_update before update on public.campaigns
  for each row execute function public.guard_campaign_update();

-- The ads run from the campaign's start date (or the 1st, if it starts earlier).
create function public.sync_campaign_ad_dates()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  month_start date;
  ad_date date;
begin
  select m.month into month_start from public.content_months m where m.id = new.month_id;
  ad_date := case
    when new.start_date is null then null
    when new.start_date >= (month_start + interval '1 month')::date then null
    else greatest(new.start_date, month_start)
  end;
  update public.content_items
     set scheduled_date = ad_date
   where month_id = new.month_id and left(slot_code, 1) = 'A'
     and scheduled_date is distinct from ad_date;
  return new;
end;
$$;

create trigger campaigns_sync_ad_dates after insert or update of start_date on public.campaigns
  for each row execute function public.sync_campaign_ad_dates();

alter table public.campaigns enable row level security;

create policy "Staff read campaigns" on public.campaigns
  for select to authenticated using (public.is_staff() and public.can_access_client(client_id));
create policy "CEO and account exec update campaigns" on public.campaigns
  for update to authenticated
  using (public.auth_role() in ('ceo', 'account_exec') and public.can_access_client(client_id))
  with check (public.auth_role() in ('ceo', 'account_exec') and public.can_access_client(client_id));

grant select on public.campaigns to authenticated;
grant update (
  name, goal, main_kpi, offer, start_date, end_date, ad_budget, ads_run_by,
  audience, message, creative_direction, launch, results, results_metrics
) on public.campaigns to authenticated;
grant select, insert, update, delete on public.campaigns to service_role;

-- ---------------------------------------------------------------------------
-- kpi_months: one per client per month; client_id null is Midas's own channels.
-- ---------------------------------------------------------------------------

create function public.kpi_keys()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array[
    'reach', 'views', 'followers', 'profile_visits', 'saves', 'reviews', 'first_round_approved',
    'interactions', 'comments', 'shares', 'reel_plays', 'link_clicks', 'messages',
    'ad_spend', 'ad_results', 'enquiries'
  ];
$$;

create function public.valid_kpi_metrics(m jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(m) = 'object'
     and m - public.kpi_keys() = '{}'::jsonb
     and not exists (
       select 1 from jsonb_each(m) e
       where jsonb_typeof(e.value) <> 'number' or (e.value)::numeric < 0
     );
$$;

create function public.valid_kpi_sources(s jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(s) = 'object'
     and s - public.kpi_keys() = '{}'::jsonb
     and not exists (
       select 1 from jsonb_each_text(s) e where e.value not in ('manual', 'meta', 'ga4')
     );
$$;

create table public.kpi_months (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients (id),
  month date not null check (extract(day from month) = 1),
  metrics jsonb not null default '{}'::jsonb check (public.valid_kpi_metrics(metrics)),
  sources jsonb not null default '{}'::jsonb check (public.valid_kpi_sources(sources)),
  locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (client_id, month)
);

create trigger kpi_months_updated_at before update on public.kpi_months
  for each row execute function public.set_updated_at();

create function public.guard_kpi_month()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_trusted_caller() then
    return new;
  end if;
  if tg_op = 'INSERT' and new.locked then
    raise exception 'KPIs are locked by publishing the review.' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and old.locked then
    raise exception 'These KPIs are locked because the review is published.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger kpi_months_guard before insert or update on public.kpi_months
  for each row execute function public.guard_kpi_month();

alter table public.kpi_months enable row level security;

create policy "Staff read KPIs" on public.kpi_months
  for select to authenticated
  using (
    (client_id is null and public.is_ceo())
    or (client_id is not null and public.is_staff() and public.can_access_client(client_id))
  );
create policy "CEO and account exec add KPIs" on public.kpi_months
  for insert to authenticated
  with check (
    (client_id is null and public.is_ceo())
    or (client_id is not null and public.auth_role() in ('ceo', 'account_exec') and public.can_access_client(client_id))
  );
create policy "CEO and account exec update KPIs" on public.kpi_months
  for update to authenticated
  using (
    (client_id is null and public.is_ceo())
    or (client_id is not null and public.auth_role() in ('ceo', 'account_exec') and public.can_access_client(client_id))
  )
  with check (
    (client_id is null and public.is_ceo())
    or (client_id is not null and public.auth_role() in ('ceo', 'account_exec') and public.can_access_client(client_id))
  );

grant select on public.kpi_months to authenticated;
grant insert (client_id, month, metrics, sources) on public.kpi_months to authenticated;
grant update (metrics, sources) on public.kpi_months to authenticated;
grant select, insert, update, delete on public.kpi_months to service_role;

-- Calculated metrics, never stored. Runs with the reader's rights, so RLS on
-- kpi_months, clients and content_items applies.
create view public.kpi_months_calc
with (security_invoker = true)
as
with counts as (
  select m.client_id, m.month,
    count(*) filter (where left(i.slot_code, 1) <> 'A') as planned,
    count(*) filter (where left(i.slot_code, 1) <> 'A' and i.status = 'published') as published,
    count(*) filter (where i.status in ('approved', 'scheduled', 'published')) as approved
  from public.content_months m
  join public.content_items i on i.month_id = m.id
  group by m.client_id, m.month
)
select
  k.id,
  k.client_id,
  k.month,
  (k.metrics ->> 'followers')::numeric
    - coalesce((prev.metrics ->> 'followers')::numeric, (c.baseline ->> 'followers')::numeric)
    as net_new_followers,
  cnt.published,
  cnt.planned,
  case when coalesce(cnt.approved, 0) > 0
    then round((k.metrics ->> 'first_round_approved')::numeric / cnt.approved, 4) end
    as first_round_rate,
  case when (k.metrics ->> 'reach')::numeric > 0
    then round((k.metrics ->> 'interactions')::numeric / (k.metrics ->> 'reach')::numeric, 4) end
    as engagement_rate,
  case when (k.metrics ->> 'ad_results')::numeric > 0
    then round((k.metrics ->> 'ad_spend')::numeric / (k.metrics ->> 'ad_results')::numeric, 2) end
    as cost_per_result
from public.kpi_months k
left join public.kpi_months prev
  on prev.client_id is not distinct from k.client_id
 and prev.month = (k.month - interval '1 month')::date
left join public.clients c on c.id = k.client_id
left join counts cnt on cnt.client_id = k.client_id and cnt.month = k.month;

grant select on public.kpi_months_calc to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- What clients see (owner-rights views, like portal_client). Phase 4 builds
-- the rest of the portal on these.
-- ---------------------------------------------------------------------------

-- Plan fields only, once the month's calendar has been sent.
create view public.portal_calendar
with (security_barrier = true)
as
select i.id, i.month_id, i.client_id, m.month, i.slot_code, i.format,
       i.scheduled_date, i.pillar, i.topic, i.platform
from public.content_items i
join public.content_months m on m.id = i.month_id
where m.plan_status in ('sent', 'approved')
  and left(i.slot_code, 1) <> 'A'
  and public.can_access_client(i.client_id);

create view public.portal_months
with (security_barrier = true)
as
select m.id, m.client_id, m.month, m.plan_status, m.plan_sent_at, m.plan_approved_at,
       case when m.review_published_at is not null then m.review end as review,
       m.review_published_at
from public.content_months m
where m.plan_status in ('sent', 'approved')
  and public.can_access_client(m.client_id);

-- Campaign briefs once sent (the internal draft stays hidden).
create view public.portal_campaigns
with (security_barrier = true)
as
select c.id, c.client_id, c.month_id, m.month, c.status, c.name, c.goal, c.main_kpi, c.offer,
       c.start_date, c.end_date, c.ad_budget, c.ads_run_by, c.audience, c.message,
       c.creative_direction, c.launch, c.results, c.client_approved_at
from public.campaigns c
join public.content_months m on m.id = c.month_id
where c.status <> 'draft'
  and public.can_access_client(c.client_id);

revoke all on public.portal_calendar, public.portal_months, public.portal_campaigns from anon, public;
grant select on public.portal_calendar, public.portal_months, public.portal_campaigns to authenticated, service_role;
