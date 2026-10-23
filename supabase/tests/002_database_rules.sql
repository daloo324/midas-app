-- Rules the database enforces on its own: client codes, login IDs, capacity,
-- the last CEO, and the client sign-in lockout.

begin;
create extension if not exists pgtap with schema extensions;
select plan(32);

-- ---------------------------------------------------------------------------
-- Client code letters (01-auth-and-roles.md)
-- ---------------------------------------------------------------------------

select is(public.client_code_letters('Kgosi Coffee'), 'KGC', 'Two words: two letters, then one (Kgosi Coffee -> KGC)');
select is(public.client_code_letters('Sample Coffee Co'), 'SCC', 'Three words: first letters');
select is(public.client_code_letters('Mma Ramotswe Detective Agency'), 'MRD', 'More words: first three only');
select is(public.client_code_letters('Nandos'), 'NAN', 'One word: first three letters');
select is(public.client_code_letters('3 Brothers & Co.'), 'BRC', 'Digits and symbols are dropped');
select is(public.client_code_letters('a b'), 'ABX', 'Too few letters are padded with X');
select is(public.client_code_letters('kgosi  coffee'), 'KGC', 'Uppercase, extra spaces ignored');

-- ---------------------------------------------------------------------------
-- Codes and login IDs are assigned by the database
-- ---------------------------------------------------------------------------

insert into auth.users (id, email, aud, role) values
  ('e0000000-0000-4000-8000-000000000001', 'r.ceo@example.com', 'authenticated', 'authenticated'),
  ('e0000000-0000-4000-8000-000000000002', 'r.ae@example.com', 'authenticated', 'authenticated'),
  ('e0000000-0000-4000-8000-000000000011', 'r.c1@example.com', 'authenticated', 'authenticated'),
  ('e0000000-0000-4000-8000-000000000012', 'r.c2@example.com', 'authenticated', 'authenticated');
insert into public.profiles (id, full_name, email, role) values
  ('e0000000-0000-4000-8000-000000000001', 'Rules CEO', 'r.ceo@example.com', 'ceo'),
  ('e0000000-0000-4000-8000-000000000002', 'Rules AE', 'r.ae@example.com', 'account_exec');
insert into public.clients (id, name, account_exec_id) values
  ('f0000000-0000-4000-8000-000000000001', 'Kgosi Coffee', 'e0000000-0000-4000-8000-000000000002');

select matches(
  (select client_code from public.clients where id = 'f0000000-0000-4000-8000-000000000001'),
  '^MM-KGC-[0-9]{4}$', 'A new client gets an MM-KGC-0000 style code');
select is((select status::text from public.clients where id = 'f0000000-0000-4000-8000-000000000001'), 'onboarding',
  'A new client starts in onboarding');
select throws_ok(
  $$ update public.clients set client_code = 'MM-ABC-1234' where id = 'f0000000-0000-4000-8000-000000000001' $$,
  'P0001', 'A client code never changes.', 'Client codes cannot be changed');
select throws_ok(
  $$ insert into public.clients (name, client_code) values ('Duplicate', 'MM-SCC-1001') $$,
  '23505', null, 'Client codes are unique');

insert into public.client_users (user_id, client_id, full_name, email) values
  ('e0000000-0000-4000-8000-000000000011', 'f0000000-0000-4000-8000-000000000001', 'First Contact', 'r.c1@example.com');
insert into public.client_users (user_id, client_id, full_name, email) values
  ('e0000000-0000-4000-8000-000000000012', 'f0000000-0000-4000-8000-000000000001', 'Second Contact', 'r.c2@example.com');

select is(
  (select login_id from public.client_users where user_id = 'e0000000-0000-4000-8000-000000000011'),
  (select client_code from public.clients where id = 'f0000000-0000-4000-8000-000000000001'),
  'The first login ID equals the client ID');
select is(
  (select login_id from public.client_users where user_id = 'e0000000-0000-4000-8000-000000000012'),
  (select client_code || '-2' from public.clients where id = 'f0000000-0000-4000-8000-000000000001'),
  'The second login ID gets a -2 suffix');
select ok((select is_primary from public.client_users where user_id = 'e0000000-0000-4000-8000-000000000011'), 'The first login is primary');
select ok(not (select is_primary from public.client_users where user_id = 'e0000000-0000-4000-8000-000000000012'), 'Later logins are not primary');

select throws_ok(
  $$ insert into public.clients (name, pillar_mix) values ('Bad mix', '{"showcase":10,"educate":5,"proof":3,"behind_the_scenes":3,"engage":3}') $$,
  '23514', null, 'The pillar mix must total 20');

-- ---------------------------------------------------------------------------
-- Capacity: the app blocks activating more clients than the setting allows
-- ---------------------------------------------------------------------------

update public.settings set max_active_clients = (select count(*) from public.clients where status = 'active') + 1;
select lives_ok(
  $$ update public.clients set status = 'active' where id = 'f0000000-0000-4000-8000-000000000001' $$,
  'Activating up to the limit works');
insert into public.clients (id, name) values ('f0000000-0000-4000-8000-000000000002', 'One Too Many');
select throws_like(
  $$ update public.clients set status = 'active' where id = 'f0000000-0000-4000-8000-000000000002' $$,
  'You already have % active clients, which is the limit.%', 'Activating past the limit is refused, with the reason');
select throws_like(
  $$ insert into public.clients (name, status) values ('Straight to active', 'active') $$,
  'You already have % active clients%', 'Creating an active client past the limit is refused');
select lives_ok(
  $$ update public.clients set notes = 'still editable' where id = 'f0000000-0000-4000-8000-000000000001' $$,
  'Editing an active client at the limit still works');

-- ---------------------------------------------------------------------------
-- There is always at least one active CEO
-- ---------------------------------------------------------------------------

update public.profiles set active = false where role = 'ceo' and id <> 'e0000000-0000-4000-8000-000000000001';
select throws_ok(
  $$ update public.profiles set role = 'designer' where id = 'e0000000-0000-4000-8000-000000000001' $$,
  'P0001', 'There must be at least one active CEO.', 'The last CEO cannot be demoted');
select throws_ok(
  $$ update public.profiles set active = false where id = 'e0000000-0000-4000-8000-000000000001' $$,
  'P0001', 'There must be at least one active CEO.', 'The last CEO cannot be deactivated');

-- ---------------------------------------------------------------------------
-- Client sign-in lockout: 5 failures in 15 minutes lock the ID for 15 minutes
-- ---------------------------------------------------------------------------

insert into public.login_attempts (login_id, succeeded, created_at)
select 'MM-LCK-0001', false, now() - (n || ' minutes')::interval from generate_series(1, 4) n;
select ok(not public.client_login_locked('MM-LCK-0001'), 'Four failures do not lock');
insert into public.login_attempts (login_id, succeeded) values ('MM-LCK-0001', false);
select ok(public.client_login_locked('MM-LCK-0001'), 'The fifth failure locks the ID');
select ok(not public.client_login_locked('MM-LCK-0002'), 'Other IDs are not affected');

insert into public.login_attempts (login_id, succeeded, created_at)
select 'MM-LCK-0003', false, now() - interval '20 minutes' - (n || ' seconds')::interval from generate_series(1, 5) n;
select ok(not public.client_login_locked('MM-LCK-0003'), 'The lock ends 15 minutes after the fifth failure');

insert into public.login_attempts (login_id, succeeded, created_at)
select 'MM-LCK-0004', false, now() - (n * 4 || ' minutes')::interval from generate_series(1, 5) n;
select ok(not public.client_login_locked('MM-LCK-0004'), 'Five failures spread over more than 15 minutes do not lock');

insert into public.login_attempts (login_id, succeeded, created_at)
select 'MM-LCK-0005', false, now() - interval '10 minutes' - (n || ' seconds')::interval from generate_series(1, 4) n;
insert into public.login_attempts (login_id, succeeded, created_at) values ('MM-LCK-0005', true, now() - interval '9 minutes');
insert into public.login_attempts (login_id, succeeded) values ('MM-LCK-0005', false);
select ok(not public.client_login_locked('MM-LCK-0005'), 'A successful sign-in resets the count');

set local role authenticated;
set local request.jwt.claims to '{"sub":"e0000000-0000-4000-8000-000000000001","role":"authenticated"}';
select throws_ok($$ select public.client_login_locked('MM-LCK-0001') $$, '42501', null,
  'Signed-in users cannot query the lockout');
reset role;

-- Grants: RLS doesn't cover TRUNCATE, and anon gets nothing.
select is_empty(
  $$ select table_name from information_schema.role_table_grants
     where table_schema = 'public' and grantee in ('authenticated', 'service_role')
       and privilege_type = 'TRUNCATE' $$,
  'Nobody but the owner can TRUNCATE a table');
select is_empty(
  $$ select table_name from information_schema.role_table_grants
     where table_schema = 'public' and grantee = 'anon' $$,
  'anon has no table privileges');
select is_empty(
  $$ select table_name from information_schema.role_table_grants
     where table_schema = 'public' and grantee = 'authenticated'
       and privilege_type = 'DELETE' $$,
  'Signed-in users can delete nothing (no table has a delete policy)');

select * from finish();
rollback;
