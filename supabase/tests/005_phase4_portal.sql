-- Phase 4: what a client sees, the preview rule, and undo (05-portal.md).
-- Rolled back at the end.

begin;
create extension if not exists pgtap with schema extensions;
select plan(28);

-- ---------------------------------------------------------------------------
-- Fixtures: client X (with a login) and client Y (another client)
-- ---------------------------------------------------------------------------

insert into auth.users (id, email, aud, role) values
  ('e4000000-0000-4000-8000-000000000002', 'p4.ae@example.com', 'authenticated', 'authenticated'),
  ('e4000000-0000-4000-8000-000000000004', 'p4.cd@example.com', 'authenticated', 'authenticated'),
  ('e4000000-0000-4000-8000-000000000005', 'p4.des@example.com', 'authenticated', 'authenticated'),
  ('e4000000-0000-4000-8000-000000000011', 'p4.cx@example.com', 'authenticated', 'authenticated'),
  ('e4000000-0000-4000-8000-000000000012', 'p4.cy@example.com', 'authenticated', 'authenticated');
insert into public.profiles (id, full_name, email, role, phone) values
  ('e4000000-0000-4000-8000-000000000002', 'P4 AE', 'p4.ae@example.com', 'account_exec', '+267 7200 0000'),
  ('e4000000-0000-4000-8000-000000000004', 'P4 CD', 'p4.cd@example.com', 'creative_director', null),
  ('e4000000-0000-4000-8000-000000000005', 'P4 Designer', 'p4.des@example.com', 'designer', null);
update public.settings set max_active_clients = 1000 where id = 1;

insert into public.clients (id, name, status, account_exec_id, service_id, main_goal, baseline) values
  ('f4000000-0000-4000-8000-000000000001', 'P4 Client X', 'active', 'e4000000-0000-4000-8000-000000000002',
   (select id from public.services where name = 'Brand Launch'), 'engagement', '{"reach":1000}'),
  ('f4000000-0000-4000-8000-000000000002', 'P4 Client Y', 'active', 'e4000000-0000-4000-8000-000000000002', null, null, '{}');
update public.brand_kits set status = 'approved'
 where client_id in ('f4000000-0000-4000-8000-000000000001', 'f4000000-0000-4000-8000-000000000002');
insert into public.client_users (user_id, client_id, full_name, email) values
  ('e4000000-0000-4000-8000-000000000011', 'f4000000-0000-4000-8000-000000000001', 'Kagiso X', 'p4.cx@example.com'),
  ('e4000000-0000-4000-8000-000000000012', 'f4000000-0000-4000-8000-000000000002', 'Lesedi Y', 'p4.cy@example.com');

create temp table ids (k text primary key, v uuid);
grant select on ids to authenticated;

set local role authenticated;
set local request.jwt.claims to '{"sub":"e4000000-0000-4000-8000-000000000002","role":"authenticated"}';
select public.start_month('f4000000-0000-4000-8000-000000000001', '2026-11-01');
select public.start_month('f4000000-0000-4000-8000-000000000002', '2026-11-01');
reset role;
update public.content_months set plan_status = 'approved';
update public.content_items set topic = 'T ' || slot_code;
insert into ids select 'X' || slot_code, id from public.content_items where client_id = 'f4000000-0000-4000-8000-000000000001';
insert into ids select 'Y' || slot_code, id from public.content_items where client_id = 'f4000000-0000-4000-8000-000000000002';
insert into ids select 'monthX', id from public.content_months where client_id = 'f4000000-0000-4000-8000-000000000001';

-- Move X's P01-P03 and Y's P01 to internal review.
update public.content_items set status = 'internal_review'
 where id in (select v from ids where k in ('XP01', 'XP02', 'XP03', 'YP01'));

-- ---------------------------------------------------------------------------
-- Work goes to the client only with a preview image
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub":"e4000000-0000-4000-8000-000000000004","role":"authenticated"}';
select throws_ok($$ select public.set_content_status((select v from ids where k = 'XP01'), 'client_review') $$,
  'P0001', 'Add a client preview image first.', 'No preview, no sending to the client');
update public.content_items set preview_path = client_id::text || '/2026-11/' || slot_code || '/p.png'
 where id in (select v from ids where k in ('XP01', 'XP02', 'XP03', 'YP01'));
select lives_ok($$ select public.set_content_status((select v from ids where k = 'XP01'), 'client_review') $$, 'With a preview it goes');
select public.set_content_status((select v from ids where k = 'XP02'), 'client_review');
select public.set_content_status((select v from ids where k = 'YP01'), 'client_review');

-- ---------------------------------------------------------------------------
-- What client X sees
-- ---------------------------------------------------------------------------

set local request.jwt.claims to '{"sub":"e4000000-0000-4000-8000-000000000011","role":"authenticated"}';
select set_eq($$ select slot_code from public.portal_items $$, $$ values ('P01'), ('P02') $$,
  'The client sees only work that reached them, not drafts or internal review');
select is_empty($$ select 1 from public.portal_items where client_id <> 'f4000000-0000-4000-8000-000000000001' $$,
  'and nothing of another client''s');
select is((select count(*)::int from public.portal_item_history where item_id = (select v from ids where k = 'XP01')),
  1, 'Status history starts when the client first saw it');
select is_empty($$ select 1 from public.portal_item_history where to_status not in ('client_review', 'changes_requested', 'approved', 'scheduled', 'published') $$,
  'and never shows internal statuses');
select results_eq(
  $$ select name, service_name, main_goal::text, account_exec_phone from public.portal_client $$,
  $$ values ('P4 Client X', 'Brand Launch', 'engagement', '+267 7200 0000') $$,
  'The client''s own record, plan and account exec');
select ok((select jsonb_array_length(service_inclusions) > 0 from public.portal_client), 'with the plan''s inclusions');

reset role;
insert into public.kpi_months (client_id, month, metrics) values ('f4000000-0000-4000-8000-000000000001', '2026-11-01', '{"reach":2000}');
set local role authenticated;
select is_empty($$ select 1 from public.portal_kpis $$, 'KPIs stay hidden until the review is published');
reset role;
update public.content_months set review_published_at = now(), review = '{"working":"w","adjust":"a","focus":"f"}'
 where id = (select v from ids where k = 'monthX');
set local role authenticated;
select is((select (metrics ->> 'reach')::int from public.portal_kpis), 2000, 'and show once it is');

set local request.jwt.claims to '{"sub":"e4000000-0000-4000-8000-000000000012","role":"authenticated"}';
select is_empty($$ select 1 from public.portal_kpis $$, 'Client Y sees none of X''s KPIs');
select set_eq($$ select slot_code from public.portal_items $$, $$ values ('P01') $$, 'Client Y sees only its own shown work');
select is((select name from public.portal_client), 'P4 Client Y', 'and only its own record');

-- ---------------------------------------------------------------------------
-- Undo, for 10 minutes, until the team acts
-- ---------------------------------------------------------------------------

set local request.jwt.claims to '{"sub":"e4000000-0000-4000-8000-000000000011","role":"authenticated"}';
select public.set_content_status((select v from ids where k = 'XP01'), 'changes_requested', 'Brighter');
select lives_ok($$ select public.undo_client_response('content_item', (select v from ids where k = 'XP01')) $$,
  'The client undoes a change request');
select results_eq($$ select status::text, revision_rounds from public.portal_items where id = (select v from ids where k = 'XP01') $$,
  $$ values ('client_review', 0) $$, 'The item waits for them again, and the round isn''t counted');
select throws_ok($$ select public.undo_client_response('content_item', (select v from ids where k = 'XP01')) $$,
  'P0001', null, 'There''s nothing more to undo');

select public.set_content_status((select v from ids where k = 'XP01'), 'approved');
set local request.jwt.claims to '{"sub":"e4000000-0000-4000-8000-000000000012","role":"authenticated"}';
select throws_ok($$ select public.undo_client_response('content_item', (select v from ids where k = 'XP01')) $$,
  'P0002', null, 'Another client can''t undo it');
set local request.jwt.claims to '{"sub":"e4000000-0000-4000-8000-000000000002","role":"authenticated"}';
select throws_ok($$ select public.undo_client_response('content_item', (select v from ids where k = 'XP01')) $$,
  '42501', null, 'Staff can''t use the client''s undo');
select public.set_content_status((select v from ids where k = 'XP01'), 'scheduled');
set local request.jwt.claims to '{"sub":"e4000000-0000-4000-8000-000000000011","role":"authenticated"}';
select throws_ok($$ select public.undo_client_response('content_item', (select v from ids where k = 'XP01')) $$,
  'P0001', null, 'Once the team has acted, it can''t be undone');

select public.set_content_status((select v from ids where k = 'XP02'), 'approved');
reset role;
update public.status_events set created_at = now() - interval '12 minutes'
 where entity_id = (select v from ids where k = 'XP02') and to_status = 'client_review';
update public.status_events set created_at = now() - interval '11 minutes'
 where entity_id = (select v from ids where k = 'XP02') and to_status = 'approved';
set local role authenticated;
select throws_ok($$ select public.undo_client_response('content_item', (select v from ids where k = 'XP02')) $$,
  'P0001', 'It''s been more than 10 minutes, so this can''t be undone. Ask your account executive.', 'Undo lasts 10 minutes');

-- The calendar: undo works until design starts on the month.
reset role;
update public.content_months set plan_status = 'sent', plan_approved_at = null where id = (select v from ids where k = 'monthX');
set local role authenticated;
select public.respond_to_calendar((select v from ids where k = 'monthX'), true);
select lives_ok($$ select public.undo_client_response('content_month', (select v from ids where k = 'monthX')) $$, 'The client undoes a calendar approval');
select is((select plan_status::text from public.portal_months where id = (select v from ids where k = 'monthX')), 'sent', 'The calendar waits for them again');
select public.respond_to_calendar((select v from ids where k = 'monthX'), true);
set local request.jwt.claims to '{"sub":"e4000000-0000-4000-8000-000000000005","role":"authenticated"}';
select public.set_content_status((select v from ids where k = 'XP05'), 'in_design');
set local request.jwt.claims to '{"sub":"e4000000-0000-4000-8000-000000000011","role":"authenticated"}';
select throws_ok($$ select public.undo_client_response('content_month', (select v from ids where k = 'monthX')) $$,
  'P0001', null, 'Once a designer starts on the month, the calendar approval stands');

-- The brand kit: undo puts it back for sign-off.
reset role;
update public.brand_kits set status = 'client_review', signed_off_by = null where client_id = 'f4000000-0000-4000-8000-000000000002';
insert into ids select 'kitY', id from public.brand_kits where client_id = 'f4000000-0000-4000-8000-000000000002';
set local role authenticated;
set local request.jwt.claims to '{"sub":"e4000000-0000-4000-8000-000000000012","role":"authenticated"}';
select public.set_brand_kit_status('f4000000-0000-4000-8000-000000000002', 'approved');
select lives_ok($$ select public.undo_client_response('brand_kit', (select v from ids where k = 'kitY')) $$, 'The client undoes a kit sign-off');
reset role;
select results_eq($$ select status::text, signed_off_by from public.brand_kits where client_id = 'f4000000-0000-4000-8000-000000000002' $$,
  $$ values ('client_review', null::text) $$, 'The kit waits for sign-off again');
select isnt_empty($$ select 1 from public.status_events where entity_id = (select v from ids where k = 'kitY') and comment = 'Undone by the client' $$,
  'The undo is in the audit trail');

-- A campaign brief: approve then undo.
set local role authenticated;
set local request.jwt.claims to '{"sub":"e4000000-0000-4000-8000-000000000002","role":"authenticated"}';
select public.create_campaign((select v from ids where k = 'monthX'));
reset role;
update public.campaigns set status = 'sent', goal = 'g', offer = 'o' where client_id = 'f4000000-0000-4000-8000-000000000001';
insert into ids select 'campX', id from public.campaigns where client_id = 'f4000000-0000-4000-8000-000000000001';
set local role authenticated;
set local request.jwt.claims to '{"sub":"e4000000-0000-4000-8000-000000000011","role":"authenticated"}';
select public.set_campaign_status((select v from ids where k = 'campX'), 'approved');
select lives_ok($$ select public.undo_client_response('campaign', (select v from ids where k = 'campX')) $$, 'The client undoes a brief approval');
select is((select status::text from public.portal_campaigns where id = (select v from ids where k = 'campX')), 'sent', 'The brief waits for them again');

select * from finish();
rollback;
