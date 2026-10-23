-- Access rules from 01-auth-and-roles.md, proved row by row for every role.
-- Runs inside a transaction that is rolled back. Fixture IDs are distinct from
-- the sample seed, and every check is limited to fixture rows.

begin;
create extension if not exists pgtap with schema extensions;
select plan(56);

-- ---------------------------------------------------------------------------
-- Fixtures (as the database owner)
-- ---------------------------------------------------------------------------

insert into auth.users (id, email, aud, role) values
  ('a0000000-0000-4000-8000-000000000001', 't.ceo@example.com', 'authenticated', 'authenticated'),
  ('a0000000-0000-4000-8000-000000000002', 't.ae1@example.com', 'authenticated', 'authenticated'),
  ('a0000000-0000-4000-8000-000000000003', 't.ae2@example.com', 'authenticated', 'authenticated'),
  ('a0000000-0000-4000-8000-000000000004', 't.cd@example.com', 'authenticated', 'authenticated'),
  ('a0000000-0000-4000-8000-000000000005', 't.des@example.com', 'authenticated', 'authenticated'),
  ('a0000000-0000-4000-8000-000000000006', 't.gone@example.com', 'authenticated', 'authenticated'),
  ('a0000000-0000-4000-8000-000000000011', 't.c1@example.com', 'authenticated', 'authenticated'),
  ('a0000000-0000-4000-8000-000000000012', 't.c2@example.com', 'authenticated', 'authenticated'),
  ('a0000000-0000-4000-8000-000000000013', 't.c1off@example.com', 'authenticated', 'authenticated');

insert into public.profiles (id, full_name, email, role, active) values
  ('a0000000-0000-4000-8000-000000000001', 'Test CEO', 't.ceo@example.com', 'ceo', true),
  ('a0000000-0000-4000-8000-000000000002', 'Test AE One', 't.ae1@example.com', 'account_exec', true),
  ('a0000000-0000-4000-8000-000000000003', 'Test AE Two', 't.ae2@example.com', 'account_exec', true),
  ('a0000000-0000-4000-8000-000000000004', 'Test CD', 't.cd@example.com', 'creative_director', true),
  ('a0000000-0000-4000-8000-000000000005', 'Test Designer', 't.des@example.com', 'designer', true),
  ('a0000000-0000-4000-8000-000000000006', 'Test Former Designer', 't.gone@example.com', 'designer', false);

insert into public.clients (id, name, status, account_exec_id) values
  ('b0000000-0000-4000-8000-000000000001', 'Test Client A', 'onboarding', 'a0000000-0000-4000-8000-000000000002'),
  ('b0000000-0000-4000-8000-000000000002', 'Test Client B', 'onboarding', 'a0000000-0000-4000-8000-000000000003');

insert into public.client_users (id, user_id, client_id, full_name, email, active) values
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000011', 'b0000000-0000-4000-8000-000000000001', 'Client A User', 't.c1@example.com', true),
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000012', 'b0000000-0000-4000-8000-000000000002', 'Client B User', 't.c2@example.com', true),
  ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000013', 'b0000000-0000-4000-8000-000000000001', 'Client A Old User', 't.c1off@example.com', false);

insert into public.status_events (client_id, entity_type, entity_id, from_status, to_status, actor_kind) values
  ('b0000000-0000-4000-8000-000000000001', 'brand_kit', gen_random_uuid(), 'planned', 'in_design', 'system'),
  ('b0000000-0000-4000-8000-000000000002', 'brand_kit', gen_random_uuid(), 'planned', 'in_design', 'system');

insert into public.comments (client_id, entity_type, entity_id, body, author_id, author_kind, visible_to_client) values
  ('b0000000-0000-4000-8000-000000000001', 'brand_kit', gen_random_uuid(), 'A, shown to client', 'a0000000-0000-4000-8000-000000000002', 'staff', true),
  ('b0000000-0000-4000-8000-000000000001', 'brand_kit', gen_random_uuid(), 'A, staff only', 'a0000000-0000-4000-8000-000000000002', 'staff', false),
  ('b0000000-0000-4000-8000-000000000002', 'brand_kit', gen_random_uuid(), 'B, shown to client', 'a0000000-0000-4000-8000-000000000003', 'staff', true);

insert into public.notifications (id, user_id, title) values
  ('d0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 'For AE one');

insert into public.login_attempts (login_id, succeeded) values ('MM-TST-0000', false);

-- ---------------------------------------------------------------------------
-- Signed out: nothing
-- ---------------------------------------------------------------------------

set local role anon;
select throws_ok('select * from public.clients', '42501', null, 'Signed out: clients are closed');
select throws_ok('select * from public.profiles', '42501', null, 'Signed out: profiles are closed');
select throws_ok('select * from public.portal_client', '42501', null, 'Signed out: portal view is closed');
reset role;

-- ---------------------------------------------------------------------------
-- Account exec one: only their assigned client, in every table
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}';

select is(public.auth_role(), 'account_exec', 'AE one has the account_exec role');
select results_eq(
  $$ select id from public.clients where name like 'Test Client %' $$,
  $$ values ('b0000000-0000-4000-8000-000000000001'::uuid) $$,
  'AE one sees only their own client');
select results_eq(
  $$ select distinct client_id from public.client_users where full_name like 'Client % User' $$,
  $$ values ('b0000000-0000-4000-8000-000000000001'::uuid) $$,
  'AE one sees only their client''s logins');
select is((select count(*)::int from public.status_events where client_id = 'b0000000-0000-4000-8000-000000000002'), 0,
  'AE one sees no status history for the other AE''s client');
select is((select count(*)::int from public.comments where client_id = 'b0000000-0000-4000-8000-000000000002'), 0,
  'AE one sees no comments for the other AE''s client');
select is((select count(*)::int from public.comments where client_id = 'b0000000-0000-4000-8000-000000000001'), 2,
  'AE one sees all comments on their own client');
select is((select count(*)::int from public.portal_client where id = 'b0000000-0000-4000-8000-000000000002'), 0,
  'AE one sees nothing of the other client through the portal view');
select ok(not public.can_access_client('b0000000-0000-4000-8000-000000000002'), 'can_access_client is false for the other client');

with u as (update public.clients set notes = 'hijack' where id = 'b0000000-0000-4000-8000-000000000002' returning 1)
select is(count(*)::int, 0, 'AE one cannot update the other AE''s client') from u;
with u as (update public.clients set notes = 'Prefers WhatsApp' where id = 'b0000000-0000-4000-8000-000000000001' returning 1)
select is(count(*)::int, 1, 'AE one can edit profile fields of their own client') from u;
select throws_ok(
  $$ update public.clients set status = 'active' where id = 'b0000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'AE one cannot change their client''s status');
select throws_ok(
  $$ update public.clients set account_exec_id = 'a0000000-0000-4000-8000-000000000003' where id = 'b0000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'AE one cannot reassign their client');
select throws_ok(
  $$ insert into public.clients (name) values ('Sneaky new client') $$,
  '42501', null, 'AE one cannot create clients');
with u as (update public.client_users set active = false where id = 'c0000000-0000-4000-8000-000000000002' returning 1)
select is(count(*)::int, 0, 'AE one cannot switch off the other client''s login') from u;

select is_empty($$ select id from public.services $$, 'AE one cannot read services');
select is_empty($$ select id from public.settings $$, 'AE one cannot read settings');
select throws_ok('select * from public.login_attempts', '42501', null, 'AE one cannot read sign-in attempts');
select throws_ok('select * from public.document_counters', '42501', null, 'AE one cannot read document counters');
select throws_ok(
  $$ insert into public.status_events (client_id, entity_type, entity_id, to_status, actor_kind)
     values ('b0000000-0000-4000-8000-000000000001', 'brand_kit', gen_random_uuid(), 'approved', 'staff') $$,
  '42501', null, 'Nobody writes status history directly');
with u as (update public.profiles set role = 'ceo' where id = 'a0000000-0000-4000-8000-000000000002' returning 1)
select is(count(*)::int, 0, 'AE one cannot promote themselves') from u;

select is((select count(*)::int from public.notifications where id = 'd0000000-0000-4000-8000-000000000001'), 1,
  'AE one sees their own notification');
with u as (update public.notifications set read_at = now() where id = 'd0000000-0000-4000-8000-000000000001' returning 1)
select is(count(*)::int, 1, 'AE one can mark their notification read') from u;
select throws_ok(
  $$ update public.notifications set title = 'changed' where id = 'd0000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'Only read_at can be changed on a notification');
reset role;

-- ---------------------------------------------------------------------------
-- Account exec two: the mirror image
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub":"a0000000-0000-4000-8000-000000000003","role":"authenticated"}';
select results_eq(
  $$ select id from public.clients where name like 'Test Client %' $$,
  $$ values ('b0000000-0000-4000-8000-000000000002'::uuid) $$,
  'AE two sees only their own client');
select is((select count(*)::int from public.notifications where id = 'd0000000-0000-4000-8000-000000000001'), 0,
  'AE two cannot see AE one''s notification');
reset role;

-- ---------------------------------------------------------------------------
-- Designer and creative director: every client, but nothing CEO-only
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub":"a0000000-0000-4000-8000-000000000005","role":"authenticated"}';
select is((select count(*)::int from public.clients where name like 'Test Client %'), 2, 'Designer reads every client');
select is((select count(*)::int from public.comments where client_id in ('b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002')), 3,
  'Designer reads comments on every client');
with u as (update public.clients set notes = 'designer edit' where name like 'Test Client %' returning 1)
select is(count(*)::int, 0, 'Designer cannot edit clients') from u;
select is_empty($$ select id from public.services $$, 'Designer cannot read services (CEO only)');
select is_empty($$ select id from public.settings $$, 'Designer cannot read settings (CEO only)');
select throws_ok('select * from public.document_counters', '42501', null, 'Designer cannot read document counters');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub":"a0000000-0000-4000-8000-000000000004","role":"authenticated"}';
select is((select count(*)::int from public.clients where name like 'Test Client %'), 2, 'Creative director reads every client');
select is_empty($$ select id from public.services $$, 'Creative director cannot read services');
reset role;

-- ---------------------------------------------------------------------------
-- A deactivated staff member with a still-valid token sees nothing
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub":"a0000000-0000-4000-8000-000000000006","role":"authenticated"}';
select is(public.auth_role(), null, 'Deactivated staff have no role');
select is_empty($$ select id from public.clients $$, 'Deactivated staff read no clients');
select is_empty($$ select id from public.profiles $$, 'Deactivated staff read no profiles');
reset role;

-- ---------------------------------------------------------------------------
-- Client user A: their own client only, and only client-facing data
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub":"a0000000-0000-4000-8000-000000000011","role":"authenticated"}';
select is(public.auth_role(), 'client', 'Client user has the client role');
select is_empty($$ select id from public.clients $$, 'Clients never read the clients table directly');
select results_eq(
  $$ select id, name, account_exec_name from public.portal_client $$,
  $$ values ('b0000000-0000-4000-8000-000000000001'::uuid, 'Test Client A', 'Test AE One') $$,
  'Client user reads only their own client, with their AE''s name, through portal_client');
select results_eq(
  $$ select id from public.client_users $$,
  $$ values ('c0000000-0000-4000-8000-000000000001'::uuid) $$,
  'Client user reads only their own login');
select results_eq(
  $$ select body from public.comments $$,
  $$ values ('A, shown to client') $$,
  'Client user reads only comments shown to them, on their own client');
select is_empty($$ select id from public.status_events $$, 'Client user reads no internal status history');
select is_empty($$ select id from public.profiles $$, 'Client user reads no staff profiles');
select is_empty($$ select id from public.services $$, 'Client user reads no services');
select is_empty($$ select id from public.notifications where id = 'd0000000-0000-4000-8000-000000000001' $$,
  'Client user reads no one else''s notifications');
select lives_ok(
  $$ insert into public.comments (client_id, entity_type, entity_id, body, author_id, author_kind, visible_to_client)
     values ('b0000000-0000-4000-8000-000000000001', 'brand_kit', gen_random_uuid(), 'Looks good', 'a0000000-0000-4000-8000-000000000011', 'client', true) $$,
  'Client user can comment on their own client''s work');
select throws_ok(
  $$ insert into public.comments (client_id, entity_type, entity_id, body, author_id, author_kind, visible_to_client)
     values ('b0000000-0000-4000-8000-000000000002', 'brand_kit', gen_random_uuid(), 'Hello', 'a0000000-0000-4000-8000-000000000011', 'client', true) $$,
  '42501', null, 'Client user cannot comment on another client''s work');
select throws_ok(
  $$ insert into public.comments (client_id, entity_type, entity_id, body, author_id, author_kind, visible_to_client)
     values ('b0000000-0000-4000-8000-000000000001', 'brand_kit', gen_random_uuid(), 'Pretend staff', 'a0000000-0000-4000-8000-000000000011', 'staff', false) $$,
  '42501', null, 'Client user cannot post as staff or hidden');
reset role;

-- A switched-off client login sees nothing
set local role authenticated;
set local request.jwt.claims to '{"sub":"a0000000-0000-4000-8000-000000000013","role":"authenticated"}';
select is(public.auth_role(), null, 'Switched-off client login has no role');
select is_empty($$ select id from public.portal_client $$, 'Switched-off client login reads nothing');
reset role;

-- ---------------------------------------------------------------------------
-- CEO: everything
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}';
select is((select count(*)::int from public.clients where name like 'Test Client %'), 2, 'CEO reads every client');
select isnt_empty($$ select id from public.services where name = 'Brand Launch' $$, 'CEO reads services');
select is((select max_active_clients from public.settings), 10, 'CEO reads settings');
reset role;

select * from finish();
rollback;
