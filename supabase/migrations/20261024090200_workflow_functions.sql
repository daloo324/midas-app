-- Phase 2 workflow: every status move goes through one of these functions,
-- which check who is allowed, write status_events and send notifications.

-- Who the current user is, for the audit trail.
create function public.actor_kind()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when public.auth_role() = 'client' then 'client'
    when public.is_staff() then 'staff'
    else 'system'
  end;
$$;

revoke execute on function public.actor_kind() from public, anon, authenticated;

create function public.log_status(
  p_client_id uuid, p_entity_type text, p_entity_id uuid,
  p_from text, p_to text, p_comment text
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.status_events (client_id, entity_type, entity_id, from_status, to_status, comment, actor_id, actor_kind)
  values (p_client_id, p_entity_type, p_entity_id, p_from, p_to, nullif(trim(p_comment), ''), auth.uid(), public.actor_kind());
$$;

revoke execute on function public.log_status(uuid, text, uuid, text, text, text) from public, anon, authenticated;

-- A client's feedback also goes on the item as a comment the client can see.
create function public.add_client_feedback(p_client_id uuid, p_entity_type text, p_entity_id uuid, p_body text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.comments (client_id, entity_type, entity_id, body, author_id, author_kind, visible_to_client)
  select p_client_id, p_entity_type, p_entity_id, trim(p_body), auth.uid(), public.actor_kind(), true
  where nullif(trim(p_body), '') is not null and auth.uid() is not null;
$$;

revoke execute on function public.add_client_feedback(uuid, text, uuid, text) from public, anon, authenticated;

create function public.month_label(p_month date)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(to_char(p_month, 'FMMonth YYYY'));
$$;

grant execute on function public.month_label(date) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Content item status (01-auth-and-roles.md, "Content status rules")
-- ---------------------------------------------------------------------------

create function public.set_content_status(p_item_id uuid, p_new_status public.work_status, p_comment text default null)
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
  -- The CEO can make any allowed move.
  if not (role = any (allowed) or role = 'ceo') then
    raise exception 'You can''t make this move.' using errcode = '42501';
  end if;

  if p_new_status = 'in_design' and item.status = 'planned' and mon.plan_status <> 'approved' then
    raise exception 'The client hasn''t approved this month''s calendar yet.' using errcode = 'P0001';
  end if;
  -- Staff deciding for the client must say how the client approved.
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

  -- Tell the account exec when the client acts or the work reaches the client.
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
end;
$$;

revoke execute on function public.set_content_status(uuid, public.work_status, text) from public, anon;
grant execute on function public.set_content_status(uuid, public.work_status, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Starting a month: 20 posts on weekdays spread evenly, 4 stories spread over
-- the month, 2 reels in weeks 2 and 4 (03-accounts.md, "Calendar").
-- ---------------------------------------------------------------------------

-- The post pillars in order: each pillar spread evenly through the month in
-- proportion to its share of the target mix, avoiding repeats where possible
-- and never three in a row.
create function public.post_pillar_order(p_mix jsonb)
returns public.pillar[]
language plpgsql
immutable
set search_path = ''
as $$
declare
  names public.pillar[] := array['showcase', 'educate', 'proof', 'behind_the_scenes', 'engage']::public.pillar[];
  target int[] := array[
    coalesce((p_mix ->> 'showcase')::int, 0), coalesce((p_mix ->> 'educate')::int, 0),
    coalesce((p_mix ->> 'proof')::int, 0), coalesce((p_mix ->> 'behind_the_scenes')::int, 0),
    coalesce((p_mix ->> 'engage')::int, 0)];
  placed int[] := array[0, 0, 0, 0, 0];
  result public.pillar[] := '{}';
  best int;
  best_score numeric;
  score numeric;
  pass int;
  i int;
  n int;
begin
  for n in 1..20 loop
    best := null;
    -- Pass 1 avoids repeating the last pillar; pass 2 allows one repeat.
    for pass in 1..2 loop
      for i in 1..5 loop
        continue when placed[i] >= target[i];
        continue when pass = 1 and n > 1 and result[n - 1] = names[i];
        continue when n > 2 and result[n - 1] = names[i] and result[n - 2] = names[i];
        -- How far behind its even share this pillar is at this point.
        score := n * target[i] / 20.0 - placed[i];
        if best is null or score > best_score then
          best := i;
          best_score := score;
        end if;
      end loop;
      exit when best is not null;
    end loop;
    if best is null then
      -- Only one pillar is left and it just ran twice; take it anyway.
      for i in 1..5 loop
        if placed[i] < target[i] then best := i; exit; end if;
      end loop;
    end if;
    exit when best is null; -- the mix totals less than 20; the clients check stops this
    result := result || names[best];
    placed[best] := placed[best] + 1;
  end loop;
  return result;
end;
$$;

grant execute on function public.post_pillar_order(jsonb) to authenticated, service_role;

create function public.start_month(p_client_id uuid, p_month date)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  cl public.clients;
  month_start date := date_trunc('month', p_month)::date;
  month_end date := (date_trunc('month', p_month) + interval '1 month - 1 day')::date;
  days int;
  weekdays date[];
  wk2 date[];
  wk4 date[];
  pillars public.pillar[];
  story_pillars public.pillar[] := array['engage', 'showcase', 'behind_the_scenes', 'engage']::public.pillar[];
  reel_pillars public.pillar[] := array['educate', 'behind_the_scenes']::public.pillar[];
  new_month uuid;
  i int;
begin
  if public.auth_role() not in ('ceo', 'account_exec') or not public.can_access_client(p_client_id) then
    raise exception 'Only the CEO or this client''s account exec can plan a month.' using errcode = '42501';
  end if;
  select * into cl from public.clients where id = p_client_id;
  if cl.status <> 'active' then
    raise exception 'Months can be planned once the client is active.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.content_months where client_id = p_client_id and month = month_start) then
    raise exception '% is already planned.', public.month_label(month_start) using errcode = '23505';
  end if;

  days := extract(day from month_end)::int;
  select array_agg(d::date order by d) into weekdays
    from generate_series(month_start, month_end, interval '1 day') d where extract(isodow from d) < 6;
  select array_agg(d order by d) into wk2 from unnest(weekdays) d where extract(day from d) between 8 and 14;
  select array_agg(d order by d) into wk4 from unnest(weekdays) d where extract(day from d) between 22 and 28;
  pillars := public.post_pillar_order(cl.pillar_mix);

  insert into public.content_months (client_id, month) values (p_client_id, month_start) returning id into new_month;

  for i in 1..20 loop
    insert into public.content_items (month_id, client_id, slot_code, format, scheduled_date, pillar, platform)
    values (new_month, p_client_id, 'P' || lpad(i::text, 2, '0'), 'post',
            weekdays[1 + floor((i - 1) * cardinality(weekdays) / 20.0)::int], pillars[i], 'both');
  end loop;
  for i in 1..4 loop
    insert into public.content_items (month_id, client_id, slot_code, format, scheduled_date, pillar, platform)
    values (new_month, p_client_id, 'S' || lpad(i::text, 2, '0'), 'story',
            month_start + floor((i - 0.5) * days / 4.0)::int, story_pillars[i], 'instagram');
  end loop;
  insert into public.content_items (month_id, client_id, slot_code, format, scheduled_date, pillar, platform)
  values
    (new_month, p_client_id, 'R01', 'reel', wk2[1 + cardinality(wk2) / 2], reel_pillars[1], 'both'),
    (new_month, p_client_id, 'R02', 'reel', wk4[1 + cardinality(wk4) / 2], reel_pillars[2], 'both');

  perform public.log_status(p_client_id, 'content_month', new_month, null, 'draft', null);
  return new_month;
end;
$$;

revoke execute on function public.start_month(uuid, date) from public, anon;
grant execute on function public.start_month(uuid, date) to authenticated;

-- ---------------------------------------------------------------------------
-- Calendar approval
-- ---------------------------------------------------------------------------

create function public.send_calendar(p_month_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  mon public.content_months;
  missing int;
begin
  select * into mon from public.content_months where id = p_month_id for update;
  if not found or public.auth_role() not in ('ceo', 'account_exec') or not public.can_access_client(mon.client_id) then
    raise exception 'Only the CEO or this client''s account exec can send the calendar.' using errcode = '42501';
  end if;
  if mon.plan_status <> 'draft' then
    raise exception 'This calendar has already been sent.' using errcode = 'P0001';
  end if;
  select count(*) into missing from public.content_items
   where month_id = p_month_id and left(slot_code, 1) <> 'A' and nullif(trim(topic), '') is null;
  if missing > 0 then
    raise exception 'Give every slot a topic before sending (% still empty).', missing using errcode = 'P0001';
  end if;

  update public.content_months set plan_status = 'sent', plan_sent_at = now() where id = p_month_id;
  perform public.log_status(mon.client_id, 'content_month', mon.id, 'draft', 'sent', null);
end;
$$;

revoke execute on function public.send_calendar(uuid) from public, anon;
grant execute on function public.send_calendar(uuid) to authenticated;

-- The client approves the calendar, or sends it back to draft with a note.
create function public.respond_to_calendar(p_month_id uuid, p_approve boolean, p_comment text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  mon public.content_months;
  client_name text;
  ae uuid;
begin
  select * into mon from public.content_months where id = p_month_id for update;
  if not found or public.auth_role() <> 'client' or not public.can_access_client(mon.client_id) then
    raise exception 'Only the client can approve their calendar.' using errcode = '42501';
  end if;
  if mon.plan_status <> 'sent' then
    raise exception 'This calendar isn''t waiting for approval.' using errcode = 'P0001';
  end if;
  if not p_approve and nullif(trim(p_comment), '') is null then
    raise exception 'Tell us what to change.' using errcode = '22023';
  end if;

  if p_approve then
    update public.content_months
       set plan_status = 'approved', plan_approved_at = now(), plan_approved_by = auth.uid()
     where id = p_month_id;
  else
    update public.content_months set plan_status = 'draft', plan_sent_at = null where id = p_month_id;
  end if;
  perform public.log_status(mon.client_id, 'content_month', mon.id, 'sent',
    case when p_approve then 'approved' else 'draft' end, p_comment);
  perform public.add_client_feedback(mon.client_id, 'content_month', mon.id, p_comment);

  select c.name, c.account_exec_id into client_name, ae from public.clients c where c.id = mon.client_id;
  perform public.notify(ae,
    case when p_approve then client_name || ' approved the ' || public.month_label(mon.month) || ' calendar'
         else client_name || ' asked for changes to the ' || public.month_label(mon.month) || ' calendar' end,
    nullif(trim(p_comment), ''),
    '/accounts/clients/' || mon.client_id || '/calendar?month=' || to_char(mon.month, 'YYYY-MM'));
end;
$$;

revoke execute on function public.respond_to_calendar(uuid, boolean, text) from public, anon;
grant execute on function public.respond_to_calendar(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Campaigns
-- ---------------------------------------------------------------------------

-- Creating a campaign also creates its ads: A01 feed, A02 story, A03 test variant.
create function public.create_campaign(p_month_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  mon public.content_months;
  new_campaign uuid;
begin
  select * into mon from public.content_months where id = p_month_id for update;
  if not found or public.auth_role() not in ('ceo', 'account_exec') or not public.can_access_client(mon.client_id) then
    raise exception 'Only the CEO or this client''s account exec can create a campaign.' using errcode = '42501';
  end if;
  if exists (select 1 from public.campaigns where month_id = p_month_id) then
    raise exception 'This month already has a campaign.' using errcode = '23505';
  end if;

  insert into public.campaigns (client_id, month_id, name)
  values (mon.client_id, p_month_id, public.month_label(mon.month) || ' campaign')
  returning id into new_campaign;

  insert into public.content_items (month_id, client_id, slot_code, format, pillar, platform, topic)
  values
    (p_month_id, mon.client_id, 'A01', 'ad_feed', 'campaign', 'both', 'Feed ad · 4:5'),
    (p_month_id, mon.client_id, 'A02', 'ad_story', 'campaign', 'both', 'Story or reel ad · 9:16'),
    (p_month_id, mon.client_id, 'A03', 'ad_variant', 'campaign', 'both', 'Test variant');

  perform public.log_status(mon.client_id, 'campaign', new_campaign, null, 'draft', null);
  return new_campaign;
end;
$$;

revoke execute on function public.create_campaign(uuid) from public, anon;
grant execute on function public.create_campaign(uuid) to authenticated;

-- draft -> sent (account exec) -> approved (client) -> live (account exec, on
-- or after the start date, after the launch checks) -> complete (account exec,
-- with results). The client can send a brief back to draft with a note.
create function public.set_campaign_status(
  p_campaign_id uuid, p_new_status public.campaign_status,
  p_comment text default null, p_launch_checks_done boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  camp public.campaigns;
  role text := public.auth_role();
  move text;
  staff_move boolean;
  client_name text;
  ae uuid;
begin
  select * into camp from public.campaigns where id = p_campaign_id for update;
  if not found or not public.can_access_client(camp.client_id) then
    raise exception 'That campaign doesn''t exist.' using errcode = 'P0002';
  end if;

  move := camp.status::text || '>' || p_new_status::text;
  staff_move := move in ('draft>sent', 'approved>live', 'live>complete');
  if not (staff_move or move in ('sent>approved', 'sent>draft')) then
    raise exception 'A campaign can''t move from % to %.', camp.status, p_new_status using errcode = 'P0001';
  end if;
  if staff_move and role not in ('ceo', 'account_exec') then
    raise exception 'Only the CEO or the account exec can do this.' using errcode = '42501';
  end if;
  if move = 'sent>approved' and role <> 'client' then
    raise exception 'Only the client can approve the campaign brief.' using errcode = '42501';
  end if;
  if move = 'sent>draft' and role not in ('client', 'ceo', 'account_exec') then
    raise exception 'You can''t make this move.' using errcode = '42501';
  end if;

  if move = 'draft>sent' and (nullif(trim(camp.goal), '') is null or nullif(trim(camp.offer), '') is null
      or camp.start_date is null or camp.end_date is null) then
    raise exception 'Fill in the goal, offer, start date and end date before sending.' using errcode = 'P0001';
  end if;
  if move = 'sent>draft' and role = 'client' and nullif(trim(p_comment), '') is null then
    raise exception 'Tell us what to change.' using errcode = '22023';
  end if;
  if move = 'approved>live' then
    if not p_launch_checks_done then
      raise exception 'Confirm the launch checks first.' using errcode = 'P0001';
    end if;
    if camp.start_date > public.today_gaborone() then
      raise exception 'The campaign starts on %. Mark it live on the start date.', to_char(camp.start_date, 'FMDD FMMonth')
        using errcode = 'P0001';
    end if;
  end if;
  if move = 'live>complete' and nullif(trim(camp.results), '') is null then
    raise exception 'Write the results summary before completing the campaign.' using errcode = 'P0001';
  end if;

  update public.campaigns
     set status = p_new_status,
         client_approved_at = case when p_new_status = 'approved' then now() else client_approved_at end
   where id = p_campaign_id;
  perform public.log_status(camp.client_id, 'campaign', camp.id, camp.status::text, p_new_status::text, p_comment);

  if role = 'client' then
    perform public.add_client_feedback(camp.client_id, 'campaign', camp.id, p_comment);
    select c.name, c.account_exec_id into client_name, ae from public.clients c where c.id = camp.client_id;
    perform public.notify(ae,
      case when p_new_status = 'approved' then client_name || ' approved the campaign brief'
           else client_name || ' asked for changes to the campaign brief' end,
      nullif(trim(p_comment), ''),
      '/accounts/clients/' || camp.client_id || '/campaign?month='
        || (select to_char(m.month, 'YYYY-MM') from public.content_months m where m.id = camp.month_id));
  end if;
end;
$$;

revoke execute on function public.set_campaign_status(uuid, public.campaign_status, text, boolean) from public, anon;
grant execute on function public.set_campaign_status(uuid, public.campaign_status, text, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Monthly review
-- ---------------------------------------------------------------------------

-- Locks the month's KPIs, shows the review in the portal and tells the client.
create function public.publish_review(p_month_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  mon public.content_months;
begin
  select * into mon from public.content_months where id = p_month_id for update;
  if not found or public.auth_role() not in ('ceo', 'account_exec') or not public.can_access_client(mon.client_id) then
    raise exception 'Only the CEO or this client''s account exec can publish the review.' using errcode = '42501';
  end if;
  if mon.review_published_at is not null then
    raise exception 'This review is already published.' using errcode = 'P0001';
  end if;
  if nullif(trim(mon.review ->> 'working'), '') is null or nullif(trim(mon.review ->> 'adjust'), '') is null
     or nullif(trim(mon.review ->> 'focus'), '') is null then
    raise exception 'Fill in what worked, what to adjust and next month''s focus first.' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.kpi_months where client_id = mon.client_id and month = mon.month) then
    raise exception 'Enter this month''s KPIs before publishing.' using errcode = 'P0001';
  end if;

  update public.content_months set review_published_at = now() where id = p_month_id;
  update public.kpi_months set locked = true where client_id = mon.client_id and month = mon.month;

  perform public.notify(cu.user_id, 'Your ' || public.month_label(mon.month) || ' review is ready',
    'See how last month went and what''s next.', '/portal/reports')
  from public.client_users cu where cu.client_id = mon.client_id and cu.active;
end;
$$;

revoke execute on function public.publish_review(uuid) from public, anon;
grant execute on function public.publish_review(uuid) to authenticated;

create function public.unpublish_review(p_month_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  mon public.content_months;
begin
  if not public.is_ceo() then
    raise exception 'Only the CEO can unpublish a review.' using errcode = '42501';
  end if;
  select * into mon from public.content_months where id = p_month_id for update;
  if not found or mon.review_published_at is null then
    raise exception 'This review isn''t published.' using errcode = 'P0001';
  end if;
  update public.content_months set review_published_at = null where id = p_month_id;
  update public.kpi_months set locked = false where client_id = mon.client_id and month = mon.month;
end;
$$;

revoke execute on function public.unpublish_review(uuid) from public, anon;
grant execute on function public.unpublish_review(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Activating a client (03-accounts.md, "Onboarding page" step 5). The account
-- exec may move their own client from onboarding to active once the brand kit
-- is approved; the capacity check on clients still applies. The CEO also
-- activates from /admin without this rule.
-- ---------------------------------------------------------------------------

create function public.activate_client(p_client_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  cl public.clients;
begin
  if public.auth_role() not in ('ceo', 'account_exec') or not public.can_access_client(p_client_id) then
    raise exception 'Only the CEO or this client''s account exec can activate the client.' using errcode = '42501';
  end if;
  select * into cl from public.clients where id = p_client_id for update;
  if cl.status <> 'onboarding' then
    raise exception 'Only a client in onboarding can be activated here.' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.brand_kits k where k.client_id = p_client_id and k.status = 'approved') then
    raise exception 'The client activates once their brand kit is approved.' using errcode = 'P0001';
  end if;
  update public.clients
     set status = 'active', start_date = coalesce(start_date, public.today_gaborone())
   where id = p_client_id;
end;
$$;

revoke execute on function public.activate_client(uuid) from public, anon;
grant execute on function public.activate_client(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Reminder: items waiting in client review for more than 2 working days
-- (Monday to Friday; public holidays aren't counted yet).
-- ---------------------------------------------------------------------------

create function public.working_days_between(p_from timestamptz, p_to timestamptz)
returns int
language sql
stable
set search_path = ''
as $$
  select count(*)::int
  from generate_series(
    (p_from at time zone 'Africa/Gaborone')::date + 1,
    (p_to at time zone 'Africa/Gaborone')::date,
    interval '1 day') d
  where extract(isodow from d) < 6;
$$;

grant execute on function public.working_days_between(timestamptz, timestamptz) to authenticated, service_role;

-- Run each weekday morning by pg_cron. One reminder per item per wait.
create function public.notify_stale_client_reviews()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  sent int := 0;
  r record;
begin
  for r in
    select i.id, i.slot_code, i.topic, i.client_id, c.name as client_name, c.account_exec_id, m.month, e.moved_at
    from public.content_items i
    join public.clients c on c.id = i.client_id
    join public.content_months m on m.id = i.month_id
    cross join lateral (
      select max(se.created_at) as moved_at from public.status_events se
      where se.entity_type = 'content_item' and se.entity_id = i.id and se.to_status = 'client_review'
    ) e
    where i.status = 'client_review' and e.moved_at is not null
      and public.working_days_between(e.moved_at, now()) > 2
  loop
    if not exists (
      select 1 from public.notifications n
      where n.user_id = r.account_exec_id and n.created_at > r.moved_at
        and n.link like '%#' || r.id::text
    ) then
      perform public.notify(r.account_exec_id, r.slot_code || ' has waited over 2 working days',
        r.client_name || ' hasn''t reviewed ' || coalesce(r.topic, r.slot_code) || ' yet. Give them a nudge.',
        '/accounts/clients/' || r.client_id || '/calendar?month=' || to_char(r.month, 'YYYY-MM') || '#' || r.id);
      sent := sent + 1;
    end if;
  end loop;
  return sent;
end;
$$;

revoke execute on function public.notify_stale_client_reviews() from public, anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;

-- 07:00 in Gaborone (05:00 UTC), Monday to Friday.
select cron.schedule('nudge-client-reviews', '0 5 * * 1-5', $$select public.notify_stale_client_reviews()$$);
