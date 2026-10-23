-- Phase 3: time tracking, the inspiration board, the suggestion limit, the
-- content bucket, and the board's rules (04-creative.md).

-- ---------------------------------------------------------------------------
-- The weekly board stays locked until the brand kit is approved, and a
-- month's items stay locked until its calendar is approved. When the client
-- asks for changes, the item's designer hears about it too.
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
-- Comments: only the creative director, the account exec or the CEO reply
-- where the client can see it (04-creative.md, "Weekly board").
-- ---------------------------------------------------------------------------

drop policy "Staff add comments" on public.comments;
create policy "Staff add comments" on public.comments
  for insert to authenticated
  with check (
    public.is_staff() and public.can_access_client(client_id)
    and author_id = auth.uid() and author_kind = 'staff'
    and (not visible_to_client or public.auth_role() in ('ceo', 'creative_director', 'account_exec'))
  );

-- ---------------------------------------------------------------------------
-- Designer notes on the brief (a brief row may not exist yet)
-- ---------------------------------------------------------------------------

create function public.save_design_notes(p_client_id uuid, p_notes text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.auth_role() not in ('ceo', 'creative_director', 'designer') or not public.can_access_client(p_client_id) then
    raise exception 'Only the creative team writes designer notes.' using errcode = '42501';
  end if;
  if length(p_notes) > 10000 then
    raise exception 'Keep the notes under 10,000 characters.' using errcode = '22023';
  end if;
  insert into public.brand_briefs (client_id, design_notes) values (p_client_id, nullif(trim(p_notes), ''))
  on conflict (client_id) do update set design_notes = excluded.design_notes;
end;
$$;

revoke execute on function public.save_design_notes(uuid, text) from public, anon;
grant execute on function public.save_design_notes(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- time_entries: one running timer per person, ever
-- ---------------------------------------------------------------------------

create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  client_id uuid not null references public.clients (id),
  content_item_id uuid references public.content_items (id),
  is_brand_kit boolean not null default false,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  minutes int check (minutes >= 0 and minutes <= 24 * 60),
  manual boolean not null default false,
  note text check (length(note) <= 500),
  last_activity_at timestamptz,
  created_at timestamptz not null default now(),
  check ((content_item_id is not null) <> is_brand_kit),
  check (ended_at is null or ended_at >= started_at),
  check (ended_at is not null or not manual),
  check (ended_at is null or minutes is not null)
);

create unique index time_entries_one_running on public.time_entries (user_id) where ended_at is null;
create index time_entries_client_idx on public.time_entries (client_id, started_at);
create index time_entries_user_idx on public.time_entries (user_id, started_at);

alter table public.time_entries enable row level security;

-- Rows: your own, or everyone's for the CEO and creative director.
-- Others see totals through the report functions below.
create policy "People read their time; CEO and creative director read all" on public.time_entries
  for select to authenticated
  using (user_id = auth.uid() or public.auth_role() in ('ceo', 'creative_director'));

grant select on public.time_entries to authenticated;
grant select, insert, update, delete on public.time_entries to service_role;

create function public.stop_running_timer(p_user uuid, p_at timestamptz)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.time_entries
     set ended_at = greatest(p_at, started_at),
         minutes = least(24 * 60, ceil(extract(epoch from (greatest(p_at, started_at) - started_at)) / 60.0)::int)
   where user_id = p_user and ended_at is null;
$$;

revoke execute on function public.stop_running_timer(uuid, timestamptz) from public, anon, authenticated;

-- Starts a timer on an item or on a client's brand kit. Any other running
-- timer for this person stops first. Starting on a planned item moves it to
-- in_design (which checks the kit and calendar are approved).
create function public.start_timer(p_item_id uuid default null, p_kit_client_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  role text := public.auth_role();
  cid uuid;
  st public.work_status;
  new_id uuid;
begin
  if role not in ('ceo', 'creative_director', 'designer') then
    raise exception 'Only the creative team tracks time.' using errcode = '42501';
  end if;
  if (p_item_id is null) = (p_kit_client_id is null) then
    raise exception 'Choose an item or a brand kit.' using errcode = '22023';
  end if;
  if p_item_id is not null then
    select i.client_id, i.status into cid, st from public.content_items i where i.id = p_item_id;
  else
    cid := p_kit_client_id;
  end if;
  if cid is null or not public.can_access_client(cid) then
    raise exception 'That doesn''t exist.' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(hashtext('timer:' || auth.uid()::text));
  perform public.stop_running_timer(auth.uid(), now());
  if st = 'planned' then
    perform public.set_content_status(p_item_id, 'in_design', 'Timer started');
  elsif p_kit_client_id is not null
    and exists (select 1 from public.brand_kits k where k.client_id = p_kit_client_id and k.status = 'planned') then
    perform public.set_brand_kit_status(p_kit_client_id, 'in_design', 'Timer started');
  end if;
  insert into public.time_entries (user_id, client_id, content_item_id, is_brand_kit, last_activity_at)
  values (auth.uid(), cid, p_item_id, p_kit_client_id is not null, now())
  returning id into new_id;
  return new_id;
end;
$$;

-- Stops your running timer, now or at an earlier time (the "Still working on
-- this?" prompt stops it at the last activity).
create function public.stop_timer(p_at timestamptz default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.time_entries;
begin
  select * into t from public.time_entries where user_id = auth.uid() and ended_at is null;
  if not found then
    return;
  end if;
  if p_at is not null and (p_at < t.started_at or p_at > now()) then
    raise exception 'Choose a time between the start and now.' using errcode = '22023';
  end if;
  perform public.stop_running_timer(auth.uid(), coalesce(p_at, now()));
end;
$$;

create function public.add_manual_time(p_minutes int, p_note text, p_item_id uuid default null, p_kit_client_id uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  cid uuid;
begin
  if public.auth_role() not in ('ceo', 'creative_director', 'designer') then
    raise exception 'Only the creative team tracks time.' using errcode = '42501';
  end if;
  if (p_item_id is null) = (p_kit_client_id is null) then
    raise exception 'Choose an item or a brand kit.' using errcode = '22023';
  end if;
  if p_minutes is null or p_minutes < 1 or p_minutes > 12 * 60 then
    raise exception 'Enter between 1 minute and 12 hours.' using errcode = '22023';
  end if;
  if nullif(trim(p_note), '') is null then
    raise exception 'Add a note saying what the time was for.' using errcode = '22023';
  end if;
  cid := coalesce(p_kit_client_id, (select i.client_id from public.content_items i where i.id = p_item_id));
  if cid is null or not public.can_access_client(cid) then
    raise exception 'That doesn''t exist.' using errcode = 'P0002';
  end if;
  insert into public.time_entries (user_id, client_id, content_item_id, is_brand_kit, started_at, ended_at, minutes, manual, note)
  values (auth.uid(), cid, p_item_id, p_kit_client_id is not null, now() - make_interval(mins => p_minutes), now(), p_minutes, true, trim(p_note));
end;
$$;

revoke execute on function public.start_timer(uuid, uuid) from public, anon;
revoke execute on function public.stop_timer(timestamptz) from public, anon;
revoke execute on function public.add_manual_time(int, text, uuid, uuid) from public, anon;
grant execute on function public.start_timer(uuid, uuid) to authenticated;
grant execute on function public.stop_timer(timestamptz) to authenticated;
grant execute on function public.add_manual_time(int, text, uuid, uuid) to authenticated;

-- Saving anything on the item you're timing counts as activity.
create function public.note_timer_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null then
    update public.time_entries set last_activity_at = now()
     where user_id = auth.uid() and ended_at is null
       and ((tg_table_name = 'content_items' and content_item_id = new.id)
         or (tg_table_name = 'brand_kits' and is_brand_kit and client_id = new.client_id));
  end if;
  return new;
end;
$$;

create trigger content_items_timer_activity after update on public.content_items
  for each row execute function public.note_timer_activity();
create trigger brand_kits_timer_activity after update on public.brand_kits
  for each row execute function public.note_timer_activity();

-- Minutes, including a running timer up to now.
create function public.entry_minutes(t public.time_entries)
returns int
language sql
stable
set search_path = ''
as $$
  select coalesce(t.minutes, ceil(extract(epoch from (now() - t.started_at)) / 60.0)::int);
$$;

-- A client's time this month: totals per item and person, for any staff
-- member who can see the client (designers see others' totals, not rows).
create function public.client_time(p_client_id uuid, p_month date)
returns table (content_item_id uuid, is_brand_kit boolean, user_id uuid, minutes bigint, manual_minutes bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select t.content_item_id, t.is_brand_kit, t.user_id,
         sum(public.entry_minutes(t))::bigint,
         sum(case when t.manual then t.minutes else 0 end)::bigint
  from public.time_entries t
  where public.is_staff() and public.can_access_client(p_client_id)
    and t.client_id = p_client_id
    and (t.is_brand_kit
      or (t.started_at at time zone 'Africa/Gaborone')::date >= p_month
         and (t.started_at at time zone 'Africa/Gaborone')::date < (p_month + interval '1 month')::date)
  group by t.content_item_id, t.is_brand_kit, t.user_id;
$$;

-- Team time this month: everyone for the CEO and creative director, your own
-- for a designer.
create function public.team_time(p_month date)
returns table (user_id uuid, client_id uuid, minutes bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select t.user_id, t.client_id, sum(public.entry_minutes(t))::bigint
  from public.time_entries t
  where (public.auth_role() in ('ceo', 'creative_director') or (public.auth_role() = 'designer' and t.user_id = auth.uid()))
    and (t.started_at at time zone 'Africa/Gaborone')::date >= p_month
    and (t.started_at at time zone 'Africa/Gaborone')::date < (p_month + interval '1 month')::date
  group by t.user_id, t.client_id;
$$;

revoke execute on function public.client_time(uuid, date) from public, anon;
revoke execute on function public.team_time(date) from public, anon;
grant execute on function public.client_time(uuid, date) to authenticated;
grant execute on function public.team_time(date) to authenticated;
grant execute on function public.entry_minutes(public.time_entries) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- inspiration: the shared board (staff only)
-- ---------------------------------------------------------------------------

create table public.inspiration (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  note text check (length(note) <= 500),
  tags text[] not null default '{}' check (
    tags <@ array['Post', 'Story', 'Reel', 'Ad', 'Typography', 'Colour', 'Layout', 'Photography', 'Illustration']
  ),
  client_id uuid references public.clients (id),
  uploaded_by uuid not null references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now()
);

create index inspiration_created_idx on public.inspiration (created_at desc);

alter table public.inspiration enable row level security;

create policy "Staff read inspiration" on public.inspiration
  for select to authenticated using (public.is_staff());
create policy "Creative team adds inspiration" on public.inspiration
  for insert to authenticated
  with check (
    public.auth_role() in ('ceo', 'creative_director', 'designer') and uploaded_by = auth.uid()
    and (client_id is null or public.can_access_client(client_id))
  );
create policy "Uploader edits their inspiration" on public.inspiration
  for update to authenticated
  using (uploaded_by = auth.uid() or public.auth_role() in ('ceo', 'creative_director'))
  with check (uploaded_by = auth.uid() or public.auth_role() in ('ceo', 'creative_director'));
create policy "Uploader or creative director deletes inspiration" on public.inspiration
  for delete to authenticated
  using (uploaded_by = auth.uid() or public.auth_role() in ('ceo', 'creative_director'));

grant select, delete on public.inspiration to authenticated;
grant insert (storage_path, note, tags, client_id, uploaded_by) on public.inspiration to authenticated;
grant update (note, tags, client_id) on public.inspiration to authenticated;
grant select, insert, update, delete on public.inspiration to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('inspiration', 'inspiration', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "Inspiration files: staff read" on storage.objects
  for select to authenticated using (bucket_id = 'inspiration' and public.is_staff());
create policy "Inspiration files: creative team uploads" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'inspiration' and public.auth_role() in ('ceo', 'creative_director', 'designer'));
create policy "Inspiration files: uploader or creative director deletes" on storage.objects
  for delete to authenticated
  using (bucket_id = 'inspiration' and (owner_id = auth.uid()::text or public.auth_role() in ('ceo', 'creative_director')));

-- ---------------------------------------------------------------------------
-- content bucket: {client_id}/{YYYY-MM}/{slot}/{file}. Final files and the
-- client's preview images. Clients read an item's files once it's been shown.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit)
values ('content', 'content', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

create function public.content_object_item(p_name text)
returns public.content_items
language sql
stable
security definer
set search_path = ''
as $$
  select i.* from public.content_items i
  join public.content_months m on m.id = i.month_id
  where i.client_id = public.storage_client_id(p_name)
    and to_char(m.month, 'YYYY-MM') = (storage.foldername(p_name))[2]
    and i.slot_code = (storage.foldername(p_name))[3];
$$;

create function public.content_object_readable(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when public.is_staff() then public.can_access_client(public.storage_client_id(p_name))
    when public.auth_role() = 'client' then
      public.can_access_client(public.storage_client_id(p_name))
      and (public.content_object_item(p_name)).shown_to_client_at is not null
    else false
  end;
$$;

create function public.content_object_writable(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.auth_role() in ('ceo', 'creative_director', 'designer')
     and array_length(storage.foldername(p_name), 1) = 3
     and (public.content_object_item(p_name)).id is not null
     and public.can_access_client(public.storage_client_id(p_name));
$$;

revoke execute on function public.content_object_item(text) from public, anon, authenticated;
revoke execute on function public.content_object_readable(text) from public, anon;
revoke execute on function public.content_object_writable(text) from public, anon;
grant execute on function public.content_object_readable(text) to authenticated;
grant execute on function public.content_object_writable(text) to authenticated;

create policy "Content files: read" on storage.objects
  for select to authenticated using (bucket_id = 'content' and public.content_object_readable(name));
create policy "Content files: upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'content' and public.content_object_writable(name));
create policy "Content files: replace" on storage.objects
  for update to authenticated
  using (bucket_id = 'content' and public.content_object_writable(name))
  with check (bucket_id = 'content' and public.content_object_writable(name));
create policy "Content files: remove" on storage.objects
  for delete to authenticated using (bucket_id = 'content' and public.content_object_writable(name));

-- ---------------------------------------------------------------------------
-- Claude suggestions: 30 calls per person per day (Gaborone time)
-- ---------------------------------------------------------------------------

create table public.suggestion_calls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  client_id uuid not null references public.clients (id),
  items int not null check (items between 1 and 40),
  created_at timestamptz not null default now()
);

create index suggestion_calls_user_idx on public.suggestion_calls (user_id, created_at);

alter table public.suggestion_calls enable row level security;
create policy "People read their suggestion calls" on public.suggestion_calls
  for select to authenticated using (user_id = auth.uid());
grant select on public.suggestion_calls to authenticated;
grant select, insert, update, delete on public.suggestion_calls to service_role;

-- Records a call if the limit allows; returns how many are left today.
create function public.claim_suggestion_call(p_client_id uuid, p_items int)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  used int;
begin
  if public.auth_role() not in ('ceo', 'creative_director', 'designer') or not public.can_access_client(p_client_id) then
    raise exception 'Only the creative team uses suggestions.' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtext('suggest:' || auth.uid()::text));
  select count(*) into used from public.suggestion_calls
   where user_id = auth.uid() and (created_at at time zone 'Africa/Gaborone')::date = public.today_gaborone();
  if used >= 30 then
    raise exception 'You''ve used today''s 30 suggestions. They reset at midnight.' using errcode = 'P0001';
  end if;
  insert into public.suggestion_calls (user_id, client_id, items) values (auth.uid(), p_client_id, p_items);
  return 29 - used;
end;
$$;

revoke execute on function public.claim_suggestion_call(uuid, int) from public, anon;
grant execute on function public.claim_suggestion_call(uuid, int) to authenticated;

-- Which design fields Claude filled and nobody has edited since. Cleared
-- field by field as people edit (see the trigger below).
alter table public.content_items add column suggested_fields text[] not null default '{}'
  check (suggested_fields <@ array['visual', 'graphic_copy', 'caption', 'hashtags']);

create function public.clear_suggested_marks()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- A person edited a suggested field: it's theirs now.
  if not public.is_trusted_caller() and new.suggested_fields is not distinct from old.suggested_fields then
    new.suggested_fields := array(
      select f from unnest(old.suggested_fields) f
      where not (
        (f = 'visual' and new.visual is distinct from old.visual)
        or (f = 'graphic_copy' and new.graphic_copy is distinct from old.graphic_copy)
        or (f = 'caption' and new.caption is distinct from old.caption)
        or (f = 'hashtags' and new.hashtags is distinct from old.hashtags)
      )
    );
  end if;
  return new;
end;
$$;

create trigger content_items_clear_suggested before update on public.content_items
  for each row execute function public.clear_suggested_marks();

-- Fills only empty design fields, and marks which it filled. Called by the
-- server after Claude replies (as the signed-in user).
create function public.apply_suggestions(p_item_id uuid, p_visual text, p_graphic_copy text, p_caption text, p_hashtags text)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  item public.content_items;
  filled text[] := '{}';
begin
  if public.auth_role() not in ('ceo', 'creative_director', 'designer') then
    raise exception 'Only the creative team uses suggestions.' using errcode = '42501';
  end if;
  select * into item from public.content_items where id = p_item_id for update;
  if not found or not public.can_access_client(item.client_id) then
    raise exception 'That item doesn''t exist.' using errcode = 'P0002';
  end if;
  if nullif(trim(item.visual), '') is null and nullif(trim(p_visual), '') is not null then filled := filled || 'visual'::text; end if;
  if nullif(trim(item.graphic_copy), '') is null and nullif(trim(p_graphic_copy), '') is not null then filled := filled || 'graphic_copy'::text; end if;
  if nullif(trim(item.caption), '') is null and nullif(trim(p_caption), '') is not null then filled := filled || 'caption'::text; end if;
  if nullif(trim(item.hashtags), '') is null and nullif(trim(p_hashtags), '') is not null then filled := filled || 'hashtags'::text; end if;
  if cardinality(filled) = 0 then
    return filled;
  end if;
  update public.content_items
     set visual = case when 'visual' = any (filled) then trim(p_visual) else visual end,
         graphic_copy = case when 'graphic_copy' = any (filled) then trim(p_graphic_copy) else graphic_copy end,
         caption = case when 'caption' = any (filled) then trim(p_caption) else caption end,
         hashtags = case when 'hashtags' = any (filled) then trim(p_hashtags) else hashtags end,
         suggested_fields = array(select distinct unnest(suggested_fields || filled))
   where id = p_item_id;
  return filled;
end;
$$;

revoke execute on function public.apply_suggestions(uuid, text, text, text, text) from public, anon;
grant execute on function public.apply_suggestions(uuid, text, text, text, text) to authenticated;
