-- Phase 2: content months, the status rules, calendar and campaign approval,
-- KPIs and the review, the questionnaire link and activation
-- (03-accounts.md and 01-auth-and-roles.md). Rolled back at the end.

begin;
create extension if not exists pgtap with schema extensions;
select plan(112);

-- ---------------------------------------------------------------------------
-- Fixtures (as the database owner)
-- ---------------------------------------------------------------------------

insert into auth.users (id, email, aud, role) values
  ('e0000000-0000-4000-8000-000000000001', 'p2.ceo@example.com', 'authenticated', 'authenticated'),
  ('e0000000-0000-4000-8000-000000000002', 'p2.ae1@example.com', 'authenticated', 'authenticated'),
  ('e0000000-0000-4000-8000-000000000003', 'p2.ae2@example.com', 'authenticated', 'authenticated'),
  ('e0000000-0000-4000-8000-000000000004', 'p2.cd@example.com', 'authenticated', 'authenticated'),
  ('e0000000-0000-4000-8000-000000000005', 'p2.des@example.com', 'authenticated', 'authenticated'),
  ('e0000000-0000-4000-8000-000000000011', 'p2.ca@example.com', 'authenticated', 'authenticated'),
  ('e0000000-0000-4000-8000-000000000012', 'p2.cb@example.com', 'authenticated', 'authenticated');

insert into public.profiles (id, full_name, email, role) values
  ('e0000000-0000-4000-8000-000000000001', 'P2 CEO', 'p2.ceo@example.com', 'ceo'),
  ('e0000000-0000-4000-8000-000000000002', 'P2 AE One', 'p2.ae1@example.com', 'account_exec'),
  ('e0000000-0000-4000-8000-000000000003', 'P2 AE Two', 'p2.ae2@example.com', 'account_exec'),
  ('e0000000-0000-4000-8000-000000000004', 'P2 CD', 'p2.cd@example.com', 'creative_director'),
  ('e0000000-0000-4000-8000-000000000005', 'P2 Designer', 'p2.des@example.com', 'designer');

-- Room for the test clients whatever else is active.
update public.settings set max_active_clients = 1000 where id = 1;

insert into public.clients (id, name, status, account_exec_id, baseline) values
  ('f0000000-0000-4000-8000-000000000001', 'P2 Client A', 'active', 'e0000000-0000-4000-8000-000000000002', '{"followers":100}'),
  ('f0000000-0000-4000-8000-000000000002', 'P2 Client B', 'active', 'e0000000-0000-4000-8000-000000000003', '{}'),
  ('f0000000-0000-4000-8000-000000000003', 'P2 Client C', 'onboarding', 'e0000000-0000-4000-8000-000000000002', '{}');

insert into public.client_users (user_id, client_id, full_name, email) values
  ('e0000000-0000-4000-8000-000000000011', 'f0000000-0000-4000-8000-000000000001', 'P2 Client A User', 'p2.ca@example.com'),
  ('e0000000-0000-4000-8000-000000000012', 'f0000000-0000-4000-8000-000000000002', 'P2 Client B User', 'p2.cb@example.com');

select is(
  (select count(*)::int from public.brand_kits where client_id = 'f0000000-0000-4000-8000-000000000001'),
  1, 'A new client gets a brand kit');

-- Ids looked up as the owner, for steps run as people who can't read the tables.
create temp table ids (k text primary key, v uuid);
grant select on ids to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Starting a month
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub":"e0000000-0000-4000-8000-000000000003","role":"authenticated"}';
select lives_ok($$ select public.start_month('f0000000-0000-4000-8000-000000000002', '2026-11-01') $$,
  'AE two starts November for client B');
update public.content_items set topic = 'B topic'
 where client_id = 'f0000000-0000-4000-8000-000000000002';
select lives_ok($$ select public.send_calendar((select id from public.content_months where client_id = 'f0000000-0000-4000-8000-000000000002')) $$,
  'AE two sends client B''s calendar');

set local request.jwt.claims to '{"sub":"e0000000-0000-4000-8000-000000000002","role":"authenticated"}';
select lives_ok($$ select public.start_month('f0000000-0000-4000-8000-000000000001', '2026-11-15') $$,
  'AE one starts November for client A (any day in the month)');

reset role;
insert into ids select 'monthA', id from public.content_months where client_id = 'f0000000-0000-4000-8000-000000000001';
insert into ids select 'monthB', id from public.content_months where client_id = 'f0000000-0000-4000-8000-000000000002';
insert into ids select 'item' || slot_code, id from public.content_items
 where client_id = 'f0000000-0000-4000-8000-000000000001';
insert into ids select 'itemB' || slot_code, id from public.content_items
 where client_id = 'f0000000-0000-4000-8000-000000000002';
set local role authenticated;

select is((select month from public.content_months where id = (select v from ids where k = 'monthA')),
  date '2026-11-01', 'The month is stored as its first day');
select is((select count(*)::int from public.content_items where month_id = (select v from ids where k = 'monthA')),
  26, 'Starting a month creates 26 items');
select results_eq(
  $$ select format::text, count(*)::int from public.content_items
     where month_id = (select v from ids where k = 'monthA') group by format order by format $$,
  $$ values ('post', 20), ('reel', 2), ('story', 4) $$,
  '20 posts, 4 stories and 2 reels');
select is_empty(
  $$ select 1 from public.content_items where month_id = (select v from ids where k = 'monthA')
     and (scheduled_date < '2026-11-01' or scheduled_date > '2026-11-30' or scheduled_date is null) $$,
  'Every date is in the month');
select is_empty(
  $$ select 1 from public.content_items where month_id = (select v from ids where k = 'monthA')
     and format in ('post', 'reel') and extract(isodow from scheduled_date) > 5 $$,
  'Posts and reels fall on weekdays');
select is_empty(
  $$ select 1 from public.content_items where month_id = (select v from ids where k = 'monthA')
     and format = 'reel' and not (extract(day from scheduled_date) between 8 and 14
                               or extract(day from scheduled_date) between 22 and 28) $$,
  'Reels fall in weeks 2 and 4');
select results_eq(
  $$ select pillar::text, count(*)::int from public.content_items
     where month_id = (select v from ids where k = 'monthA') and format = 'post'
     group by pillar order by pillar $$,
  $$ values ('behind_the_scenes', 3), ('educate', 5), ('engage', 3), ('proof', 3), ('showcase', 6) $$,
  'The post pillar mix equals the client''s target');
select is_empty(
  $$ select 1 from (
       select pillar, lag(pillar) over w as p1, lag(pillar, 2) over w as p2
       from public.content_items where month_id = (select v from ids where k = 'monthA') and format = 'post'
       window w as (order by slot_code)) s
     where pillar = p1 and pillar = p2 $$,
  'No pillar runs three posts in a row');
select throws_ok($$ select public.start_month('f0000000-0000-4000-8000-000000000001', '2026-11-01') $$,
  '23505', null, 'A month can''t be started twice');
select throws_ok($$ select public.start_month('f0000000-0000-4000-8000-000000000002', '2026-12-01') $$,
  '42501', null, 'An account exec can''t plan another account exec''s client');
select throws_ok($$ select public.start_month('f0000000-0000-4000-8000-000000000003', '2026-11-01') $$,
  'P0001', null, 'A client in onboarding can''t have months yet');
select is_empty($$ select 1 from public.content_items where client_id = 'f0000000-0000-4000-8000-000000000002' $$,
  'AE one sees none of client B''s items');
select is_empty($$ select 1 from public.content_months where client_id = 'f0000000-0000-4000-8000-000000000002' $$,
  'AE one sees none of client B''s months');

-- Plan fields are the account exec's; status and design fields aren't.
select lives_ok($$ update public.content_items set topic = 'Opening week' where id = (select v from ids where k = 'itemP01') $$,
  'The account exec edits a topic');
select throws_ok($$ update public.content_items set status = 'approved' where id = (select v from ids where k = 'itemP01') $$,
  '42501', null, 'Status can''t be changed directly');
select throws_ok($$ update public.content_items set caption = 'Hi' where id = (select v from ids where k = 'itemP01') $$,
  '42501', null, 'The account exec can''t edit design fields');
select throws_ok($$ update public.content_items set scheduled_date = '2026-12-02' where id = (select v from ids where k = 'itemP01') $$,
  '22023', null, 'A date outside the month is refused');

-- ---------------------------------------------------------------------------
-- Calendar approval
-- ---------------------------------------------------------------------------

select throws_ok($$ select public.send_calendar((select v from ids where k = 'monthA')) $$,
  'P0001', null, 'A calendar with empty topics can''t be sent');
update public.content_items set topic = coalesce(topic, 'Topic ' || slot_code)
 where month_id = (select v from ids where k = 'monthA');
select lives_ok($$ select public.send_calendar((select v from ids where k = 'monthA')) $$, 'The account exec sends the calendar');
select is((select plan_status::text from public.content_months where id = (select v from ids where k = 'monthA')),
  'sent', 'The plan status is sent');

set local request.jwt.claims to '{"sub":"e0000000-0000-4000-8000-000000000005","role":"authenticated"}';
select throws_ok($$ select public.set_content_status((select v from ids where k = 'itemP01'), 'in_design') $$,
  'P0001', null, 'Designers can''t start work before the client approves the calendar');

set local request.jwt.claims to '{"sub":"e0000000-0000-4000-8000-000000000011","role":"authenticated"}';
select is((select count(*)::int from public.portal_calendar where month_id = (select v from ids where k = 'monthA')),
  26, 'The client sees the sent calendar in the portal');
select is_empty($$ select 1 from public.portal_calendar where client_id <> 'f0000000-0000-4000-8000-000000000001' $$,
  'The client sees no other client''s calendar');
select is_empty($$ select 1 from public.content_items $$, 'Clients can''t read content items directly');
select throws_ok($$ select public.respond_to_calendar((select v from ids where k = 'monthB'), true) $$,
  '42501', null, 'A client can''t approve another client''s calendar');
select throws_ok($$ select public.respond_to_calendar((select v from ids where k = 'monthA'), false, ' ') $$,
  '22023', null, 'Asking for changes needs a note');
select lives_ok($$ select public.respond_to_calendar((select v from ids where k = 'monthA'), true) $$,
  'The client approves the calendar');

set local request.jwt.claims to '{"sub":"e0000000-0000-4000-8000-000000000002","role":"authenticated"}';
select is((select plan_status::text from public.content_months where id = (select v from ids where k = 'monthA')),
  'approved', 'The plan status is approved');
select isnt_empty(
  $$ select 1 from public.notifications where title = 'P2 Client A approved the November 2026 calendar' $$,
  'The account exec is told the calendar was approved');
select set_eq(
  $$ select from_status, to_status, actor_kind from public.status_events
     where entity_id = (select v from ids where k = 'monthA') $$,
  $$ values (null::text, 'draft', 'staff'), ('draft', 'sent', 'staff'), ('sent', 'approved', 'client') $$,
  'Every calendar move is in the audit trail');

-- ---------------------------------------------------------------------------
-- Content status rules
-- ---------------------------------------------------------------------------

set local request.jwt.claims to '{"sub":"e0000000-0000-4000-8000-000000000005","role":"authenticated"}';
select lives_ok($$ select public.set_content_status((select v from ids where k = 'itemP01'), 'in_design') $$,
  'Designer: planned to in design');
select throws_ok($$ select public.set_content_status((select v from ids where k = 'itemP01'), 'client_review') $$,
  'P0001', null, 'In design can''t skip internal review');
select lives_ok($$ select public.set_content_status((select v from ids where k = 'itemP01'), 'internal_review') $$,
  'Designer: in design to internal review');
select throws_ok($$ select public.set_content_status((select v from ids where k = 'itemP01'), 'client_review') $$,
  '42501', null, 'Only the creative director sends work to the client');
select lives_ok($$ update public.content_items set caption = 'Fresh beans' where id = (select v from ids where k = 'itemP01') $$,
  'The designer edits design fields');
select throws_ok($$ update public.content_items set topic = 'New' where id = (select v from ids where k = 'itemP01') $$,
  '42501', null, 'The designer can''t edit plan fields');

set local request.jwt.claims to '{"sub":"e0000000-0000-4000-8000-000000000004","role":"authenticated"}';
select lives_ok($$ select public.set_content_status((select v from ids where k = 'itemP01'), 'client_review') $$,
  'Creative director: internal review to client review');
select isnt((select shown_to_client_at from public.content_items where id = (select v from ids where k = 'itemP01')),
  null, 'Sending to the client records when it was first shown');

set local request.jwt.claims to '{"sub":"e0000000-0000-4000-8000-000000000002","role":"authenticated"}';
select isnt_empty($$ select 1 from public.notifications where title = 'P01 is waiting on the client' $$,
  'The account exec is told when work reaches the client');
select throws_ok($$ select public.set_content_status((select v from ids where k = 'itemP01'), 'approved') $$,
  '22023', null, 'Approving for the client needs a note');

set local request.jwt.claims to '{"sub":"e0000000-0000-4000-8000-000000000011","role":"authenticated"}';
select throws_ok($$ select public.set_content_status((select v from ids where k = 'itemP01'), 'changes_requested') $$,
  '22023', null, 'The client says what to change');
select lives_ok($$ select public.set_content_status((select v from ids where k = 'itemP01'), 'changes_requested', 'Brighter, please') $$,
  'The client asks for changes');
select isnt_empty($$ select 1 from public.comments where body = 'Brighter, please' and visible_to_client $$,
  'The client''s note is a comment they can see');
select throws_ok($$ select public.set_content_status((select v from ids where k = 'itemBP01'), 'approved') $$,
  'P0002', null, 'A client can''t touch another client''s item');

reset role;
select is((select revision_rounds from public.content_items where id = (select v from ids where k = 'itemP01')),
  1, 'A client change request counts a revision round');
set local role authenticated;

set local request.jwt.claims to '{"sub":"e0000000-0000-4000-8000-000000000005","role":"authenticated"}';
select lives_ok($$ select public.set_content_status((select v from ids where k = 'itemP01'), 'in_design') $$,
  'Designer: changes requested back to in design');
select lives_ok($$ select public.set_content_status((select v from ids where k = 'itemP01'), 'internal_review') $$,
  'Designer: back to internal review');
set local request.jwt.claims to '{"sub":"e0000000-0000-4000-8000-000000000004","role":"authenticated"}';
select lives_ok($$ select public.set_content_status((select v from ids where k = 'itemP01'), 'client_review') $$,
  'Creative director: to client review again');
set local request.jwt.claims to '{"sub":"e0000000-0000-4000-8000-000000000011","role":"authenticated"}';
select lives_ok($$ select public.set_content_status((select v from ids where k = 'itemP01'), 'approved') $$,
  'The client approves');
set local request.jwt.claims to '{"sub":"e0000000-0000-4000-8000-000000000005","role":"authenticated"}';
select throws_ok($$ select public.set_content_status((select v from ids where k = 'itemP01'), 'scheduled') $$,
  '42501', null, 'Only the account exec schedules');
set local request.jwt.claims to '{"sub":"e0000000-0000-4000-8000-000000000002","role":"authenticated"}';
select lives_ok($$ select public.set_content_status((select v from ids where k = 'itemP01'), 'scheduled') $$,
  'Account exec: approved to scheduled');
select lives_ok($$ select public.set_content_status((select v from ids where k = 'itemP01'), 'published') $$,
  'Account exec: scheduled to published');
select is((select count(*)::int from public.status_events where entity_id = (select v from ids where k = 'itemP01')),
  10, 'Every one of the 10 moves wrote a status event');

-- ---------------------------------------------------------------------------
-- Campaigns
-- ---------------------------------------------------------------------------

select lives_ok($$ select public.create_campaign((select v from ids where k = 'monthA')) $$, 'The account exec creates a campaign');
select results_eq(
  $$ select slot_code, format::text, pillar::text from public.content_items
     where month_id = (select v from ids where k = 'monthA') and slot_code like 'A%' order by slot_code $$,
  $$ values ('A01', 'ad_feed', 'campaign'), ('A02', 'ad_story', 'campaign'), ('A03', 'ad_variant', 'campaign') $$,
  'The campaign creates A01 to A03');
select throws_ok($$ select public.create_campaign((select v from ids where k = 'monthA')) $$,
  '23505', null, 'One campaign per month');

reset role;
insert into ids select 'campA', id from public.campaigns where month_id = (select v from ids where k = 'monthA');
set local role authenticated;

select throws_ok($$ select public.set_campaign_status((select v from ids where k = 'campA'), 'sent') $$,
  'P0001', null, 'A brief needs its goal, offer and dates before sending');
update public.campaigns
   set goal = 'Messages / WhatsApp chats', offer = '20% off', start_date = '2026-11-10', end_date = '2026-11-24'
 where id = (select v from ids where k = 'campA');
select is_empty(
  $$ select 1 from public.content_items where month_id = (select v from ids where k = 'monthA')
     and slot_code like 'A%' and scheduled_date is distinct from '2026-11-10' $$,
  'The ads take the campaign''s start date');
select lives_ok($$ select public.set_campaign_status((select v from ids where k = 'campA'), 'sent') $$,
  'The account exec sends the brief');

set local request.jwt.claims to '{"sub":"e0000000-0000-4000-8000-000000000012","role":"authenticated"}';
select is_empty($$ select 1 from public.portal_campaigns where id = (select v from ids where k = 'campA') $$,
  'Another client can''t see the brief');
set local request.jwt.claims to '{"sub":"e0000000-0000-4000-8000-000000000011","role":"authenticated"}';
select lives_ok($$ select public.set_campaign_status((select v from ids where k = 'campA'), 'approved') $$,
  'The client approves the brief');

set local request.jwt.claims to '{"sub":"e0000000-0000-4000-8000-000000000002","role":"authenticated"}';
select throws_ok($$ select public.set_campaign_status((select v from ids where k = 'campA'), 'live') $$,
  'P0001', null, 'Going live needs the launch checks');
select throws_ok($$ select public.set_campaign_status((select v from ids where k = 'campA'), 'live', null, true) $$,
  'P0001', null, 'A campaign can''t go live before its start date');
update public.campaigns set start_date = public.today_gaborone() where id = (select v from ids where k = 'campA');
select lives_ok($$ select public.set_campaign_status((select v from ids where k = 'campA'), 'live', null, true) $$,
  'The campaign goes live on the start date');
select throws_ok($$ select public.set_campaign_status((select v from ids where k = 'campA'), 'complete') $$,
  'P0001', null, 'Completing needs the results');
update public.campaigns set results = '52 chats' where id = (select v from ids where k = 'campA');
select lives_ok($$ select public.set_campaign_status((select v from ids where k = 'campA'), 'complete') $$,
  'The campaign completes');

-- ---------------------------------------------------------------------------
-- KPIs and the review
-- ---------------------------------------------------------------------------

select lives_ok(
  $$ insert into public.kpi_months (client_id, month, metrics, sources)
     values ('f0000000-0000-4000-8000-000000000001', '2026-11-01',
             '{"reach":1000,"interactions":50,"followers":130,"ad_spend":300,"ad_results":60}', '{"reach":"manual"}') $$,
  'The account exec enters KPIs');
select throws_ok(
  $$ insert into public.kpi_months (client_id, month, metrics)
     values ('f0000000-0000-4000-8000-000000000001', '2026-12-01', '{"likes":5}') $$,
  '23514', null, 'Unknown metrics are refused');
select throws_ok(
  $$ insert into public.kpi_months (client_id, month, metrics) values ('f0000000-0000-4000-8000-000000000002', '2026-11-01', '{}') $$,
  '42501', null, 'An account exec can''t enter another client''s KPIs');
select results_eq(
  $$ select net_new_followers, engagement_rate, cost_per_result, published, planned
     from public.kpi_months_calc where client_id = 'f0000000-0000-4000-8000-000000000001' $$,
  $$ values (30::numeric, 0.0500::numeric, 5.00::numeric, 1::bigint, 26::bigint) $$,
  'Calculated metrics: followers against the baseline, engagement rate, cost per result, published vs planned');
select throws_ok($$ select public.publish_review((select v from ids where k = 'monthA')) $$,
  'P0001', null, 'A review needs its sections before publishing');
update public.content_months set review = '{"working":"Reels","adjust":"Post earlier","focus":"Weekend offer"}'
 where id = (select v from ids where k = 'monthA');
select lives_ok($$ select public.publish_review((select v from ids where k = 'monthA')) $$, 'The account exec publishes the review');
select is((select locked from public.kpi_months where client_id = 'f0000000-0000-4000-8000-000000000001'),
  true, 'Publishing locks the KPIs');
select throws_ok(
  $$ update public.kpi_months set metrics = '{"reach":5}' where client_id = 'f0000000-0000-4000-8000-000000000001' $$,
  'P0001', null, 'Locked KPIs can''t be changed');
select throws_ok(
  $$ update public.content_months set review = '{"working":"Changed"}' where id = (select v from ids where k = 'monthA') $$,
  'P0001', null, 'A published review can''t be changed');
select throws_ok($$ select public.unpublish_review((select v from ids where k = 'monthA')) $$,
  '42501', null, 'Only the CEO unpublishes');

set local request.jwt.claims to '{"sub":"e0000000-0000-4000-8000-000000000011","role":"authenticated"}';
select is((select review ->> 'focus' from public.portal_months where id = (select v from ids where k = 'monthA')),
  'Weekend offer', 'The client sees the published review');
select isnt_empty($$ select 1 from public.notifications where title = 'Your November 2026 review is ready' $$,
  'The client is told the review is ready');

set local request.jwt.claims to '{"sub":"e0000000-0000-4000-8000-000000000001","role":"authenticated"}';
select lives_ok($$ select public.unpublish_review((select v from ids where k = 'monthA')) $$, 'The CEO unpublishes');
select is((select locked from public.kpi_months where client_id = 'f0000000-0000-4000-8000-000000000001'),
  false, 'Unpublishing unlocks the KPIs');

-- ---------------------------------------------------------------------------
-- Questionnaire links
-- ---------------------------------------------------------------------------

set local request.jwt.claims to '{"sub":"e0000000-0000-4000-8000-000000000002","role":"authenticated"}';
select throws_ok($$ select public.create_questionnaire_invite('f0000000-0000-4000-8000-000000000002') $$,
  '42501', null, 'An account exec can''t make a link for another account exec''s client');
select public.create_questionnaire_invite('f0000000-0000-4000-8000-000000000003');
select public.create_questionnaire_invite('f0000000-0000-4000-8000-000000000003');

reset role;
insert into ids select 'oldToken', id from public.questionnaire_invites
 where client_id = 'f0000000-0000-4000-8000-000000000003' order by created_at limit 1;
create temp table tokens as
  select row_number() over (order by created_at) as n, token from public.questionnaire_invites
  where client_id = 'f0000000-0000-4000-8000-000000000003';
grant select on tokens to anon;
-- Two files: one uploaded through the open link, one somewhere else.
insert into storage.objects (bucket_id, name)
select 'briefs', 'f0000000-0000-4000-8000-000000000003/questionnaire/' || token || '/logo.png' from tokens where n = 2;
insert into storage.objects (bucket_id, name) values ('briefs', 'f0000000-0000-4000-8000-000000000003/elsewhere/x.png');

set local role anon;
set local request.jwt.claims to '{"role":"anon"}';
select is((select state from public.open_questionnaire((select token from tokens where n = 1))),
  'expired', 'Making a new link expires the old one');
select results_eq($$ select state, business_name from public.open_questionnaire((select token from tokens where n = 2)) $$,
  $$ values ('open', 'P2 Client C') $$, 'The new link opens and names the business');
select is((select state from public.open_questionnaire('nope')), 'unknown', 'An unknown link says so');
select throws_ok($$ select * from public.questionnaire_invites $$, '42501', null, 'Signed out: links can''t be listed');
select is(public.questionnaire_upload_allowed(
    'f0000000-0000-4000-8000-000000000003/questionnaire/' || (select token from tokens where n = 2) || '/mood.jpg'),
  true, 'An open link may upload images');
select is(public.questionnaire_upload_allowed(
    'f0000000-0000-4000-8000-000000000001/questionnaire/' || (select token from tokens where n = 2) || '/mood.jpg'),
  false, 'A link can''t upload into another client''s folder');
select throws_ok(
  $$ select public.submit_questionnaire((select token from tokens where n = 2), '[]',
       '[{"path":"f0000000-0000-4000-8000-000000000003/elsewhere/x.png"}]') $$,
  'P0001', null, 'Only the link''s own uploads can be attached');
select lives_ok(
  $$ select public.submit_questionnaire((select token from tokens where n = 2),
       '[{"section":"Your business","question":"Business name","answer":"P2 Client C"}]',
       jsonb_build_array(jsonb_build_object('path',
         'f0000000-0000-4000-8000-000000000003/questionnaire/' || (select token from tokens where n = 2) || '/logo.png',
         'note', 'Like this')) ) $$,
  'The client sends the questionnaire');
select is((select state from public.open_questionnaire((select token from tokens where n = 2))),
  'used', 'The link works once');
select is(public.questionnaire_upload_allowed(
    'f0000000-0000-4000-8000-000000000003/questionnaire/' || (select token from tokens where n = 2) || '/late.jpg'),
  false, 'A used link can''t upload');

reset role;
select is((select answers -> 0 ->> 'answer' from public.brand_briefs where client_id = 'f0000000-0000-4000-8000-000000000003'),
  'P2 Client C', 'The answers are on the client''s brief');
select isnt_empty(
  $$ select 1 from public.notifications where user_id = 'e0000000-0000-4000-8000-000000000002'
     and title = 'Questionnaire answers arrived' $$,
  'The account exec is told the answers arrived');

-- ---------------------------------------------------------------------------
-- Activation by the account exec
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub":"e0000000-0000-4000-8000-000000000002","role":"authenticated"}';
select throws_ok($$ select public.activate_client('f0000000-0000-4000-8000-000000000003') $$,
  'P0001', null, 'A client activates only once the brand kit is approved');
reset role;
update public.brand_kits set status = 'approved' where client_id = 'f0000000-0000-4000-8000-000000000003';
set local role authenticated;
set local request.jwt.claims to '{"sub":"e0000000-0000-4000-8000-000000000003","role":"authenticated"}';
select throws_ok($$ select public.activate_client('f0000000-0000-4000-8000-000000000003') $$,
  '42501', null, 'Another account exec can''t activate the client');
set local request.jwt.claims to '{"sub":"e0000000-0000-4000-8000-000000000002","role":"authenticated"}';
select throws_ok($$ update public.clients set status = 'active' where id = 'f0000000-0000-4000-8000-000000000003' $$,
  '42501', null, 'The account exec can''t change the status directly');
select lives_ok($$ select public.activate_client('f0000000-0000-4000-8000-000000000003') $$,
  'The account exec activates the client once the kit is approved');
select results_eq(
  $$ select status::text, start_date from public.clients where id = 'f0000000-0000-4000-8000-000000000003' $$,
  $$ values ('active', public.today_gaborone()) $$, 'The client is active from today');

-- ---------------------------------------------------------------------------
-- The "waiting over 2 working days" reminder
-- ---------------------------------------------------------------------------

reset role;
select is(public.working_days_between('2026-10-23 07:00+00', '2026-10-27 07:00+00'), 2,
  'Friday to Tuesday is 2 working days');
-- Put client B's P01 in client review four working days ago.
update public.content_months set plan_status = 'approved' where id = (select v from ids where k = 'monthB');
update public.content_items set status = 'client_review', shown_to_client_at = now() - interval '7 days'
 where id = (select v from ids where k = 'itemBP01');
insert into public.status_events (client_id, entity_type, entity_id, from_status, to_status, actor_kind, created_at)
values ('f0000000-0000-4000-8000-000000000002', 'content_item', (select v from ids where k = 'itemBP01'),
        'internal_review', 'client_review', 'staff', now() - interval '7 days');
select is(public.notify_stale_client_reviews(), 1, 'One reminder for the item that has waited');
select is(public.notify_stale_client_reviews(), 0, 'The reminder isn''t repeated');

-- ---------------------------------------------------------------------------
-- Every Phase 2 table: an account exec sees nothing of another's client, a
-- client nothing of another client's
-- ---------------------------------------------------------------------------

reset role;
insert into public.kpi_months (client_id, month) values ('f0000000-0000-4000-8000-000000000002', '2026-11-01');
insert into public.brand_briefs (client_id, answers) values ('f0000000-0000-4000-8000-000000000002', '[]');
set local role authenticated;
set local request.jwt.claims to '{"sub":"e0000000-0000-4000-8000-000000000003","role":"authenticated"}';
select public.create_campaign((select v from ids where k = 'monthB'));
set local request.jwt.claims to '{"sub":"e0000000-0000-4000-8000-000000000002","role":"authenticated"}';
select is_empty(
  $$ select 'kit' from public.brand_kits where client_id = 'f0000000-0000-4000-8000-000000000002'
     union all select 'brief' from public.brand_briefs where client_id = 'f0000000-0000-4000-8000-000000000002'
     union all select 'campaign' from public.campaigns where client_id = 'f0000000-0000-4000-8000-000000000002'
     union all select 'kpi' from public.kpi_months where client_id = 'f0000000-0000-4000-8000-000000000002'
     union all select 'calc' from public.kpi_months_calc where client_id = 'f0000000-0000-4000-8000-000000000002'
     union all select 'event' from public.status_events where client_id = 'f0000000-0000-4000-8000-000000000002' $$,
  'AE one reads no row of client B in any Phase 2 table');
select is_empty($$ select 1 from public.kpi_months where client_id is null $$,
  'Only the CEO reads Midas''s own KPIs');
set local request.jwt.claims to '{"sub":"e0000000-0000-4000-8000-000000000005","role":"authenticated"}';
select is((select count(*)::int from public.campaigns where client_id::text like 'f0000000-%'), 2,
  'Designers read every client''s campaigns');
select throws_ok($$ insert into public.kpi_months (client_id, month) values ('f0000000-0000-4000-8000-000000000001', '2027-01-01') $$,
  '42501', null, 'Designers can''t enter KPIs');
set local request.jwt.claims to '{"sub":"e0000000-0000-4000-8000-000000000012","role":"authenticated"}';
select is_empty(
  $$ select 'kit' from public.brand_kits where client_id <> 'f0000000-0000-4000-8000-000000000002'
     union all select 'brief' from public.brand_briefs where client_id <> 'f0000000-0000-4000-8000-000000000002'
     union all select 'month' from public.portal_months where client_id <> 'f0000000-0000-4000-8000-000000000002'
     union all select 'campaign' from public.portal_campaigns where client_id <> 'f0000000-0000-4000-8000-000000000002' $$,
  'Client B reads nothing of any other client');
select is_empty($$ select 1 from public.campaigns union all select 1 from public.kpi_months $$,
  'Clients don''t read campaigns or KPIs directly');
select is_empty($$ select 1 from public.portal_campaigns $$, 'A draft brief stays out of the portal');

select * from finish();
rollback;
