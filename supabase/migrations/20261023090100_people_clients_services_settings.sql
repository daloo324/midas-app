-- People, clients, the service catalogue and settings, with the access helpers
-- from docs/spec/01-auth-and-roles.md. Policies live in this file with the tables.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id),
  full_name text not null check (length(trim(full_name)) > 0),
  email text not null,
  role public.staff_role not null,
  active boolean not null default true,
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  description text,
  unit public.service_unit not null,
  price numeric(12, 2) not null check (price >= 0),
  active boolean not null default true,
  sort int not null default 0,
  is_retainer boolean not null default false,
  inclusions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.settings (
  id int primary key default 1 check (id = 1),
  company_name text not null default 'Midas Media Solutions',
  legal_name text,
  address text,
  email text,
  phone text,
  logo_path text,
  bank_details jsonb not null default '{}'::jsonb,
  payment_terms_days int not null default 7 check (payment_terms_days >= 0),
  vat_registered boolean not null default false,
  vat_number text,
  vat_rate numeric(5, 2) not null default 14 check (vat_rate >= 0),
  max_active_clients int not null default 10 check (max_active_clients >= 0),
  profit_threshold_per_hour numeric(12, 2) not null default 250,
  reminders_enabled boolean not null default true,
  invoice_footer text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Sum of the five content pillars; must be 20 (one per static post slot).
create function public.pillar_mix_total(mix jsonb)
returns int
language sql
immutable
set search_path = ''
as $$
  select coalesce((mix ->> 'showcase')::int, 0)
       + coalesce((mix ->> 'educate')::int, 0)
       + coalesce((mix ->> 'proof')::int, 0)
       + coalesce((mix ->> 'behind_the_scenes')::int, 0)
       + coalesce((mix ->> 'engage')::int, 0);
$$;

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  client_code text not null unique check (client_code ~ '^MM-[A-Z]{3}-[0-9]{4}$'),
  industry text,
  status public.client_status not null default 'onboarding',
  account_exec_id uuid references public.profiles (id),
  service_id uuid references public.services (id),
  monthly_fee numeric(12, 2) check (monthly_fee >= 0),
  start_date date,
  end_date date,
  contact_name text,
  contact_role text,
  contact_email text,
  contact_phone text,
  decision_maker text,
  platforms text[] not null default '{}',
  pillar_mix jsonb not null default
    '{"showcase":6,"educate":5,"proof":3,"behind_the_scenes":3,"engage":3}'::jsonb
    check (public.pillar_mix_total(pillar_mix) = 20),
  main_goal public.goal_category,
  expectation_notes text,
  baseline jsonb not null default '{}'::jsonb,
  notes text,
  reminders_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create index clients_account_exec_id_idx on public.clients (account_exec_id);

create table public.client_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id),
  client_id uuid not null references public.clients (id),
  full_name text not null check (length(trim(full_name)) > 0),
  email text not null,
  login_id text not null unique check (login_id ~ '^MM-[A-Z]{3}-[0-9]{4}(-[0-9]+)?$'),
  is_primary boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index client_users_client_id_idx on public.client_users (client_id);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger services_updated_at before update on public.services
  for each row execute function public.set_updated_at();
create trigger settings_updated_at before update on public.settings
  for each row execute function public.set_updated_at();
create trigger clients_updated_at before update on public.clients
  for each row execute function public.set_updated_at();
create trigger client_users_updated_at before update on public.client_users
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Access helpers (security definer so policies can call them without recursion)
-- ---------------------------------------------------------------------------

-- The current user's role: a staff_role value, 'client', or null (signed out,
-- deactivated, or unknown). Deactivated people get null, so RLS shuts them out
-- even while an old session token is still valid.
create function public.auth_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.role::text from public.profiles p where p.id = auth.uid() and p.active),
    (select 'client' from public.client_users cu where cu.user_id = auth.uid() and cu.active)
  );
$$;

create function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.auth_role() in ('ceo', 'account_exec', 'creative_director', 'designer'), false);
$$;

create function public.is_ceo()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.auth_role() = 'ceo', false);
$$;

-- CEO, creative director and designers: every client. Account exec: clients
-- assigned to them. Client user: their own client only.
create function public.can_access_client(p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case public.auth_role()
    when 'ceo' then true
    when 'creative_director' then true
    when 'designer' then true
    when 'account_exec' then exists (
      select 1 from public.clients c
      where c.id = p_client_id and c.account_exec_id = auth.uid()
    )
    when 'client' then exists (
      select 1 from public.client_users cu
      where cu.user_id = auth.uid() and cu.active and cu.client_id = p_client_id
    )
    else false
  end;
$$;

revoke execute on function public.auth_role() from public, anon;
revoke execute on function public.is_staff() from public, anon;
revoke execute on function public.is_ceo() from public, anon;
revoke execute on function public.can_access_client(uuid) from public, anon;
grant execute on function public.auth_role() to authenticated, service_role;
grant execute on function public.is_staff() to authenticated, service_role;
grant execute on function public.is_ceo() to authenticated, service_role;
grant execute on function public.can_access_client(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Client codes and login IDs
-- ---------------------------------------------------------------------------

-- Three letters from a business name: the first letters of the first three
-- words; for two words, the first two letters of the first word and the first
-- of the second ("Kgosi Coffee" -> KGC); for one word, its first three letters.
-- Letters only, uppercase, padded with X if the name is too short.
create function public.client_code_letters(p_name text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  words text[];
  letters text;
begin
  select array_agg(w) into words
  from (
    select upper(regexp_replace(part, '[^A-Za-z]', '', 'g')) as w
    from regexp_split_to_table(coalesce(p_name, ''), '\s+') with ordinality as t(part, n)
    order by n
  ) s
  where w <> '';

  if words is null then
    letters := '';
  elsif array_length(words, 1) >= 3 then
    letters := left(words[1], 1) || left(words[2], 1) || left(words[3], 1);
  elsif array_length(words, 1) = 2 then
    letters := left(words[1], 2) || left(words[2], 1);
    if length(letters) < 3 then
      letters := left(words[1] || words[2], 3);
    end if;
  else
    letters := left(words[1], 3);
  end if;

  return rpad(letters, 3, 'X');
end;
$$;

-- Gives a new client its MM-XXX-0000 code. Codes are unique and, because
-- clients are never deleted, never reused.
create function public.assign_client_code()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  candidate text;
begin
  if new.client_code is not null then
    new.client_code := upper(trim(new.client_code));
    return new;
  end if;
  loop
    candidate := 'MM-' || public.client_code_letters(new.name) || '-'
      || lpad(floor(random() * 10000)::int::text, 4, '0');
    exit when not exists (select 1 from public.clients where client_code = candidate);
  end loop;
  new.client_code := candidate;
  return new;
end;
$$;

create trigger clients_assign_code before insert on public.clients
  for each row execute function public.assign_client_code();

-- The first login for a client gets the client code as its login ID; later
-- ones get -2, -3 and so on.
create function public.assign_login_id()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  code text;
  existing int;
begin
  perform pg_advisory_xact_lock(hashtext('client_users:' || new.client_id::text));
  select client_code into code from public.clients where id = new.client_id;
  select count(*) into existing from public.client_users where client_id = new.client_id;
  if new.login_id is null then
    new.login_id := case when existing = 0 then code else code || '-' || (existing + 1) end;
  end if;
  new.login_id := upper(new.login_id);
  if existing = 0 then
    new.is_primary := true;
  end if;
  return new;
end;
$$;

create trigger client_users_assign_login_id before insert on public.client_users
  for each row execute function public.assign_login_id();

-- ---------------------------------------------------------------------------
-- Guards the database enforces whatever the UI does
-- ---------------------------------------------------------------------------

-- Only the CEO assigns account execs, changes status, service, fee or dates.
-- Account execs may edit the profile fields of their own clients.
-- The client code never changes. Activating respects the capacity setting.
create function public.guard_client_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.client_code is distinct from old.client_code then
    raise exception 'A client code never changes.' using errcode = 'P0001';
  end if;

  if not public.is_trusted_caller() and not public.is_ceo() then
    if new.status is distinct from old.status
      or new.account_exec_id is distinct from old.account_exec_id
      or new.service_id is distinct from old.service_id
      or new.monthly_fee is distinct from old.monthly_fee
      or new.start_date is distinct from old.start_date
      or new.end_date is distinct from old.end_date
      or new.reminders_enabled is distinct from old.reminders_enabled then
      raise exception 'Only the CEO can change a client''s status, account exec, service, fee or dates.'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

create trigger clients_guard_update before update on public.clients
  for each row execute function public.guard_client_update();

create function public.check_client_capacity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  cap int;
  active_count int;
begin
  if new.status = 'active' and (tg_op = 'INSERT' or old.status is distinct from 'active') then
    perform pg_advisory_xact_lock(hashtext('clients:capacity'));
    select max_active_clients into cap from public.settings where id = 1;
    select count(*) into active_count from public.clients where status = 'active' and id <> new.id;
    if active_count >= coalesce(cap, 10) then
      raise exception 'You already have % active clients, which is the limit. Pause or end a client, or raise the limit in settings.', active_count
        using errcode = 'P0001', hint = 'capacity';
    end if;
  end if;
  return new;
end;
$$;

create trigger clients_check_capacity before insert or update of status on public.clients
  for each row execute function public.check_client_capacity();

-- There must always be at least one active CEO.
create function public.guard_last_ceo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.role = 'ceo' and old.active and (new.role <> 'ceo' or not new.active) then
    if not exists (
      select 1 from public.profiles
      where role = 'ceo' and active and id <> old.id
    ) then
      raise exception 'There must be at least one active CEO.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_guard_last_ceo before update on public.profiles
  for each row execute function public.guard_last_ceo();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.settings enable row level security;
alter table public.clients enable row level security;
alter table public.client_users enable row level security;

-- Nothing here is readable without signing in.
revoke all on public.profiles, public.services, public.settings, public.clients, public.client_users from anon;

-- profiles: staff see the team (names on work); the CEO changes roles and
-- deactivates. New profiles are created by the invite flow (service role).
create policy "Staff read the team" on public.profiles
  for select to authenticated using (public.is_staff());
create policy "CEO updates staff" on public.profiles
  for update to authenticated using (public.is_ceo()) with check (public.is_ceo());

-- Staff can change only these profile columns; everything else is fixed.
revoke update on public.profiles from authenticated;
grant update (full_name, role, active, avatar_path) on public.profiles to authenticated;

-- services: CEO only (01-auth-and-roles.md).
create policy "CEO reads services" on public.services
  for select to authenticated using (public.is_ceo());
create policy "CEO adds services" on public.services
  for insert to authenticated with check (public.is_ceo());
create policy "CEO updates services" on public.services
  for update to authenticated using (public.is_ceo()) with check (public.is_ceo());

-- settings: CEO only; one row, never inserted or deleted by users.
create policy "CEO reads settings" on public.settings
  for select to authenticated using (public.is_ceo());
create policy "CEO updates settings" on public.settings
  for update to authenticated using (public.is_ceo()) with check (public.is_ceo());

-- clients: staff by client access; clients use the portal_client view instead.
-- Never deleted (records are kept); the CEO ends a client instead.
create policy "Staff read clients they can access" on public.clients
  for select to authenticated using (public.is_staff() and public.can_access_client(id));
create policy "CEO adds clients" on public.clients
  for insert to authenticated with check (public.is_ceo());
create policy "CEO updates any client" on public.clients
  for update to authenticated using (public.is_ceo()) with check (public.is_ceo());
create policy "Account exec updates their clients" on public.clients
  for update to authenticated
  using (public.auth_role() = 'account_exec' and account_exec_id = auth.uid())
  with check (public.auth_role() = 'account_exec' and account_exec_id = auth.uid());

-- client_users: staff with client access read; a client user reads their own
-- row. The CEO or the client's account exec activates and deactivates logins.
-- Logins are created by the server with the service role (it creates the Auth
-- user at the same time).
create policy "Staff read client logins" on public.client_users
  for select to authenticated using (public.is_staff() and public.can_access_client(client_id));
create policy "Client reads own login" on public.client_users
  for select to authenticated using (user_id = auth.uid());
create policy "CEO or account exec updates client logins" on public.client_users
  for update to authenticated
  using (public.auth_role() in ('ceo', 'account_exec') and public.can_access_client(client_id))
  with check (public.auth_role() in ('ceo', 'account_exec') and public.can_access_client(client_id));

revoke update on public.client_users from authenticated;
grant update (full_name, active) on public.client_users to authenticated;

-- ---------------------------------------------------------------------------
-- What a client user may see of their own client record
-- ---------------------------------------------------------------------------

-- Runs with the owner's rights on purpose: clients never read the clients
-- table itself, only these fields of their own record (02-data-model.md).
create view public.portal_client
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
  ae.email as account_exec_email
from public.clients c
left join public.profiles ae on ae.id = c.account_exec_id
where public.can_access_client(c.id);

revoke all on public.portal_client from anon, public;
grant select on public.portal_client to authenticated;

-- ---------------------------------------------------------------------------
-- Rows that always exist
-- ---------------------------------------------------------------------------

insert into public.settings (id) values (1);

insert into public.services (name, description, unit, price, active, sort, is_retainer, inclusions)
values (
  'Brand Launch',
  'Social media retainer for businesses building their brand online.',
  'monthly',
  3250.00,
  true,
  1,
  true,
  '["20 static posts", "4 stories", "2 reels with custom covers", "2 platforms managed", "Content calendar planned a month ahead", "Monthly analytics review", "1 campaign ad set", "48-hour turnaround on requests", "Starter brand kit"]'::jsonb
);
