-- Client sign-in attempts, for the rate limit in 01-auth-and-roles.md:
-- 5 failed attempts per login ID within 15 minutes lock that ID for 15 minutes.
-- Service role only: RLS is on and there are no policies for any user role.

create table public.login_attempts (
  id uuid primary key default gen_random_uuid(),
  login_id text not null,
  succeeded boolean not null,
  ip text,
  created_at timestamptz not null default now()
);

create index login_attempts_login_id_created_at_idx on public.login_attempts (login_id, created_at desc);

alter table public.login_attempts enable row level security;
revoke all on public.login_attempts from anon, authenticated;

-- True while the login ID is locked: some failure in the last 15 minutes was
-- at least the fifth failure within 15 minutes, counting only failures since
-- the last successful sign-in.
create function public.client_login_locked(p_login_id text)
returns boolean
language sql
stable
set search_path = ''
as $$
  with last_ok as (
    select max(created_at) as at
    from public.login_attempts
    where login_id = p_login_id and succeeded
  ),
  failures as (
    select a.created_at
    from public.login_attempts a, last_ok
    where a.login_id = p_login_id
      and not a.succeeded
      and a.created_at > now() - interval '30 minutes'
      and a.created_at > coalesce(last_ok.at, '-infinity'::timestamptz)
  )
  select exists (
    select 1
    from failures f1
    where f1.created_at > now() - interval '15 minutes'
      and (
        select count(*) from failures f2
        where f2.created_at > f1.created_at - interval '15 minutes'
          and f2.created_at <= f1.created_at
      ) >= 5
  );
$$;

revoke execute on function public.client_login_locked(text) from public, anon, authenticated;
grant execute on function public.client_login_locked(text) to service_role;
