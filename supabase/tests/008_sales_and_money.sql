-- Phase 5: leads, quotes, invoices, payments and credit notes (06-admin.md).
-- Rolled back at the end.

begin;
create extension if not exists pgtap with schema extensions;
select plan(62);

-- ---------------------------------------------------------------------------
-- Fixtures: the CEO, an account exec, a designer, client X (with a login,
-- assigned to the AE) and client Y (another AE's)
-- ---------------------------------------------------------------------------

insert into auth.users (id, email, aud, role) values
  ('e8000000-0000-4000-8000-000000000001', 'p5.ceo@example.com', 'authenticated', 'authenticated'),
  ('e8000000-0000-4000-8000-000000000002', 'p5.ae@example.com', 'authenticated', 'authenticated'),
  ('e8000000-0000-4000-8000-000000000003', 'p5.ae2@example.com', 'authenticated', 'authenticated'),
  ('e8000000-0000-4000-8000-000000000005', 'p5.des@example.com', 'authenticated', 'authenticated'),
  ('e8000000-0000-4000-8000-000000000011', 'p5.cx@example.com', 'authenticated', 'authenticated'),
  ('e8000000-0000-4000-8000-000000000012', 'p5.cy@example.com', 'authenticated', 'authenticated');
insert into public.profiles (id, full_name, email, role) values
  ('e8000000-0000-4000-8000-000000000001', 'P5 CEO', 'p5.ceo@example.com', 'ceo'),
  ('e8000000-0000-4000-8000-000000000002', 'P5 AE', 'p5.ae@example.com', 'account_exec'),
  ('e8000000-0000-4000-8000-000000000003', 'P5 AE Two', 'p5.ae2@example.com', 'account_exec'),
  ('e8000000-0000-4000-8000-000000000005', 'P5 Designer', 'p5.des@example.com', 'designer');
update public.settings set max_active_clients = 1000, vat_registered = false, payment_terms_days = 7 where id = 1;

insert into public.services (id, name, unit, price, is_retainer) values
  ('d8000000-0000-4000-8000-000000000001', 'P5 Retainer', 'monthly', 3250, true),
  ('d8000000-0000-4000-8000-000000000002', 'P5 Logo', 'once_off', 1500, false);
insert into public.clients (id, name, status, account_exec_id, service_id, monthly_fee) values
  ('f8000000-0000-4000-8000-000000000001', 'P5 Client X', 'active', 'e8000000-0000-4000-8000-000000000002',
   'd8000000-0000-4000-8000-000000000001', 3250),
  ('f8000000-0000-4000-8000-000000000002', 'P5 Client Y', 'active', 'e8000000-0000-4000-8000-000000000003',
   'd8000000-0000-4000-8000-000000000001', 2000),
  ('f8000000-0000-4000-8000-000000000003', 'P5 Client Paused', 'paused', 'e8000000-0000-4000-8000-000000000002',
   'd8000000-0000-4000-8000-000000000001', 3250);
insert into public.client_users (user_id, client_id, full_name, email) values
  ('e8000000-0000-4000-8000-000000000011', 'f8000000-0000-4000-8000-000000000001', 'Kagiso X', 'p5.cx@example.com'),
  ('e8000000-0000-4000-8000-000000000012', 'f8000000-0000-4000-8000-000000000002', 'Lesedi Y', 'p5.cy@example.com');

create temp table ids (k text primary key, v uuid, t text);
grant select, insert on ids to authenticated;

-- ---------------------------------------------------------------------------
-- Leads and quotes: the CEO only
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub":"e8000000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into public.leads (company, contact_name, email, source, estimated_value)
values ('P5 Lead Co', 'Neo', 'neo@example.com', 'referral', 39000);
insert into ids (k, v) select 'lead', id from public.leads where company = 'P5 Lead Co';
select throws_ok($$ update public.leads set stage = 'lost' where company = 'P5 Lead Co' $$,
  '23514', null, 'Lost needs a reason');

insert into public.quotes (lead_id, intro) select v, 'Hello' from ids where k = 'lead';
insert into ids (k, v) select 'quote', id from public.quotes where intro = 'Hello';
insert into public.quote_lines (quote_id, service_id, name, unit, quantity, unit_price)
select v, 'd8000000-0000-4000-8000-000000000001', 'P5 Retainer', 'monthly', 12, 3250 from ids where k = 'quote';
select is((select total from public.quotes where id = (select v from ids where k = 'quote')), 39000.00::numeric,
  'Quote totals follow the lines');
select is((select vat_amount from public.quotes where id = (select v from ids where k = 'quote')), 0.00::numeric,
  'No VAT while Midas isn''t registered');
select throws_ok($$ update public.quotes set status = 'sent' where intro = 'Hello' $$,
  'P0001', 'Use Send or Issue to move a draft on.', 'A draft can''t be marked sent by hand');
select matches(public.send_quote((select v from ids where k = 'quote')), '^MM-Q-[0-9]{4}-[0-9]{4}$',
  'Sending gives the quote its number');
select is((select stage::text from public.leads where company = 'P5 Lead Co'), 'quote_sent',
  'The lead moves to Quote sent');
select throws_ok($$ update public.quote_lines set unit_price = 1 where quote_id = (select v from ids where k = 'quote') $$,
  'P0001', 'Sent quotes can''t be changed. Make a new quote instead.', 'A sent quote''s lines are locked');
select throws_ok($$ update public.quotes set intro = 'Changed' where id = (select v from ids where k = 'quote') $$,
  'P0001', 'Sent quotes can''t be changed. Make a new quote instead.', 'A sent quote is locked');
select throws_ok($$ delete from public.quotes where id = (select v from ids where k = 'quote') $$,
  'P0001', 'Sent quotes are kept and can''t be deleted.', 'A sent quote can''t be deleted');
select lives_ok($$ select public.set_quote_outcome((select v from ids where k = 'quote'), 'accepted') $$,
  'The CEO marks it accepted');
select lives_ok($$ update public.quotes set client_id = 'f8000000-0000-4000-8000-000000000001' where id = (select v from ids where k = 'quote') $$,
  'and links it to the client it became');

-- A quote past its date is flagged.
insert into public.quotes (lead_id, valid_until, intro) select v, current_date - 40, 'Old' from ids where k = 'lead';
insert into public.quote_lines (quote_id, name, quantity, unit_price) select id, 'Free text', 1, 100 from public.quotes where intro = 'Old';
select public.send_quote(id) from public.quotes where intro = 'Old';
select ok(public.expire_quotes() >= 1, 'Expired quotes are flagged');
select is((select status::text from public.quotes where intro = 'Old'), 'expired', 'and show as expired');

-- Nobody else reads leads, quotes, services or settings.
set local request.jwt.claims to '{"sub":"e8000000-0000-4000-8000-000000000002","role":"authenticated"}';
select is_empty($$ select 1 from public.leads $$, 'Account execs can''t read leads');
select is_empty($$ select 1 from public.quotes $$, 'or quotes');
select is_empty($$ select 1 from public.quote_lines $$, 'or quote lines');
select throws_ok($$ select public.send_quote((select v from ids where k = 'quote')) $$, '42501', null, 'or send quotes');
set local request.jwt.claims to '{"sub":"e8000000-0000-4000-8000-000000000005","role":"authenticated"}';
select is_empty($$ select 1 from public.leads union all select 1 from public.quotes $$, 'Designers can''t read leads or quotes');
select is_empty($$ select 1 from public.settings $$, 'or settings');
set local request.jwt.claims to '{"sub":"e8000000-0000-4000-8000-000000000011","role":"authenticated"}';
select is_empty($$ select 1 from public.leads union all select 1 from public.quotes union all select 1 from public.services $$,
  'Clients can''t read leads, quotes or services');
select is((select count(*)::int from public.billing_details), 1, 'Clients can read the company and bank details for invoices');

-- ---------------------------------------------------------------------------
-- Invoices: drafts, issuing, numbering and locks
-- ---------------------------------------------------------------------------

set local request.jwt.claims to '{"sub":"e8000000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into public.invoices (client_id, period_label, notes) values
  ('f8000000-0000-4000-8000-000000000001', 'A', 'inv-a'),
  ('f8000000-0000-4000-8000-000000000001', 'B', 'inv-b'),
  ('f8000000-0000-4000-8000-000000000002', 'C', 'inv-c');
insert into ids (k, v) select notes, id from public.invoices where notes like 'inv-%';
insert into public.invoice_lines (invoice_id, service_id, name, unit, quantity, unit_price)
select v, 'd8000000-0000-4000-8000-000000000002', 'P5 Logo', 'once_off', 2, 1500 from ids where k like 'inv-%';
select is((select total from public.invoices where notes = 'inv-a'), 3000.00::numeric, 'Invoice totals follow the lines');

-- Prices change later: existing lines keep theirs.
update public.services set price = 9999 where id = 'd8000000-0000-4000-8000-000000000002';
select is((select unit_price from public.invoice_lines where invoice_id = (select v from ids where k = 'inv-a')), 1500.00::numeric,
  'A price change doesn''t touch existing lines');
select is((select unit_price from public.quote_lines where quote_id = (select v from ids where k = 'quote')), 3250.00::numeric,
  'or existing quotes');

select throws_ok($$ update public.invoices set status = 'issued' where notes = 'inv-a' $$,
  'P0001', 'Use Send or Issue to move a draft on.', 'A draft can''t be marked issued by hand');
insert into ids (k, t) select 'numA', public.issue_invoice(v) from ids where k = 'inv-a';
insert into ids (k, t) select 'numB', public.issue_invoice(v) from ids where k = 'inv-b';
select matches((select t from ids where k = 'numA'), '^MM-INV-[0-9]{4}-[0-9]{4}$', 'Issuing numbers the invoice');
select is(split_part((select t from ids where k = 'numB'), '-', 4)::int,
  split_part((select t from ids where k = 'numA'), '-', 4)::int + 1, 'Numbers run on with no gap');
select is((select title from public.invoices where notes = 'inv-a'), 'Invoice', 'Titled Invoice while not VAT-registered');
select is((select due_date - issue_date from public.invoices where notes = 'inv-a'), 7, 'Due after the payment terms');

select throws_ok($$ update public.invoices set notes = 'changed' where id = (select v from ids where k = 'inv-a') $$,
  'P0001', 'Issued invoices can''t be changed. Issue a credit note instead.', 'An issued invoice can''t be edited');
select throws_ok($$ update public.invoices set amount_paid = 3000 where id = (select v from ids where k = 'inv-a') $$,
  'P0001', 'Issued invoices can''t be changed. Issue a credit note instead.', 'or marked paid by hand');
select throws_ok($$ insert into public.invoice_lines (invoice_id, name, unit_price) select v, 'Extra', 1 from ids where k = 'inv-a' $$,
  'P0001', 'Issued invoices can''t be changed. Issue a credit note instead.', 'or given new lines');
select throws_ok($$ delete from public.invoices where id = (select v from ids where k = 'inv-a') $$,
  'P0001', 'Issued invoices are kept for 8 years and can''t be deleted. Issue a credit note instead.', 'or deleted');

-- Even the database owner can't edit or delete an issued invoice.
reset role;
select throws_ok($$ update public.invoices set total = 1 where notes = 'inv-a' $$,
  'P0001', null, 'Not even directly in the database');
select throws_ok($$ delete from public.invoice_lines where invoice_id = (select v from ids where k = 'inv-a') $$,
  'P0001', null, 'and its lines stay put');
set local role authenticated;
set local request.jwt.claims to '{"sub":"e8000000-0000-4000-8000-000000000001","role":"authenticated"}';

-- ---------------------------------------------------------------------------
-- Payments and credit notes
-- ---------------------------------------------------------------------------

insert into public.payments (invoice_id, amount, paid_on, method) select v, 1000, current_date, 'eft' from ids where k = 'inv-a';
select is((select status::text || ' ' || balance from public.invoices where notes = 'inv-a'), 'part_paid 2000.00',
  'A part payment leaves a balance');
select throws_ok($$ insert into public.payments (invoice_id, amount, paid_on, method) select v, 2500, current_date, 'eft' from ids where k = 'inv-a' $$,
  'P0001', null, 'A payment can''t be more than the balance');
select throws_ok($$ insert into public.payments (invoice_id, amount, paid_on, method) select v, 10, current_date, 'eft' from ids where k = 'inv-c' $$,
  'P0001', 'Payments can only be recorded on an issued invoice with a balance.', 'Payments need an issued invoice');
select throws_ok($$ update public.payments set amount = 1 $$, '42501', null, 'Payments can''t be edited');
select throws_ok($$ delete from public.payments $$, '42501', null, 'or deleted');
reset role;
select throws_ok($$ update public.payments set amount = 1 $$, 'P0001', null, 'not even directly in the database');
select throws_ok($$ delete from public.payments $$, 'P0001', null, 'where they can''t be deleted either');
set local role authenticated;

select throws_ok($$ select public.issue_credit_note((select v from ids where k = 'inv-a'), 2500, 'Too much') $$,
  'P0001', null, 'A credit note can''t be more than the balance');
select lives_ok($$ select public.issue_credit_note((select v from ids where k = 'inv-a'), 500, 'Discount agreed') $$,
  'A credit note reduces the balance');
insert into public.payments (invoice_id, amount, paid_on, method) select v, 1500, current_date, 'cash' from ids where k = 'inv-a';
select is((select status::text || ' ' || balance from public.invoices where notes = 'inv-a'), 'paid 0.00',
  'Paid once payments and credits clear it');
select matches((select number from public.credit_notes where reason = 'Discount agreed'), '^MM-CN-[0-9]{4}-[0-9]{4}$',
  'Credit notes have their own numbers');
select lives_ok($$ select public.issue_credit_note((select v from ids where k = 'inv-b'), 3000, 'Cancelled') $$,
  'A credit note can clear an unpaid invoice');
select is((select status::text from public.invoices where notes = 'inv-b'), 'credited', 'which then shows as credited');
select throws_ok($$ update public.credit_notes set reason = 'x' $$, '42501', null, 'Credit notes can''t be edited');
reset role;
select throws_ok($$ delete from public.credit_notes $$, 'P0001', null, 'or deleted, even directly in the database');
set local role authenticated;

-- ---------------------------------------------------------------------------
-- Who reads invoices
-- ---------------------------------------------------------------------------

set local request.jwt.claims to '{"sub":"e8000000-0000-4000-8000-000000000011","role":"authenticated"}';
select is((select count(*)::int from public.invoices where client_id = 'f8000000-0000-4000-8000-000000000001'), 2,
  'A client reads their issued invoices');
select is((select count(*)::int from public.payments), 2, 'with their payments');
select is_empty($$ select 1 from public.invoices where status = 'draft' or client_id <> 'f8000000-0000-4000-8000-000000000001' $$,
  'but not drafts or another client''s');
set local request.jwt.claims to '{"sub":"e8000000-0000-4000-8000-000000000002","role":"authenticated"}';
select is((select count(*)::int from public.invoices where notes like 'inv-%'), 2, 'An account exec reads their clients'' invoices only');
select throws_ok($$ insert into public.payments (invoice_id, amount, paid_on, method) select v, 1, current_date, 'eft' from ids where k = 'inv-c' $$,
  '42501', null, 'but can''t record payments');
set local request.jwt.claims to '{"sub":"e8000000-0000-4000-8000-000000000005","role":"authenticated"}';
select is_empty($$ select 1 from public.invoices union all select 1 from public.payments union all select 1 from public.credit_notes $$,
  'Designers can''t read invoices, payments or credit notes');

-- ---------------------------------------------------------------------------
-- Retainer run and VAT
-- ---------------------------------------------------------------------------

set local request.jwt.claims to '{"sub":"e8000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.create_retainer_drafts('2031-03-01');
select is((select count(*)::int from public.invoices where period_month = '2031-03-01'
  and client_id in ('f8000000-0000-4000-8000-000000000001', 'f8000000-0000-4000-8000-000000000002', 'f8000000-0000-4000-8000-000000000003')), 2,
  'The retainer run makes one draft per active client');
select is((select string_agg(l.name || ' ' || l.unit_price, ',') from public.invoice_lines l join public.invoices i on i.id = l.invoice_id
  where i.period_month = '2031-03-01' and i.client_id = 'f8000000-0000-4000-8000-000000000001'),
  'P5 Retainer · March 2031 3250.00', 'with the service, month and fee');
delete from public.invoices where period_month = '2031-03-01' and client_id = 'f8000000-0000-4000-8000-000000000002';
select is(public.create_retainer_drafts('2031-03-01'), 0, 'Running it again never duplicates a month');

reset role;
update public.settings set vat_registered = true, vat_rate = 14 where id = 1;
set local role authenticated;
set local request.jwt.claims to '{"sub":"e8000000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into public.invoices (client_id, notes) values ('f8000000-0000-4000-8000-000000000001', 'inv-vat');
insert into public.invoice_lines (invoice_id, name, unit_price) select id, 'Work', 1000 from public.invoices where notes = 'inv-vat';
select public.issue_invoice(id) from public.invoices where notes = 'inv-vat';
select is((select title || ' ' || vat_amount || ' ' || total from public.invoices where notes = 'inv-vat'),
  'Tax invoice 140.00 1140.00', 'With VAT on, new invoices add VAT and are tax invoices');
select is((select title || ' ' || vat_amount from public.invoices where notes = 'inv-a'), 'Invoice 0.00',
  'Old invoices never change');

reset role;
set local role anon;
select throws_ok($$ select * from public.invoices $$, '42501', null, 'Signed out: nothing');

select * from finish();
rollback;
