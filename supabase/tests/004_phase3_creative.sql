-- Phase 3: brand kit, board lock, timers, time reports, inspiration,
-- comments, suggestions and storage visibility (04-creative.md).
-- Rolled back at the end.

begin;
create extension if not exists pgtap with schema extensions;
select plan(71);

-- ---------------------------------------------------------------------------
-- Fixtures (as the database owner)
-- ---------------------------------------------------------------------------

insert into auth.users (id, email, aud, role) values
  ('e3000000-0000-4000-8000-000000000001', 'p3.ceo@example.com', 'authenticated', 'authenticated'),
  ('e3000000-0000-4000-8000-000000000002', 'p3.ae1@example.com', 'authenticated', 'authenticated'),
  ('e3000000-0000-4000-8000-000000000004', 'p3.cd@example.com', 'authenticated', 'authenticated'),
  ('e3000000-0000-4000-8000-000000000005', 'p3.des@example.com', 'authenticated', 'authenticated'),
  ('e3000000-0000-4000-8000-000000000006', 'p3.des2@example.com', 'authenticated', 'authenticated'),
  ('e3000000-0000-4000-8000-000000000011', 'p3.ck@example.com', 'authenticated', 'authenticated'),
  ('e3000000-0000-4000-8000-000000000012', 'p3.cl@example.com', 'authenticated', 'authenticated');

insert into public.profiles (id, full_name, email, role) values
  ('e3000000-0000-4000-8000-000000000001', 'P3 CEO', 'p3.ceo@example.com', 'ceo'),
  ('e3000000-0000-4000-8000-000000000002', 'P3 AE', 'p3.ae1@example.com', 'account_exec'),
  ('e3000000-0000-4000-8000-000000000004', 'P3 CD', 'p3.cd@example.com', 'creative_director'),
  ('e3000000-0000-4000-8000-000000000005', 'P3 Designer', 'p3.des@example.com', 'designer'),
  ('e3000000-0000-4000-8000-000000000006', 'P3 Designer Two', 'p3.des2@example.com', 'designer');

update public.settings set max_active_clients = 1000 where id = 1;

-- K: onboarding, kit in progress. L: active, kit signed off. M: active, kit not signed off.
insert into public.clients (id, name, status, account_exec_id) values
  ('f3000000-0000-4000-8000-00000000000a', 'P3 Kit Client', 'onboarding', 'e3000000-0000-4000-8000-000000000002'),
  ('f3000000-0000-4000-8000-00000000000b', 'P3 Live Client', 'active', 'e3000000-0000-4000-8000-000000000002'),
  ('f3000000-0000-4000-8000-00000000000c', 'P3 Unsigned Client', 'active', 'e3000000-0000-4000-8000-000000000002');
update public.brand_kits set status = 'approved' where client_id = 'f3000000-0000-4000-8000-00000000000b';

insert into public.client_users (user_id, client_id, full_name, email) values
  ('e3000000-0000-4000-8000-000000000011', 'f3000000-0000-4000-8000-00000000000a', 'Kagiso Kit', 'p3.ck@example.com'),
  ('e3000000-0000-4000-8000-000000000012', 'f3000000-0000-4000-8000-00000000000b', 'Lesedi Live', 'p3.cl@example.com');

create temp table ids (k text primary key, v uuid);
grant select on ids to anon, authenticated;

-- Months for L and M, with approved calendars.
set local role authenticated;
set local request.jwt.claims to '{"sub":"e3000000-0000-4000-8000-000000000002","role":"authenticated"}';
select public.start_month('f3000000-0000-4000-8000-00000000000b', '2026-11-01');
select public.start_month('f3000000-0000-4000-8000-00000000000c', '2026-11-01');
reset role;
update public.content_months set plan_status = 'approved'
 where client_id in ('f3000000-0000-4000-8000-00000000000b', 'f3000000-0000-4000-8000-00000000000c');
insert into ids select 'L' || slot_code, id from public.content_items where client_id = 'f3000000-0000-4000-8000-00000000000b';
insert into ids select 'M' || slot_code, id from public.content_items where client_id = 'f3000000-0000-4000-8000-00000000000c';

-- ---------------------------------------------------------------------------
-- Brand kit fields
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub":"e3000000-0000-4000-8000-000000000005","role":"authenticated"}';
select lives_ok(
  $$ update public.brand_kits set colors = '{"primary":"#0E2A36","secondary":"#B88A35","tertiary":"#F2F4F5","accent":"#2E7D4F"}',
       heading_font = 'Archivo', body_font = 'Figtree', voice = 'Warm and plain'
     where client_id = 'f3000000-0000-4000-8000-00000000000a' $$,
  'A designer sets the colours, fonts and voice');
select throws_ok($$ update public.brand_kits set colors = '{"primary":"navy"}' where client_id = 'f3000000-0000-4000-8000-00000000000a' $$,
  '23514', null, 'Colours must be #RRGGBB');
select throws_ok($$ update public.brand_kits set status = 'approved' where client_id = 'f3000000-0000-4000-8000-00000000000a' $$,
  '42501', null, 'The kit''s status can''t be set directly');

set local request.jwt.claims to '{"sub":"e3000000-0000-4000-8000-000000000002","role":"authenticated"}';
update public.brand_kits set voice = 'Changed by AE' where client_id = 'f3000000-0000-4000-8000-00000000000a';
reset role;
select is((select voice from public.brand_kits where client_id = 'f3000000-0000-4000-8000-00000000000a'),
  'Warm and plain', 'The account exec reads the kit but can''t edit it');

-- ---------------------------------------------------------------------------
-- Brand kit files: each slot takes only its own file types
-- ---------------------------------------------------------------------------

select ok(public.kit_slot_accepts('logo_full_svg', 'Logo.SVG'), 'An SVG logo slot takes .svg');
select ok(not public.kit_slot_accepts('logo_full_svg', 'logo.png'), 'An SVG logo slot refuses .png');
select ok(public.kit_slot_accepts('icon_white_pdf', 'icon.pdf'), 'A PDF icon slot takes .pdf');
select ok(public.kit_slot_accepts('font_body_700', 'Body-Bold.woff2'), 'A font slot takes .woff2');
select ok(not public.kit_slot_accepts('font_body_700', 'Body.zip'), 'A font slot refuses .zip');
select ok(not public.kit_slot_accepts('guide_pdf', 'guide.png'), 'The guide slot takes only PDF');
select ok(public.kit_slot_accepts('extra', 'pattern.jpg'), 'Extras take JPG');
select ok(not public.kit_slot_accepts('logo_gold_svg', 'logo.svg'), 'Unknown slots are refused');

set local role authenticated;
set local request.jwt.claims to '{"sub":"e3000000-0000-4000-8000-000000000005","role":"authenticated"}';
select lives_ok(
  $$ insert into public.brand_kit_files (client_id, slot, storage_path, file_name, size_bytes)
     values ('f3000000-0000-4000-8000-00000000000a', 'logo_full_svg', 'f3000000-0000-4000-8000-00000000000a/logo_full_svg/logo.svg', 'logo.svg', 1200) $$,
  'A designer adds a logo file');
select throws_ok(
  $$ insert into public.brand_kit_files (client_id, slot, storage_path, file_name, size_bytes)
     values ('f3000000-0000-4000-8000-00000000000a', 'logo_full_svg', 'f3000000-0000-4000-8000-00000000000a/logo_full_svg/two.svg', 'two.svg', 1200) $$,
  '23505', null, 'A fixed slot holds one file');
select throws_ok(
  $$ insert into public.brand_kit_files (client_id, slot, storage_path, file_name, size_bytes)
     values ('f3000000-0000-4000-8000-00000000000a', 'logo_full_png', 'f3000000-0000-4000-8000-00000000000a/logo_full_png/logo.svg', 'logo.svg', 1200) $$,
  '23514', null, 'A file in the wrong slot is refused');
select throws_ok(
  $$ insert into public.brand_kit_files (client_id, slot, storage_path, file_name, size_bytes)
     values ('f3000000-0000-4000-8000-00000000000a', 'guide_pdf', 'f3000000-0000-4000-8000-00000000000b/guide_pdf/g.pdf', 'g.pdf', 1200) $$,
  '23514', null, 'The storage path must be the client''s own slot folder');
select lives_ok(
  $$ insert into public.brand_kit_files (client_id, slot, storage_path, file_name, size_bytes) values
       ('f3000000-0000-4000-8000-00000000000a', 'font_heading_700', 'f3000000-0000-4000-8000-00000000000a/font_heading_700/h.woff2', 'h.woff2', 900),
       ('f3000000-0000-4000-8000-00000000000a', 'guide_pdf', 'f3000000-0000-4000-8000-00000000000a/guide_pdf/guide.pdf', 'guide.pdf', 900),
       ('f3000000-0000-4000-8000-00000000000a', 'extra', 'f3000000-0000-4000-8000-00000000000a/extra/p1.png', 'p1.png', 900),
       ('f3000000-0000-4000-8000-00000000000a', 'extra', 'f3000000-0000-4000-8000-00000000000a/extra/p2.png', 'p2.png', 900) $$,
  'Fonts, the guide and any number of extras');
select is(public.brand_kit_progress('f3000000-0000-4000-8000-00000000000a'), 7,
  'Progress counts 1 logo + 4 colours + the heading font + the guide (extras don''t count)');
select ok(public.kit_object_writable('f3000000-0000-4000-8000-00000000000a/icon_black_png/icon.png'),
  'A designer may upload a PNG into the PNG icon folder');
select ok(not public.kit_object_writable('f3000000-0000-4000-8000-00000000000a/icon_black_png/icon.svg'),
  'Storage refuses an SVG in the PNG icon folder');

set local request.jwt.claims to '{"sub":"e3000000-0000-4000-8000-000000000002","role":"authenticated"}';
select throws_ok(
  $$ insert into public.brand_kit_files (client_id, slot, storage_path, file_name, size_bytes, uploaded_by)
     values ('f3000000-0000-4000-8000-00000000000a', 'logo_black_svg', 'f3000000-0000-4000-8000-00000000000a/logo_black_svg/l.svg', 'l.svg', 1, 'e3000000-0000-4000-8000-000000000002') $$,
  '42501', null, 'The account exec can''t add kit files');

set local request.jwt.claims to '{"sub":"e3000000-0000-4000-8000-000000000011","role":"authenticated"}';
select is_empty($$ select 1 from public.brand_kit_files $$, 'Before sign-off the client sees no kit files');
select ok(not public.kit_object_readable('f3000000-0000-4000-8000-00000000000a/logo_full_svg/logo.svg'),
  'Before sign-off the client can''t download kit files');

-- ---------------------------------------------------------------------------
-- Brand kit sign-off
-- ---------------------------------------------------------------------------

set local request.jwt.claims to '{"sub":"e3000000-0000-4000-8000-000000000005","role":"authenticated"}';
select lives_ok($$ select public.set_brand_kit_status('f3000000-0000-4000-8000-00000000000a', 'in_design') $$, 'Designer: kit planned to in design');
select lives_ok($$ select public.set_brand_kit_status('f3000000-0000-4000-8000-00000000000a', 'internal_review') $$, 'Designer: kit to internal review');
select throws_ok($$ select public.set_brand_kit_status('f3000000-0000-4000-8000-00000000000a', 'client_review') $$,
  '42501', null, 'Only the creative director sends the kit to the client');
set local request.jwt.claims to '{"sub":"e3000000-0000-4000-8000-000000000004","role":"authenticated"}';
select lives_ok($$ select public.set_brand_kit_status('f3000000-0000-4000-8000-00000000000a', 'client_review') $$, 'Creative director: kit to the client');
set local request.jwt.claims to '{"sub":"e3000000-0000-4000-8000-000000000011","role":"authenticated"}';
select set_eq($$ select slot from public.brand_kit_files $$, $$ values ('logo_full_svg'), ('guide_pdf') $$,
  'At sign-off the client sees the logo, icon and guide files, not fonts or extras');
select ok(public.kit_object_readable('f3000000-0000-4000-8000-00000000000a/logo_full_svg/logo.svg'),
  'At sign-off the client can preview the logo');
select ok(not public.kit_object_readable('f3000000-0000-4000-8000-00000000000a/font_heading_700/h.woff2'),
  'But not the fonts until they sign off');
set local request.jwt.claims to '{"sub":"e3000000-0000-4000-8000-000000000002","role":"authenticated"}';
select throws_ok($$ select public.set_brand_kit_status('f3000000-0000-4000-8000-00000000000a', 'approved') $$,
  '42501', null, 'The account exec can''t sign off for the client');
set local request.jwt.claims to '{"sub":"e3000000-0000-4000-8000-000000000012","role":"authenticated"}';
select throws_ok($$ select public.set_brand_kit_status('f3000000-0000-4000-8000-00000000000a', 'approved') $$,
  'P0002', null, 'Another client can''t sign off this kit');
set local request.jwt.claims to '{"sub":"e3000000-0000-4000-8000-000000000011","role":"authenticated"}';
select throws_ok($$ select public.set_brand_kit_status('f3000000-0000-4000-8000-00000000000a', 'changes_requested', '') $$,
  '22023', null, 'Asking for changes needs a note');
select lives_ok($$ select public.set_brand_kit_status('f3000000-0000-4000-8000-00000000000a', 'approved') $$, 'The client signs off the kit');
select isnt_empty($$ select 1 from public.brand_kit_files $$, 'After sign-off the client sees the kit files');
select ok(public.kit_object_readable('f3000000-0000-4000-8000-00000000000a/logo_full_svg/logo.svg'),
  'After sign-off the client can download kit files');
reset role;
select results_eq(
  $$ select status::text, signed_off_by, signed_off_at is not null from public.brand_kits where client_id = 'f3000000-0000-4000-8000-00000000000a' $$,
  $$ values ('approved', 'Kagiso Kit', true) $$, 'Sign-off records the client user''s name and the time');
select isnt_empty(
  $$ select 1 from public.notifications where user_id = 'e3000000-0000-4000-8000-000000000002' and title = 'P3 Kit Client signed off their brand kit' $$,
  'The account exec is told the client can be activated');
select is((select count(*)::int from public.status_events where entity_type = 'brand_kit'
           and client_id = 'f3000000-0000-4000-8000-00000000000a'), 4, 'Every kit move is in the audit trail');

-- ---------------------------------------------------------------------------
-- The board stays locked until the kit is signed off
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub":"e3000000-0000-4000-8000-000000000005","role":"authenticated"}';
select throws_ok($$ select public.set_content_status((select v from ids where k = 'MP01'), 'in_design') $$,
  'P0001', 'The board opens once the client signs off their brand kit.', 'No work starts before the kit is signed off');

-- ---------------------------------------------------------------------------
-- Timers: one running per person, ever
-- ---------------------------------------------------------------------------

select lives_ok($$ select public.start_timer((select v from ids where k = 'LP01')) $$, 'A designer starts a timer on an item');
select is((select status::text from public.content_items where id = (select v from ids where k = 'LP01')),
  'in_design', 'Starting a timer on a planned item moves it to in design');
select lives_ok($$ select public.start_timer(p_kit_client_id => 'f3000000-0000-4000-8000-00000000000b') $$, 'Then a timer on a brand kit');
select is((select count(*)::int from public.time_entries where user_id = 'e3000000-0000-4000-8000-000000000005' and ended_at is null),
  1, 'Starting the second timer stopped the first');
reset role;
select throws_ok(
  $$ insert into public.time_entries (user_id, client_id, is_brand_kit) values ('e3000000-0000-4000-8000-000000000005', 'f3000000-0000-4000-8000-00000000000b', true) $$,
  '23505', null, 'The database refuses a second running timer, whatever starts it');
set local role authenticated;
select lives_ok($$ select public.stop_timer() $$, 'The designer stops the timer');
select is((select count(*)::int from public.time_entries where user_id = 'e3000000-0000-4000-8000-000000000005' and ended_at is null and minutes is null),
  0, 'A stopped timer has its minutes');
select throws_ok($$ select public.add_manual_time(30, ' ', (select v from ids where k = 'LP02')) $$,
  '22023', null, 'Manual time needs a note');
select lives_ok($$ select public.add_manual_time(45, 'Forgot the timer', (select v from ids where k = 'LP02')) $$, 'Manual time with a note');
set local request.jwt.claims to '{"sub":"e3000000-0000-4000-8000-000000000006","role":"authenticated"}';
select public.add_manual_time(20, 'Second designer', (select v from ids where k = 'LP02'));
set local request.jwt.claims to '{"sub":"e3000000-0000-4000-8000-000000000002","role":"authenticated"}';
select throws_ok($$ select public.start_timer((select v from ids where k = 'LP03')) $$, '42501', null, 'Account execs don''t track time');

-- Who sees what.
set local request.jwt.claims to '{"sub":"e3000000-0000-4000-8000-000000000005","role":"authenticated"}';
select is_empty($$ select 1 from public.time_entries where user_id <> auth.uid() $$, 'A designer sees only their own time rows');
select is((select sum(minutes)::int from public.client_time('f3000000-0000-4000-8000-00000000000b', date_trunc('month', public.today_gaborone())::date)
           where content_item_id = (select v from ids where k = 'LP02')),
  65, 'But sees everyone''s totals for a client');
select is((select count(distinct user_id)::int from public.team_time(date_trunc('month', public.today_gaborone())::date)),
  1, 'Team time shows a designer only themselves');
set local request.jwt.claims to '{"sub":"e3000000-0000-4000-8000-000000000004","role":"authenticated"}';
select is((select count(distinct user_id)::int from public.time_entries where user_id::text like 'e3000000-%'),
  2, 'The creative director sees everyone''s time');
set local request.jwt.claims to '{"sub":"e3000000-0000-4000-8000-000000000012","role":"authenticated"}';
select is_empty($$ select 1 from public.time_entries $$, 'Clients never see time');

-- ---------------------------------------------------------------------------
-- Inspiration: staff only; uploaders delete their own, the CD any
-- ---------------------------------------------------------------------------

set local request.jwt.claims to '{"sub":"e3000000-0000-4000-8000-000000000005","role":"authenticated"}';
insert into public.inspiration (storage_path, note, tags) values ('a3000000-0000-4000-8000-000000000001/x.png', 'Nice grid', '{Layout}');
select throws_ok($$ insert into public.inspiration (storage_path, tags) values ('a3000000-0000-4000-8000-000000000002/y.png', '{Memes}') $$,
  '23514', null, 'Only the board''s tags');
set local request.jwt.claims to '{"sub":"e3000000-0000-4000-8000-000000000006","role":"authenticated"}';
delete from public.inspiration where note = 'Nice grid';
reset role;
select isnt_empty($$ select 1 from public.inspiration where note = 'Nice grid' $$, 'Another designer can''t delete it');
set local role authenticated;
set local request.jwt.claims to '{"sub":"e3000000-0000-4000-8000-000000000012","role":"authenticated"}';
select is_empty($$ select 1 from public.inspiration $$, 'Clients don''t see the inspiration board');
set local request.jwt.claims to '{"sub":"e3000000-0000-4000-8000-000000000004","role":"authenticated"}';
delete from public.inspiration where note = 'Nice grid';
select is_empty($$ select 1 from public.inspiration where note = 'Nice grid' $$, 'The creative director can delete any image');

-- ---------------------------------------------------------------------------
-- Comments the client can see come from the CD, AE or CEO only
-- ---------------------------------------------------------------------------

set local request.jwt.claims to '{"sub":"e3000000-0000-4000-8000-000000000005","role":"authenticated"}';
select throws_ok(
  $$ insert into public.comments (client_id, entity_type, entity_id, body, author_id, author_kind, visible_to_client)
     values ('f3000000-0000-4000-8000-00000000000b', 'content_item', (select v from ids where k = 'LP01'), 'Hi', auth.uid(), 'staff', true) $$,
  '42501', null, 'A designer can''t write to the client');
set local request.jwt.claims to '{"sub":"e3000000-0000-4000-8000-000000000004","role":"authenticated"}';
select lives_ok(
  $$ insert into public.comments (client_id, entity_type, entity_id, body, author_id, author_kind, visible_to_client)
     values ('f3000000-0000-4000-8000-00000000000b', 'content_item', (select v from ids where k = 'LP01'), 'Updated as asked', auth.uid(), 'staff', true) $$,
  'The creative director replies to the client');

-- ---------------------------------------------------------------------------
-- Suggestions: only empty fields, marked until edited; 30 a day
-- ---------------------------------------------------------------------------

set local request.jwt.claims to '{"sub":"e3000000-0000-4000-8000-000000000005","role":"authenticated"}';
update public.content_items set caption = 'My own caption' where id = (select v from ids where k = 'LP01');
select results_eq(
  $$ select public.apply_suggestions((select v from ids where k = 'LP01'), 'Flat lay in primary navy', 'Fresh every morning', 'Claude caption', '#Gaborone') $$,
  $$ values (array['visual', 'graphic_copy', 'hashtags']) $$, 'Suggestions fill only the empty fields');
select results_eq(
  $$ select caption, suggested_fields from public.content_items where id = (select v from ids where k = 'LP01') $$,
  $$ values ('My own caption', array['visual', 'graphic_copy', 'hashtags']) $$, 'A field with text is never overwritten');
update public.content_items set visual = 'My edit' where id = (select v from ids where k = 'LP01');
select is((select suggested_fields from public.content_items where id = (select v from ids where k = 'LP01')),
  array['graphic_copy', 'hashtags'], 'Editing a suggested field removes its "suggested" mark');
select is(public.claim_suggestion_call('f3000000-0000-4000-8000-00000000000b', 4), 29, 'A suggestion call leaves 29 today');
reset role;
insert into public.suggestion_calls (user_id, client_id, items)
select 'e3000000-0000-4000-8000-000000000005', 'f3000000-0000-4000-8000-00000000000b', 1 from generate_series(1, 29);
set local role authenticated;
select throws_ok($$ select public.claim_suggestion_call('f3000000-0000-4000-8000-00000000000b', 1) $$,
  'P0001', null, 'The 31st call today is refused');

-- ---------------------------------------------------------------------------
-- Designer notes, and who sees a content file
-- ---------------------------------------------------------------------------

select lives_ok($$ select public.save_design_notes('f3000000-0000-4000-8000-00000000000b', 'Use the river motif') $$, 'A designer writes designer notes');
set local request.jwt.claims to '{"sub":"e3000000-0000-4000-8000-000000000002","role":"authenticated"}';
select throws_ok($$ select public.save_design_notes('f3000000-0000-4000-8000-00000000000b', 'x') $$, '42501', null, 'The account exec can''t');

set local request.jwt.claims to '{"sub":"e3000000-0000-4000-8000-000000000012","role":"authenticated"}';
select ok(not public.content_object_readable('f3000000-0000-4000-8000-00000000000b/2026-11/P02/final.png'),
  'A client can''t see an item''s files before it''s shown to them');
reset role;
update public.content_items set shown_to_client_at = now() where id = (select v from ids where k = 'LP02');
set local role authenticated;
select ok(public.content_object_readable('f3000000-0000-4000-8000-00000000000b/2026-11/P02/final.png'),
  'Once shown, the client can see it');
select ok(not public.content_object_readable('f3000000-0000-4000-8000-00000000000c/2026-11/P02/final.png'),
  'But never another client''s');

select * from finish();
rollback;
