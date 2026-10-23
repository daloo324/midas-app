-- client_code and login_id are always assigned by triggers. Give them an empty
-- default so callers (and the generated types) don't have to supply them; the
-- triggers replace the empty value before the format checks run.

alter table public.clients alter column client_code set default '';
alter table public.client_users alter column login_id set default '';

create or replace function public.assign_client_code()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  candidate text;
begin
  if coalesce(new.client_code, '') <> '' then
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

create or replace function public.assign_login_id()
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
  if coalesce(new.login_id, '') = '' then
    new.login_id := case when existing = 0 then code else code || '-' || (existing + 1) end;
  end if;
  new.login_id := upper(new.login_id);
  if existing = 0 then
    new.is_primary := true;
  end if;
  return new;
end;
$$;
