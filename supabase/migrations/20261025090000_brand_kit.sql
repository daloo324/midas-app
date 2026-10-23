-- Phase 3: the brand kit (04-creative.md, "Brand kit"; 02-data-model.md).
-- The kit's fields, its files, the brand-kits bucket, and the status moves
-- up to the client's sign-off.

-- ---------------------------------------------------------------------------
-- brand_kits: the kit's own fields
-- ---------------------------------------------------------------------------

create function public.valid_kit_colors(c jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(c) = 'object'
     and c - array['primary', 'secondary', 'tertiary', 'accent'] = '{}'::jsonb
     and not exists (select 1 from jsonb_each_text(c) e where e.value !~ '^#[0-9A-Fa-f]{6}$');
$$;

alter table public.brand_kits
  add column colors jsonb not null default '{}'::jsonb check (public.valid_kit_colors(colors)),
  add column heading_font text check (length(heading_font) <= 80),
  add column body_font text check (length(body_font) <= 80),
  add column voice text check (length(voice) <= 5000),
  add column guide_checks jsonb not null default '{}'::jsonb check (
    jsonb_typeof(guide_checks) = 'object'
    and guide_checks - array['sheet', 'clear_space', 'min_size', 'do_dont', 'pairings', 'extras'] = '{}'::jsonb
  ),
  add column assigned_designer_id uuid references public.profiles (id);

-- The creative team edits the kit's fields; status and sign-off change only
-- through set_brand_kit_status.
create function public.guard_brand_kit_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_trusted_caller() then
    return new;
  end if;
  if new.status is distinct from old.status
     or new.shown_to_client_at is distinct from old.shown_to_client_at
     or new.signed_off_by is distinct from old.signed_off_by
     or new.signed_off_at is distinct from old.signed_off_at
     or new.client_id is distinct from old.client_id then
    raise exception 'Use the status buttons to move the brand kit.' using errcode = '42501';
  end if;
  if exists (select 1 from jsonb_each(new.guide_checks) e where jsonb_typeof(e.value) <> 'boolean') then
    raise exception 'Guide checks are ticked or unticked.' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger brand_kits_guard_update before update on public.brand_kits
  for each row execute function public.guard_brand_kit_update();

create policy "Creative team updates brand kits" on public.brand_kits
  for update to authenticated
  using (public.auth_role() in ('ceo', 'creative_director', 'designer') and public.can_access_client(client_id))
  with check (public.auth_role() in ('ceo', 'creative_director', 'designer') and public.can_access_client(client_id));

grant update (colors, heading_font, body_font, voice, guide_checks, assigned_designer_id) on public.brand_kits to authenticated;

-- ---------------------------------------------------------------------------
-- brand_kit_files: one file per fixed slot, any number of extras
-- ---------------------------------------------------------------------------

create function public.valid_kit_slot(p_slot text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(p_slot ~ '^((logo|icon)_(full|black|white)_(svg|png|pdf)|font_(heading|body)_(400|500|600|700)|guide_pdf|extra)$', false);
$$;

-- Each slot accepts only its own file types (by extension).
create function public.kit_slot_accepts(p_slot text, p_file_name text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when not public.valid_kit_slot(p_slot) then false
    when p_slot ~ '^(logo|icon)_' then lower(p_file_name) like '%.' || split_part(p_slot, '_', 3)
    when p_slot like 'font_%' then lower(p_file_name) ~ '\.(ttf|otf|woff|woff2)$'
    when p_slot = 'guide_pdf' then lower(p_file_name) like '%.pdf'
    when p_slot = 'extra' then lower(p_file_name) ~ '\.(svg|png|jpg|jpeg|pdf)$'
    else false
  end;
$$;

grant execute on function public.valid_kit_slot(text) to anon, authenticated, service_role;
grant execute on function public.kit_slot_accepts(text, text) to anon, authenticated, service_role;

create table public.brand_kit_files (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id),
  slot text not null check (public.valid_kit_slot(slot)),
  storage_path text not null unique,
  file_name text not null check (length(file_name) between 1 and 200),
  size_bytes bigint not null check (size_bytes >= 0 and size_bytes <= 52428800),
  mime_type text,
  uploaded_by uuid references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now(),
  check (public.kit_slot_accepts(slot, file_name)),
  check (storage_path like client_id::text || '/' || slot || '/%')
);

create unique index brand_kit_files_one_per_slot on public.brand_kit_files (client_id, slot) where slot <> 'extra';
create index brand_kit_files_client_id_idx on public.brand_kit_files (client_id);

alter table public.brand_kit_files enable row level security;

create policy "Staff read brand kit files" on public.brand_kit_files
  for select to authenticated using (public.is_staff() and public.can_access_client(client_id));
-- Clients see their kit's files only once they've signed it off.
create policy "Clients read signed-off brand kit files" on public.brand_kit_files
  for select to authenticated
  using (
    public.auth_role() = 'client' and public.can_access_client(client_id)
    and exists (select 1 from public.brand_kits k where k.client_id = brand_kit_files.client_id and k.status = 'approved')
  );
create policy "Creative team adds brand kit files" on public.brand_kit_files
  for insert to authenticated
  with check (
    public.auth_role() in ('ceo', 'creative_director', 'designer') and public.can_access_client(client_id)
    and uploaded_by = auth.uid()
  );
create policy "Creative team removes brand kit files" on public.brand_kit_files
  for delete to authenticated
  using (public.auth_role() in ('ceo', 'creative_director', 'designer') and public.can_access_client(client_id));

grant select, delete on public.brand_kit_files to authenticated;
grant insert (client_id, slot, storage_path, file_name, size_bytes, mime_type, uploaded_by) on public.brand_kit_files to authenticated;
grant select, insert, update, delete on public.brand_kit_files to service_role;

-- Items ready, out of 25: 9 logo files, 9 icon files, 4 colours, at least
-- one weight for each font role, and the guide (02-data-model.md).
create function public.brand_kit_progress(p_client_id uuid)
returns int
language sql
stable
set search_path = ''
as $$
  select
    (select count(*)::int from public.brand_kit_files f where f.client_id = p_client_id and f.slot ~ '^(logo|icon)_')
    + coalesce((select (select count(*) from jsonb_object_keys(k.colors))::int from public.brand_kits k where k.client_id = p_client_id), 0)
    + (select count(distinct split_part(f.slot, '_', 2))::int from public.brand_kit_files f where f.client_id = p_client_id and f.slot like 'font_%')
    + (select count(*)::int from public.brand_kit_files f where f.client_id = p_client_id and f.slot = 'guide_pdf');
$$;

grant execute on function public.brand_kit_progress(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- brand-kits bucket: {client_id}/{slot}/{file}
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit)
values ('brand-kits', 'brand-kits', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

create function public.kit_object_writable(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.auth_role() in ('ceo', 'creative_director', 'designer')
     and public.can_access_client(public.storage_client_id(p_name))
     and public.kit_slot_accepts((storage.foldername(p_name))[2], storage.filename(p_name))
     and array_length(storage.foldername(p_name), 1) = 2;
$$;

create function public.kit_object_readable(p_name text)
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
      and exists (select 1 from public.brand_kits k where k.client_id = public.storage_client_id(p_name) and k.status = 'approved')
    else false
  end;
$$;

revoke execute on function public.kit_object_writable(text) from public, anon;
revoke execute on function public.kit_object_readable(text) from public, anon;
grant execute on function public.kit_object_writable(text) to authenticated;
grant execute on function public.kit_object_readable(text) to authenticated;

create policy "Brand kit files: read" on storage.objects
  for select to authenticated using (bucket_id = 'brand-kits' and public.kit_object_readable(name));
create policy "Brand kit files: upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'brand-kits' and public.kit_object_writable(name));
create policy "Brand kit files: replace" on storage.objects
  for update to authenticated
  using (bucket_id = 'brand-kits' and public.kit_object_writable(name))
  with check (bucket_id = 'brand-kits' and public.kit_object_writable(name));
create policy "Brand kit files: remove" on storage.objects
  for delete to authenticated using (bucket_id = 'brand-kits' and public.kit_object_writable(name));

-- ---------------------------------------------------------------------------
-- Brand kit status: the content flow up to the client's sign-off
-- ---------------------------------------------------------------------------

create function public.set_brand_kit_status(
  p_client_id uuid, p_new_status public.work_status,
  p_comment text default null, p_signed_off_by text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  kit public.brand_kits;
  role text := public.auth_role();
  move text;
  allowed text[];
  client_name text;
  ae uuid;
  signer text;
begin
  select * into kit from public.brand_kits where client_id = p_client_id for update;
  if not found or not public.can_access_client(p_client_id) then
    raise exception 'That brand kit doesn''t exist.' using errcode = 'P0002';
  end if;

  move := kit.status::text || '>' || p_new_status::text;
  allowed := case move
    when 'planned>in_design' then array['designer', 'creative_director']
    when 'in_design>internal_review' then array['designer', 'creative_director']
    when 'internal_review>client_review' then array['creative_director']
    when 'internal_review>changes_requested' then array['creative_director']
    when 'client_review>approved' then array['client']
    when 'client_review>changes_requested' then array['client']
    when 'changes_requested>in_design' then array['designer', 'creative_director']
    else array[]::text[]
  end;
  if cardinality(allowed) = 0 then
    raise exception 'The brand kit can''t move from % to %.', replace(kit.status::text, '_', ' '), replace(p_new_status::text, '_', ' ')
      using errcode = 'P0001';
  end if;
  if not (role = any (allowed) or role = 'ceo') then
    raise exception 'You can''t make this move.' using errcode = '42501';
  end if;

  if p_new_status = 'changes_requested' and role = 'client' and nullif(trim(p_comment), '') is null then
    raise exception 'Tell us what to change.' using errcode = '22023';
  end if;
  if p_new_status = 'approved' then
    if role = 'client' then
      select cu.full_name into signer from public.client_users cu where cu.user_id = auth.uid();
    else
      -- The CEO recording a sign-off given another way types who gave it.
      signer := nullif(trim(p_signed_off_by), '');
      if signer is null then
        raise exception 'Type the name and role of the person who signed it off.' using errcode = '22023';
      end if;
    end if;
  end if;

  update public.brand_kits
     set status = p_new_status,
         shown_to_client_at = case when p_new_status = 'client_review' then coalesce(shown_to_client_at, now()) else shown_to_client_at end,
         signed_off_by = case when p_new_status = 'approved' then signer else signed_off_by end,
         signed_off_at = case when p_new_status = 'approved' then now() else signed_off_at end
   where id = kit.id;

  perform public.log_status(p_client_id, 'brand_kit', kit.id, kit.status::text, p_new_status::text, p_comment);
  if kit.status = 'client_review' then
    perform public.add_client_feedback(p_client_id, 'brand_kit', kit.id, p_comment);
  end if;

  select c.name, c.account_exec_id into client_name, ae from public.clients c where c.id = p_client_id;
  if p_new_status = 'client_review' then
    perform public.notify(ae, client_name || '''s brand kit is with the client',
      'The creative director sent the brand kit for sign-off.', '/accounts/clients/' || p_client_id || '/onboarding');
  elsif p_new_status = 'approved' then
    perform public.notify(ae, client_name || ' signed off their brand kit',
      'You can activate the client now.', '/accounts/clients/' || p_client_id || '/onboarding');
  elsif kit.status = 'client_review' and p_new_status = 'changes_requested' then
    perform public.notify(n.uid, client_name || ' asked for changes to the brand kit', nullif(trim(p_comment), ''),
      '/creative/clients/' || p_client_id || '/kit')
    from (select ae as uid union select kit.assigned_designer_id) n;
  end if;
end;
$$;

revoke execute on function public.set_brand_kit_status(uuid, public.work_status, text, text) from public, anon;
grant execute on function public.set_brand_kit_status(uuid, public.work_status, text, text) to authenticated;
