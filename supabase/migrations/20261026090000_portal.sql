-- Phase 4: the client portal (05-portal.md).

-- ---------------------------------------------------------------------------
-- Work goes to the client only with a preview image they can see.
-- ---------------------------------------------------------------------------

create or replace function public.set_content_status(p_item_id uuid, p_new_status public.work_status, p_comment text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  item public.content_items;
  mon public.content_months;
  role text := public.auth_role();
  move text;
  allowed text[];
  client_name text;
  ae uuid;
  link text;
begin
  select * into item from public.content_items where id = p_item_id for update;
  if not found or not public.can_access_client(item.client_id) then
    raise exception 'That item doesn''t exist.' using errcode = 'P0002';
  end if;
  select * into mon from public.content_months where id = item.month_id;

  move := item.status::text || '>' || p_new_status::text;
  allowed := case move
    when 'planned>in_design' then array['designer', 'creative_director']
    when 'in_design>internal_review' then array['designer', 'creative_director']
    when 'internal_review>client_review' then array['creative_director']
    when 'internal_review>changes_requested' then array['creative_director']
    when 'client_review>approved' then array['client', 'account_exec']
    when 'client_review>changes_requested' then array['client', 'account_exec']
    when 'changes_requested>in_design' then array['designer', 'creative_director']
    when 'approved>scheduled' then array['account_exec']
    when 'scheduled>published' then array['account_exec']
    else array[]::text[]
  end;

  if cardinality(allowed) = 0 then
    raise exception 'An item can''t move from % to %.', replace(item.status::text, '_', ' '), replace(p_new_status::text, '_', ' ')
      using errcode = 'P0001';
  end if;
  if not (role = any (allowed) or role = 'ceo') then
    raise exception 'You can''t make this move.' using errcode = '42501';
  end if;

  -- The client must see what they're approving (Dave, 2026-10-23).
  if p_new_status = 'client_review' and nullif(trim(item.preview_path), '') is null then
    raise exception 'Add a client preview image first.' using errcode = 'P0001';
  end if;
  if p_new_status = 'in_design' and item.status = 'planned' then
    if not exists (select 1 from public.brand_kits k where k.client_id = item.client_id and k.status = 'approved') then
      raise exception 'The board opens once the client signs off their brand kit.' using errcode = 'P0001';
    end if;
    if mon.plan_status <> 'approved' then
      raise exception 'The client hasn''t approved this month''s calendar yet.' using errcode = 'P0001';
    end if;
  end if;
  if item.status = 'client_review' and role <> 'client' and nullif(trim(p_comment), '') is null then
    raise exception 'Add a note saying how the client approved or what they asked for.' using errcode = '22023';
  end if;
  if role = 'client' and p_new_status = 'changes_requested' and nullif(trim(p_comment), '') is null then
    raise exception 'Tell us what to change.' using errcode = '22023';
  end if;

  update public.content_items
     set status = p_new_status,
         shown_to_client_at = case when p_new_status = 'client_review' then coalesce(shown_to_client_at, now()) else shown_to_client_at end,
         revision_rounds = revision_rounds
           + case when item.status = 'client_review' and p_new_status = 'changes_requested' then 1 else 0 end
   where id = p_item_id;

  perform public.log_status(item.client_id, 'content_item', item.id, item.status::text, p_new_status::text, p_comment);

  if item.status = 'client_review' then
    perform public.add_client_feedback(item.client_id, 'content_item', item.id, p_comment);
  end if;

  select c.name, c.account_exec_id into client_name, ae from public.clients c where c.id = item.client_id;
  link := '/accounts/clients/' || item.client_id || '/calendar?month=' || to_char(mon.month, 'YYYY-MM');
  if p_new_status = 'client_review' then
    perform public.notify(ae, item.slot_code || ' is waiting on the client',
      client_name || ': ' || coalesce(item.topic, item.slot_code) || ' went to the client for review.', link);
  elsif item.status = 'client_review' and role = 'client' then
    perform public.notify(ae,
      case when p_new_status = 'approved' then client_name || ' approved ' || item.slot_code
           else client_name || ' asked for changes to ' || item.slot_code end,
      nullif(trim(p_comment), ''), link);
  end if;
  if item.status = 'client_review' and p_new_status = 'changes_requested' and item.assigned_designer_id is not null then
    perform public.notify(item.assigned_designer_id, client_name || ' asked for changes to ' || item.slot_code,
      nullif(trim(p_comment), ''),
      '/creative/clients/' || item.client_id || '/board?month=' || to_char(mon.month, 'YYYY-MM') || '#' || item.id);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Staff phone numbers, so clients can reach their account exec.
-- ---------------------------------------------------------------------------

alter table public.profiles add column phone text check (length(phone) <= 40);
grant update (phone) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- What a client sees (owner-rights views, filtered to their own client)
-- ---------------------------------------------------------------------------

-- The client's record, plus what the portal shows: main goal, baseline,
-- their plan and its inclusions, and how to reach their account exec.
create or replace view public.portal_client
with (security_barrier = true)
as
select
  c.id,
  c.name,
  c.client_code,
  c.status,
  c.start_date,
  c.platforms,
  c.monthly_fee,
  ae.full_name as account_exec_name,
  ae.email as account_exec_email,
  c.main_goal,
  c.baseline,
  s.name as service_name,
  s.inclusions as service_inclusions,
  ae.phone as account_exec_phone
from public.clients c
left join public.profiles ae on ae.id = c.account_exec_id
left join public.services s on s.id = c.service_id
where public.can_access_client(c.id);

-- Work the client has been shown (client_review or later); never drafts.
create view public.portal_items
with (security_barrier = true)
as
select i.id, i.month_id, m.month, i.client_id, i.slot_code, i.format, i.scheduled_date, i.pillar,
       i.platform, i.topic, i.status, i.graphic_copy, i.caption, i.hashtags, i.preview_path,
       i.revision_rounds, i.shown_to_client_at
from public.content_items i
join public.content_months m on m.id = i.month_id
where i.shown_to_client_at is not null
  and public.can_access_client(i.client_id);

-- Each shown item's status history, from when the client first saw it.
create view public.portal_item_history
with (security_barrier = true)
as
select se.id, se.entity_id as item_id, i.client_id, se.to_status, se.actor_kind, se.created_at
from public.status_events se
join public.content_items i on i.id = se.entity_id
where se.entity_type = 'content_item'
  and i.shown_to_client_at is not null
  and se.created_at >= i.shown_to_client_at - interval '1 second'
  and se.to_status in ('client_review', 'changes_requested', 'approved', 'scheduled', 'published')
  and public.can_access_client(i.client_id);

-- KPIs only for months whose review is published.
create view public.portal_kpis
with (security_barrier = true)
as
select k.client_id, k.month, k.metrics
from public.kpi_months k
join public.content_months m on m.client_id = k.client_id and m.month = k.month
where m.review_published_at is not null
  and k.client_id is not null
  and public.can_access_client(k.client_id);

-- Campaign briefs once sent, now with their results figures.
create or replace view public.portal_campaigns
with (security_barrier = true)
as
select c.id, c.client_id, c.month_id, m.month, c.status, c.name, c.goal, c.main_kpi, c.offer,
       c.start_date, c.end_date, c.ad_budget, c.ads_run_by, c.audience, c.message,
       c.creative_direction, c.launch, c.results, c.client_approved_at, c.results_metrics
from public.campaigns c
join public.content_months m on m.id = c.month_id
where c.status <> 'draft'
  and public.can_access_client(c.client_id);

revoke all on public.portal_items, public.portal_item_history, public.portal_kpis from anon, public;
grant select on public.portal_items, public.portal_item_history, public.portal_kpis to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Undo: a client can take back an answer for 10 minutes, until the team acts
-- on it (05-portal.md, "Approvals").
-- ---------------------------------------------------------------------------

create function public.undo_client_response(p_entity_type text, p_entity_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  ev public.status_events;
  cid uuid;
  later boolean;
  client_name text;
  ae uuid;
begin
  if public.auth_role() <> 'client' then
    raise exception 'Only the client can undo their answer.' using errcode = '42501';
  end if;
  select * into ev from public.status_events se
   where se.entity_type = p_entity_type and se.entity_id = p_entity_id
   order by se.created_at desc, se.id desc limit 1;
  if not found or not public.can_access_client(ev.client_id) then
    raise exception 'There''s nothing to undo.' using errcode = 'P0002';
  end if;
  cid := ev.client_id;
  if ev.actor_id is distinct from auth.uid() or ev.actor_kind <> 'client'
     or ev.to_status not in ('approved', 'changes_requested', 'draft') then
    raise exception 'There''s nothing to undo.' using errcode = 'P0001';
  end if;
  if ev.created_at < now() - interval '10 minutes' then
    raise exception 'It''s been more than 10 minutes, so this can''t be undone. Ask your account executive.' using errcode = 'P0001';
  end if;

  -- Has the team acted since? Any later move on this, or on the month's work.
  later := case p_entity_type
    when 'content_month' then exists (
      select 1 from public.status_events se join public.content_items i on i.id = se.entity_id
      where se.entity_type = 'content_item' and i.month_id = p_entity_id and se.created_at > ev.created_at)
    when 'brand_kit' then exists (
      select 1 from public.status_events se
      where se.client_id = cid and se.entity_type = 'content_item' and se.created_at > ev.created_at)
    else false
  end;
  if later then
    raise exception 'Midas has already started on this, so it can''t be undone. Ask your account executive.' using errcode = 'P0001';
  end if;

  if p_entity_type = 'content_item' then
    update public.content_items
       set status = 'client_review',
           revision_rounds = revision_rounds - case when ev.to_status = 'changes_requested' then 1 else 0 end
     where id = p_entity_id;
  elsif p_entity_type = 'content_month' then
    update public.content_months
       set plan_status = 'sent', plan_sent_at = coalesce(plan_sent_at, now()), plan_approved_at = null, plan_approved_by = null
     where id = p_entity_id;
  elsif p_entity_type = 'campaign' then
    update public.campaigns set status = 'sent', client_approved_at = null where id = p_entity_id;
  elsif p_entity_type = 'brand_kit' then
    update public.brand_kits set status = 'client_review', signed_off_by = null, signed_off_at = null where id = p_entity_id;
  else
    raise exception 'There''s nothing to undo.' using errcode = 'P0001';
  end if;

  perform public.log_status(cid, p_entity_type, p_entity_id, ev.to_status, ev.from_status, 'Undone by the client');

  select c.name, c.account_exec_id into client_name, ae from public.clients c where c.id = cid;
  perform public.notify(ae, client_name || ' undid their answer', 'They took back an approval or change request. It''s waiting for them again.',
    '/accounts/clients/' || cid || '/onboarding');
end;
$$;

revoke execute on function public.undo_client_response(text, uuid) from public, anon;
grant execute on function public.undo_client_response(text, uuid) to authenticated;

-- The audit trail records the moment of each move, so several moves in one
-- transaction (a timer starting work, for example) keep their order.
create or replace function public.log_status(
  p_client_id uuid, p_entity_type text, p_entity_id uuid,
  p_from text, p_to text, p_comment text
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.status_events (client_id, entity_type, entity_id, from_status, to_status, comment, actor_id, actor_kind, created_at)
  values (p_client_id, p_entity_type, p_entity_id, p_from, p_to, nullif(trim(p_comment), ''), auth.uid(), public.actor_kind(), clock_timestamp());
$$;
