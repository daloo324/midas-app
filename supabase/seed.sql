-- Sample data for LOCAL development only (applied by `supabase db reset`).
-- Everything here is fake. The password below is public (this repo is public)
-- and only ever exists on a local database. The hosted project is seeded by
-- scripts/seed-sample.ts, which takes its password from .env.local instead.
-- Keep the two in step.
--
-- Local password for every sample account: midas-local-2026

-- ---------------------------------------------------------------------------
-- Auth users
-- ---------------------------------------------------------------------------

with people (id, email) as (
  values
    ('10000000-0000-4000-8000-000000000001'::uuid, 'ceo@example.com'),
    ('10000000-0000-4000-8000-000000000002'::uuid, 'ae.one@example.com'),
    ('10000000-0000-4000-8000-000000000003'::uuid, 'ae.two@example.com'),
    ('10000000-0000-4000-8000-000000000004'::uuid, 'creative.director@example.com'),
    ('10000000-0000-4000-8000-000000000005'::uuid, 'designer@example.com'),
    ('10000000-0000-4000-8000-000000000101'::uuid, 'client.coffee@example.com')
)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
)
select
  '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email,
  extensions.crypt('midas-local-2026', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
  '', '', '', '', '', '', '', ''
from people;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email', now(), now(), now()
from auth.users u
where u.email like '%@example.com';

-- ---------------------------------------------------------------------------
-- Staff
-- ---------------------------------------------------------------------------

insert into public.profiles (id, full_name, email, role) values
  ('10000000-0000-4000-8000-000000000001', 'Sample CEO', 'ceo@example.com', 'ceo'),
  ('10000000-0000-4000-8000-000000000002', 'Sample Account Exec One', 'ae.one@example.com', 'account_exec'),
  ('10000000-0000-4000-8000-000000000003', 'Sample Account Exec Two', 'ae.two@example.com', 'account_exec'),
  ('10000000-0000-4000-8000-000000000004', 'Sample Creative Director', 'creative.director@example.com', 'creative_director'),
  ('10000000-0000-4000-8000-000000000005', 'Sample Designer', 'designer@example.com', 'designer');

-- ---------------------------------------------------------------------------
-- Clients: two for account exec one, one for account exec two
-- ---------------------------------------------------------------------------

insert into public.clients (
  id, name, client_code, industry, status, account_exec_id, service_id, monthly_fee,
  start_date, contact_name, contact_role, contact_email, contact_phone, platforms, main_goal, notes
)
select
  c.id, c.name, c.code, c.industry, c.status::public.client_status, c.ae, s.id, s.price,
  c.start_date, c.contact, c.contact_role, c.contact_email, c.phone, c.platforms, c.goal::public.goal_category,
  'Sample client. Not a real business.'
from (
  values
    ('20000000-0000-4000-8000-000000000001'::uuid, 'Sample Coffee Co', 'MM-SCC-1001', 'Food and drink', 'active',
      '10000000-0000-4000-8000-000000000002'::uuid, date '2026-09-01', 'Sample Coffee Contact', 'Owner',
      'client.coffee@example.com', '+267 7100 0001', array['facebook', 'instagram'], 'visibility'),
    ('20000000-0000-4000-8000-000000000002'::uuid, 'Demo Fitness Studio', 'MM-DFS-1002', 'Health and fitness', 'onboarding',
      '10000000-0000-4000-8000-000000000002'::uuid, null, 'Demo Fitness Contact', 'Manager',
      'demo.fitness@example.com', '+267 7100 0002', array['instagram', 'facebook'], 'engagement'),
    ('20000000-0000-4000-8000-000000000003'::uuid, 'Example Auto Parts', 'MM-EAP-1003', 'Retail', 'active',
      '10000000-0000-4000-8000-000000000003'::uuid, date '2026-08-01', 'Example Auto Contact', 'Marketing lead',
      'example.auto@example.com', '+267 7100 0003', array['facebook', 'instagram'], 'results')
) as c(id, name, code, industry, status, ae, start_date, contact, contact_role, contact_email, phone, platforms, goal)
cross join (select id, price from public.services where name = 'Brand Launch') s;

-- ---------------------------------------------------------------------------
-- One client login: Sample Coffee Co, login ID MM-SCC-1001
-- ---------------------------------------------------------------------------

insert into public.client_users (user_id, client_id, full_name, email)
values (
  '10000000-0000-4000-8000-000000000101',
  '20000000-0000-4000-8000-000000000001',
  'Sample Coffee Contact',
  'client.coffee@example.com'
);

-- ---------------------------------------------------------------------------
-- Brand kits: the two active clients were signed off before they went live
-- ---------------------------------------------------------------------------

update public.brand_kits k
   set status = 'approved', shown_to_client_at = now() - interval '60 days',
       signed_off_by = 'Sample contact (sample data)', signed_off_at = now() - interval '60 days'
  from public.clients c
 where c.id = k.client_id and c.status = 'active' and c.notes = 'Sample client. Not a real business.';

-- Sample phone numbers (not real) so the portal shows how to reach the account exec.
update public.profiles set phone = '+267 7100 0102' where email = 'ae.one@example.com';
update public.profiles set phone = '+267 7100 0103' where email = 'ae.two@example.com';
