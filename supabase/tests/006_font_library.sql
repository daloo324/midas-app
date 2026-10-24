-- The shared font library (Fonts & pairings). Rolled back at the end.

begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (id, email, aud, role) values
  ('e6000000-0000-4000-8000-000000000004', 'p6.cd@example.com', 'authenticated', 'authenticated'),
  ('e6000000-0000-4000-8000-000000000005', 'p6.des@example.com', 'authenticated', 'authenticated'),
  ('e6000000-0000-4000-8000-000000000002', 'p6.ae@example.com', 'authenticated', 'authenticated');
insert into public.profiles (id, full_name, email, role) values
  ('e6000000-0000-4000-8000-000000000004', 'P6 CD', 'p6.cd@example.com', 'creative_director'),
  ('e6000000-0000-4000-8000-000000000005', 'P6 Designer', 'p6.des@example.com', 'designer'),
  ('e6000000-0000-4000-8000-000000000002', 'P6 AE', 'p6.ae@example.com', 'account_exec');

set local role authenticated;
set local request.jwt.claims to '{"sub":"e6000000-0000-4000-8000-000000000004","role":"authenticated"}';
select lives_ok(
  $$ insert into public.library_fonts (family, weight, storage_path, file_name, size_bytes)
     values ('Kgosi Sans', 700, 'a/kgosi-bold.woff2', 'kgosi-bold.woff2', 1000) $$,
  'The creative director adds a font');
select throws_ok(
  $$ insert into public.library_fonts (family, weight, storage_path, file_name, size_bytes)
     values ('Kgosi Sans', 700, 'b/again.woff2', 'again.woff2', 1000) $$,
  '23505', null, 'One file per family, weight and style');
select throws_ok(
  $$ insert into public.library_fonts (family, weight, storage_path, file_name, size_bytes)
     values ('Kgosi Sans', 400, 'c/kgosi.zip', 'kgosi.zip', 1000) $$,
  '23514', null, 'Only font files');
select throws_ok(
  $$ insert into public.library_fonts (family, weight, storage_path, file_name, size_bytes)
     values ('Bad''; } x', 400, 'd/x.ttf', 'x.ttf', 1000) $$,
  '23514', null, 'Family names are letters, numbers, spaces and hyphens');
select lives_ok(
  $$ insert into public.library_pairings (heading_family, body_family, style, good_for)
     values ('Kgosi Sans', 'Figtree', 'Clean modern', 'Local retail') $$,
  'The creative director adds a pairing');
select ok((select public.manages_font_library()), 'and manages the library');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name) values ('fonts', 'a/kgosi-bold.woff2') $$,
  'The creative director uploads a font file');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('fonts', 'a/script.js') $$,
  '42501', null, 'Only font files go in the fonts bucket');

set local request.jwt.claims to '{"sub":"e6000000-0000-4000-8000-000000000005","role":"authenticated"}';
select is((select count(*)::int from public.library_pairings where good_for = 'Local retail'), 1, 'Designers see the new pairing');
select throws_ok(
  $$ insert into public.library_pairings (heading_family, body_family, style) values ('Lora', 'Kgosi Sans', 'Classic serif') $$,
  '42501', null, 'Designers can''t add pairings');
delete from public.library_fonts where family = 'Kgosi Sans';
select is((select count(*)::int from public.library_fonts where family = 'Kgosi Sans'), 1, 'or remove library fonts');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('fonts', 'b/mine.ttf') $$,
  '42501', null, 'or upload font files');

set local request.jwt.claims to '{"sub":"e6000000-0000-4000-8000-000000000004","role":"authenticated"}';
delete from public.library_pairings where good_for = 'Local retail';
select is_empty($$ select 1 from public.library_pairings where good_for = 'Local retail' $$, 'The creative director removes a pairing');

reset role;
set local role anon;
select throws_ok($$ select * from public.library_fonts $$, '42501', null, 'Signed out: nothing');

select * from finish();
rollback;
