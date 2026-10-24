-- Palette templates in the palette builder. Rolled back at the end.

begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, email, aud, role) values
  ('e7000000-0000-4000-8000-000000000004', 'p7.cd@example.com', 'authenticated', 'authenticated'),
  ('e7000000-0000-4000-8000-000000000005', 'p7.des@example.com', 'authenticated', 'authenticated');
insert into public.profiles (id, full_name, email, role) values
  ('e7000000-0000-4000-8000-000000000004', 'P7 CD', 'p7.cd@example.com', 'creative_director'),
  ('e7000000-0000-4000-8000-000000000005', 'P7 Designer', 'p7.des@example.com', 'designer');

select is((select count(*)::int from public.palette_templates where created_by is null), 8, 'The eight prototype templates are there');

set local role authenticated;
set local request.jwt.claims to '{"sub":"e7000000-0000-4000-8000-000000000004","role":"authenticated"}';
select lives_ok(
  $$ insert into public.palette_templates (name, primary_color, secondary_color, tertiary_color, accent_color)
     values ('Kalahari dusk', '#5A2E1E', '#C2703D', '#F1D9B5', '#2E7D4F') $$,
  'The creative director adds a template');
select throws_ok(
  $$ insert into public.palette_templates (name, primary_color, secondary_color, tertiary_color, accent_color)
     values ('Kalahari dusk', '#000000', '#000000', '#000000', '#000000') $$,
  '23505', null, 'Template names are unique');
select throws_ok(
  $$ insert into public.palette_templates (name, primary_color, secondary_color, tertiary_color, accent_color)
     values ('Bad', 'red', '#000000', '#000000', '#000000') $$,
  '23514', null, 'Colours are #RRGGBB');

set local request.jwt.claims to '{"sub":"e7000000-0000-4000-8000-000000000005","role":"authenticated"}';
select is((select count(*)::int from public.palette_templates where name = 'Kalahari dusk'), 1, 'Designers see the new template');
select throws_ok(
  $$ insert into public.palette_templates (name, primary_color, secondary_color, tertiary_color, accent_color)
     values ('Mine', '#000000', '#000000', '#000000', '#000000') $$,
  '42501', null, 'Designers can''t add templates');
delete from public.palette_templates where name = 'Calm blues';
select is((select count(*)::int from public.palette_templates where name = 'Calm blues'), 1, 'or remove them');

set local request.jwt.claims to '{"sub":"e7000000-0000-4000-8000-000000000004","role":"authenticated"}';
delete from public.palette_templates where name = 'Calm blues';
select is_empty($$ select 1 from public.palette_templates where name = 'Calm blues' $$, 'The creative director removes an old template');

reset role;
set local role anon;
select throws_ok($$ select * from public.palette_templates $$, '42501', null, 'Signed out: nothing');

select * from finish();
rollback;
