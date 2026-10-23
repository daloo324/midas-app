-- Phase 2: brand briefs, questionnaire links, brand kits (status only for now)
-- and the private briefs bucket. See 02-data-model.md and 03-accounts.md.

-- ---------------------------------------------------------------------------
-- Notifications helper: used by triggers and functions, never by users.
-- ---------------------------------------------------------------------------

create function public.notify(p_user_id uuid, p_title text, p_body text, p_link text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, title, body, link)
  select p_user_id, p_title, p_body, p_link
  where p_user_id is not null;
$$;

revoke execute on function public.notify(uuid, text, text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- brand_kits: one per client. Phase 2 needs only the status (activation waits
-- for 'approved'); the kit itself is built in Phase 3.
-- ---------------------------------------------------------------------------

create table public.brand_kits (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references public.clients (id),
  status public.work_status not null default 'planned',
  shown_to_client_at timestamptz,
  signed_off_by text,
  signed_off_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger brand_kits_updated_at before update on public.brand_kits
  for each row execute function public.set_updated_at();

-- Every client has a kit from the start.
create function public.create_brand_kit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.brand_kits (client_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger clients_create_brand_kit after insert on public.clients
  for each row execute function public.create_brand_kit();

insert into public.brand_kits (client_id) select id from public.clients on conflict do nothing;

alter table public.brand_kits enable row level security;

create policy "Staff read brand kits" on public.brand_kits
  for select to authenticated using (public.is_staff() and public.can_access_client(client_id));
create policy "Clients read their brand kit" on public.brand_kits
  for select to authenticated using (public.auth_role() = 'client' and public.can_access_client(client_id));

-- Status moves arrive with set_content_status in Phase 3; nobody writes directly.
grant select on public.brand_kits to authenticated;
grant select, insert, update, delete on public.brand_kits to service_role;

-- ---------------------------------------------------------------------------
-- brand_briefs: the questionnaire answers. Written only by submit_questionnaire.
-- ---------------------------------------------------------------------------

create table public.brand_briefs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references public.clients (id),
  answers jsonb not null default '[]'::jsonb check (jsonb_typeof(answers) = 'array'),
  uploads jsonb not null default '[]'::jsonb check (jsonb_typeof(uploads) = 'array'),
  submitted_at timestamptz,
  design_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger brand_briefs_updated_at before update on public.brand_briefs
  for each row execute function public.set_updated_at();

alter table public.brand_briefs enable row level security;

create policy "Staff read briefs" on public.brand_briefs
  for select to authenticated using (public.is_staff() and public.can_access_client(client_id));
create policy "Clients read their brief" on public.brand_briefs
  for select to authenticated using (public.auth_role() = 'client' and public.can_access_client(client_id));

-- design_notes are written by designers in Phase 3.
grant select on public.brand_briefs to authenticated;
grant select, insert, update, delete on public.brand_briefs to service_role;

-- ---------------------------------------------------------------------------
-- questionnaire_invites: one link per client at a time, valid for 30 days,
-- usable once. The public page reaches them only through the functions below.
-- ---------------------------------------------------------------------------

create table public.questionnaire_invites (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id),
  token text not null unique check (token ~ '^[A-Za-z0-9_-]{32}$'),
  expires_at timestamptz not null default now() + interval '30 days',
  opened_at timestamptz,
  used_at timestamptz,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index questionnaire_invites_client_id_idx on public.questionnaire_invites (client_id, created_at desc);

alter table public.questionnaire_invites enable row level security;

create policy "Staff read questionnaire links" on public.questionnaire_invites
  for select to authenticated using (public.is_staff() and public.can_access_client(client_id));

grant select on public.questionnaire_invites to authenticated;
grant select, insert, update, delete on public.questionnaire_invites to service_role;

-- The CEO or the client's account exec makes a link. Any open link for the
-- client expires at that moment. Returns the new token.
create function public.create_questionnaire_invite(p_client_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_token text;
begin
  if public.auth_role() not in ('ceo', 'account_exec') or not public.can_access_client(p_client_id) then
    raise exception 'Only the CEO or this client''s account exec can make a questionnaire link.'
      using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtext('questionnaire:' || p_client_id::text));

  update public.questionnaire_invites
     set expires_at = now()
   where client_id = p_client_id and used_at is null and expires_at > now();

  new_token := translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/', '-_');
  insert into public.questionnaire_invites (client_id, token, created_by)
  values (p_client_id, new_token, auth.uid());
  return new_token;
end;
$$;

revoke execute on function public.create_questionnaire_invite(uuid) from public, anon;
grant execute on function public.create_questionnaire_invite(uuid) to authenticated;

-- The link's state, for the public page: 'open', 'used', 'expired' or
-- 'unknown'. Records when an open link is first opened. The business name
-- and client id are returned only for an open link.
create function public.open_questionnaire(p_token text)
returns table (state text, client_id uuid, business_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv public.questionnaire_invites;
begin
  select * into inv from public.questionnaire_invites i where i.token = p_token;
  if not found then
    return query select 'unknown'::text, null::uuid, null::text;
  elsif inv.used_at is not null then
    return query select 'used'::text, null::uuid, null::text;
  elsif inv.expires_at <= now() then
    return query select 'expired'::text, null::uuid, null::text;
  else
    update public.questionnaire_invites set opened_at = now()
     where id = inv.id and opened_at is null;
    return query
      select 'open'::text, c.id, c.name from public.clients c where c.id = inv.client_id;
  end if;
end;
$$;

revoke execute on function public.open_questionnaire(text) from public;
grant execute on function public.open_questionnaire(text) to anon, authenticated;

-- Where a link's images go: {client_id}/questionnaire/{token}/{file}.
-- True while the link is open and has room for another file (40 per link).
create function public.questionnaire_upload_allowed(p_object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  parts text[] := storage.foldername(p_object_name);
  inv public.questionnaire_invites;
begin
  if array_length(parts, 1) <> 3 or parts[2] <> 'questionnaire' then
    return false;
  end if;
  select * into inv from public.questionnaire_invites i where i.token = parts[3];
  if not found or inv.used_at is not null or inv.expires_at <= now()
     or inv.client_id::text <> parts[1] then
    return false;
  end if;
  return (
    select count(*) < 40 from storage.objects o
    where o.bucket_id = 'briefs' and o.name like parts[1] || '/questionnaire/' || parts[3] || '/%'
  );
end;
$$;

revoke execute on function public.questionnaire_upload_allowed(text) from public;
grant execute on function public.questionnaire_upload_allowed(text) to anon, authenticated;

-- Saves the answers to the client's brief and closes the link. Answers are an
-- array of {section, question, answer}; uploads an array of {path, note,
-- question} whose paths must be this link's own files.
create function public.submit_questionnaire(p_token text, p_answers jsonb, p_uploads jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv public.questionnaire_invites;
  prefix text;
  client_name text;
  ae uuid;
begin
  select * into inv from public.questionnaire_invites i where i.token = p_token for update;
  if not found or inv.used_at is not null or inv.expires_at <= now() then
    raise exception 'This questionnaire link has expired or was already used.' using errcode = 'P0001';
  end if;

  if jsonb_typeof(p_answers) <> 'array' or jsonb_typeof(p_uploads) <> 'array'
     or jsonb_array_length(p_answers) > 200 or jsonb_array_length(p_uploads) > 40 then
    raise exception 'The answers are in the wrong shape.' using errcode = '22023';
  end if;

  prefix := inv.client_id::text || '/questionnaire/' || p_token || '/';
  if exists (
    select 1 from jsonb_array_elements(p_uploads) u
    where not (u ->> 'path') like prefix || '%'
       or not exists (select 1 from storage.objects o where o.bucket_id = 'briefs' and o.name = u ->> 'path')
  ) then
    raise exception 'An uploaded file is missing. Remove it and add it again.' using errcode = 'P0001';
  end if;

  insert into public.brand_briefs (client_id, answers, uploads, submitted_at)
  values (inv.client_id, p_answers, p_uploads, now())
  on conflict (client_id) do update
    set answers = excluded.answers, uploads = excluded.uploads, submitted_at = excluded.submitted_at;

  update public.questionnaire_invites set used_at = now() where id = inv.id;

  select c.name, c.account_exec_id into client_name, ae from public.clients c where c.id = inv.client_id;
  perform public.notify(ae, 'Questionnaire answers arrived', client_name || ' sent their brand questionnaire.',
    '/accounts/clients/' || inv.client_id || '/onboarding');
end;
$$;

revoke execute on function public.submit_questionnaire(text, jsonb, jsonb) from public;
grant execute on function public.submit_questionnaire(text, jsonb, jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- briefs bucket: private. Questionnaire images go in through an open link;
-- staff with client access and the client read them (via signed URLs).
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('briefs', 'briefs', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- The client id at the start of an object path, or null if it isn't one.
create function public.storage_client_id(p_object_name text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
declare
  first text := (storage.foldername(p_object_name))[1];
begin
  if first ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return first::uuid;
  end if;
  return null;
end;
$$;

grant execute on function public.storage_client_id(text) to anon, authenticated, service_role;

create policy "Questionnaire uploads through an open link" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'briefs' and public.questionnaire_upload_allowed(name));

create policy "Staff and the client read brief files" on storage.objects
  for select to authenticated
  using (bucket_id = 'briefs' and public.can_access_client(public.storage_client_id(name)));
