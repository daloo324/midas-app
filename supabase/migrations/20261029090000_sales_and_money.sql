-- Phase 5: sales and money. Leads, quotes, invoices, payments and credit notes
-- (02-data-model.md "Sales and money", 06-admin.md).
--
-- Rules (CLAUDE.md 7–10):
-- * Numbers come from next_document_number(): one counter per type per year,
--   taken inside the issuing transaction, so they never skip or repeat.
-- * While a quote or invoice is a draft its totals follow its lines and the
--   current VAT setting. Once sent or issued it's frozen: no edits to amounts,
--   lines or numbers, and no deletes. Corrections are credit notes.
-- * Payments and credit notes are never edited or deleted.
-- * Credit notes go up to the remaining balance only (Dave, 2026-10-24).

-- ---------------------------------------------------------------------------
-- Numbering
-- ---------------------------------------------------------------------------

-- True when the request carries the service-role key (the cron jobs). Unlike
-- is_trusted_caller(), this still works inside security-definer functions,
-- where current_user is the function's owner.
create function public.is_service_request()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'role', '') = 'service_role';
$$;

grant execute on function public.is_service_request() to authenticated, service_role;

create function public.next_document_number(p_type text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_year int := extract(year from (now() at time zone 'Africa/Gaborone'))::int;
  v_n int;
begin
  -- Only reachable through the issuing functions below (execute is revoked).
  insert into public.document_counters (doc_type, year, last_number)
  values (p_type, v_year, 1)
  on conflict (doc_type, year)
    do update set last_number = public.document_counters.last_number + 1
  returning last_number into v_n;
  return format('MM-%s-%s-%s',
    case p_type when 'quote' then 'Q' when 'invoice' then 'INV' else 'CN' end,
    v_year, lpad(v_n::text, 4, '0'));
end;
$$;

revoke execute on function public.next_document_number(text) from public, anon, authenticated;
grant execute on function public.next_document_number(text) to service_role;

-- Today in Gaborone.
create function public.gaborone_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Africa/Gaborone')::date;
$$;

grant execute on function public.gaborone_today() to authenticated, service_role;

-- The VAT rate a new document uses: 0 unless Midas is VAT-registered.
create function public.current_vat_rate()
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select case when s.vat_registered then s.vat_rate else 0 end
  from public.settings s where s.id = 1;
$$;

revoke execute on function public.current_vat_rate() from public, anon;
grant execute on function public.current_vat_rate() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- leads
-- ---------------------------------------------------------------------------

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  company text not null check (length(trim(company)) between 1 and 120),
  contact_name text check (length(contact_name) <= 120),
  email text check (length(email) <= 200),
  phone text check (length(phone) <= 40),
  source public.lead_source not null default 'other',
  stage public.lead_stage not null default 'new',
  estimated_value numeric(12, 2) check (estimated_value >= 0),
  owner_id uuid references public.profiles (id),
  next_action text check (length(next_action) <= 200),
  next_action_date date,
  lost_reason text check (lost_reason in ('price', 'timing', 'competitor', 'no_response', 'other')),
  notes text check (length(notes) <= 5000),
  client_id uuid references public.clients (id),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (stage <> 'lost' or lost_reason is not null)
);

create index leads_stage_idx on public.leads (stage);

create function public.leads_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.stage in ('won', 'lost') then
    if tg_op = 'INSERT' or old.stage is distinct from new.stage then
      new.closed_at := now();
    end if;
  else
    new.closed_at := null;
    new.lost_reason := null;
  end if;
  return new;
end;
$$;

create trigger leads_before_write before insert or update on public.leads
  for each row execute function public.leads_before_write();
create trigger leads_updated_at before update on public.leads
  for each row execute function public.set_updated_at();

alter table public.leads enable row level security;
create policy "CEO reads leads" on public.leads for select to authenticated using (public.is_ceo());
create policy "CEO adds leads" on public.leads for insert to authenticated with check (public.is_ceo());
create policy "CEO updates leads" on public.leads for update to authenticated using (public.is_ceo()) with check (public.is_ceo());
create policy "CEO removes leads" on public.leads for delete to authenticated using (public.is_ceo());

grant select, insert, update, delete on public.leads to authenticated;
grant select, insert, update, delete on public.leads to service_role;

-- ---------------------------------------------------------------------------
-- quotes and quote_lines
-- ---------------------------------------------------------------------------

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  number text unique check (number ~ '^MM-Q-[0-9]{4}-[0-9]{4,}$'),
  lead_id uuid references public.leads (id),
  client_id uuid references public.clients (id),
  status public.quote_status not null default 'draft',
  issue_date date,
  valid_until date,
  intro text check (length(intro) <= 3000),
  terms text check (length(terms) <= 3000),
  subtotal numeric(12, 2) not null default 0,
  vat_rate numeric(5, 2) not null default 0,
  vat_amount numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  pdf_path text,
  sent_at timestamptz,
  accepted_at timestamptz,
  declined_at timestamptz,
  created_by uuid references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (lead_id is not null or client_id is not null),
  check ((status = 'draft') = (number is null))
);

create table public.quote_lines (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes (id) on delete cascade,
  service_id uuid references public.services (id),
  name text not null check (length(trim(name)) between 1 and 200),
  description text check (length(description) <= 2000),
  unit public.service_unit,
  quantity numeric(10, 2) not null default 1 check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  line_total numeric(12, 2) generated always as (round(quantity * unit_price, 2)) stored,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create index quote_lines_quote_id_idx on public.quote_lines (quote_id, sort);
create index quotes_lead_id_idx on public.quotes (lead_id);
create index quotes_client_id_idx on public.quotes (client_id);

-- ---------------------------------------------------------------------------
-- invoices, invoice_lines, payments, credit_notes
-- ---------------------------------------------------------------------------

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  number text unique check (number ~ '^MM-INV-[0-9]{4}-[0-9]{4,}$'),
  client_id uuid not null references public.clients (id),
  quote_id uuid references public.quotes (id),
  status public.invoice_status not null default 'draft',
  title text check (title in ('Invoice', 'Tax invoice')),
  period_label text check (length(period_label) <= 60),
  period_month date check (period_month = date_trunc('month', period_month)::date),
  is_retainer boolean not null default false,
  issue_date date,
  due_date date,
  subtotal numeric(12, 2) not null default 0,
  vat_rate numeric(5, 2) not null default 0,
  vat_amount numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  amount_paid numeric(12, 2) not null default 0 check (amount_paid >= 0),
  amount_credited numeric(12, 2) not null default 0 check (amount_credited >= 0),
  balance numeric(12, 2) generated always as (total - amount_paid - amount_credited) stored,
  notes text check (length(notes) <= 2000),
  pdf_path text,
  issued_at timestamptz,
  created_by uuid references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'draft') = (number is null)),
  check (status = 'draft' or (title is not null and issue_date is not null and due_date is not null)),
  check (amount_paid + amount_credited <= total)
);

create index invoices_client_id_idx on public.invoices (client_id, status);

create table public.invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  service_id uuid references public.services (id),
  name text not null check (length(trim(name)) between 1 and 200),
  description text check (length(description) <= 2000),
  unit public.service_unit,
  quantity numeric(10, 2) not null default 1 check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  line_total numeric(12, 2) generated always as (round(quantity * unit_price, 2)) stored,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create index invoice_lines_invoice_id_idx on public.invoice_lines (invoice_id, sort);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id),
  amount numeric(12, 2) not null check (amount > 0),
  paid_on date not null,
  method text not null check (method in ('eft', 'cash', 'mobile_money', 'card', 'other')),
  reference text check (length(reference) <= 120),
  recorded_by uuid references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now()
);

create index payments_invoice_id_idx on public.payments (invoice_id);
create index payments_paid_on_idx on public.payments (paid_on);

create table public.credit_notes (
  id uuid primary key default gen_random_uuid(),
  number text not null unique check (number ~ '^MM-CN-[0-9]{4}-[0-9]{4,}$'),
  invoice_id uuid not null references public.invoices (id),
  amount numeric(12, 2) not null check (amount > 0),
  reason text not null check (length(trim(reason)) between 1 and 500),
  issued_on date not null,
  pdf_path text,
  created_by uuid references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now()
);

create index credit_notes_invoice_id_idx on public.credit_notes (invoice_id);

-- One retainer draft per client per month, even when the run repeats or a
-- draft was removed. Service role and the CEO's run function only.
create table public.retainer_runs (
  client_id uuid not null references public.clients (id),
  month date not null check (month = date_trunc('month', month)::date),
  invoice_id uuid references public.invoices (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (client_id, month)
);

alter table public.retainer_runs enable row level security;
grant select, insert, update, delete on public.retainer_runs to service_role;

-- ---------------------------------------------------------------------------
-- Totals and locks
-- ---------------------------------------------------------------------------

-- Quotes and invoices: while a draft, totals come from the lines and the
-- current VAT setting; on the move out of draft they're frozen.
-- Runs as the caller (not security definer), so is_trusted_caller() is true
-- only inside the issuing functions and payment trigger, never for a
-- signed-in user editing rows directly.
create function public.document_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_sub numeric(12, 2);
  v_locked_msg text := case tg_table_name
    when 'invoices' then 'Issued invoices can''t be changed. Issue a credit note instead.'
    else 'Sent quotes can''t be changed. Make a new quote instead.' end;
begin
  if tg_op = 'INSERT' then
    if not public.is_trusted_caller() then
      new.number := null;
      new.status := 'draft';
      if tg_table_name = 'invoices' then
        new.amount_paid := 0;
        new.amount_credited := 0;
        new.issued_at := null;
        new.title := null;
      end if;
    end if;
  elsif old.status <> 'draft' then
    -- Frozen: only the status move, payments, credits and the PDF may change.
    -- (A sent quote may still be linked to the client it creates.)
    if (old.pdf_path is not null and new.pdf_path is distinct from old.pdf_path)
      or (tg_table_name = 'invoices' and (
        to_jsonb(new) - array['status', 'amount_paid', 'amount_credited', 'balance', 'pdf_path', 'updated_at']
        is distinct from
        to_jsonb(old) - array['status', 'amount_paid', 'amount_credited', 'balance', 'pdf_path', 'updated_at']))
      or (tg_table_name = 'quotes' and (
        to_jsonb(new) - array['status', 'accepted_at', 'declined_at', 'client_id', 'lead_id', 'pdf_path', 'updated_at']
        is distinct from
        to_jsonb(old) - array['status', 'accepted_at', 'declined_at', 'client_id', 'lead_id', 'pdf_path', 'updated_at']))
    then
      raise exception '%', v_locked_msg using errcode = 'P0001';
    end if;
    if new.status is distinct from old.status and not public.is_trusted_caller() then
      raise exception '%', v_locked_msg using errcode = 'P0001';
    end if;
    -- The PDF may be stored once, by the CEO, after issuing.
    if new.pdf_path is distinct from old.pdf_path and not (public.is_trusted_caller() or public.is_ceo()) then
      raise exception '%', v_locked_msg using errcode = 'P0001';
    end if;
    if tg_table_name = 'invoices' and not public.is_trusted_caller() then
      if new.amount_paid is distinct from old.amount_paid
        or new.amount_credited is distinct from old.amount_credited then
        raise exception '%', v_locked_msg using errcode = 'P0001';
      end if;
    end if;
    return new;
  elsif new.status <> 'draft' and not public.is_trusted_caller() then
    raise exception 'Use Send or Issue to move a draft on.' using errcode = 'P0001';
  end if;

  -- Draft (or moving out of draft): recompute from the lines.
  if tg_table_name = 'invoices' then
    select coalesce(sum(line_total), 0) into v_sub from public.invoice_lines where invoice_id = new.id;
  else
    select coalesce(sum(line_total), 0) into v_sub from public.quote_lines where quote_id = new.id;
  end if;
  new.subtotal := v_sub;
  new.vat_rate := coalesce(public.current_vat_rate(), 0);
  new.vat_amount := round(v_sub * new.vat_rate / 100, 2);
  new.total := new.subtotal + new.vat_amount;
  return new;
end;
$$;

create trigger quotes_before_write before insert or update on public.quotes
  for each row execute function public.document_before_write();
create trigger invoices_before_write before insert or update on public.invoices
  for each row execute function public.document_before_write();
create trigger quotes_updated_at before update on public.quotes
  for each row execute function public.set_updated_at();
create trigger invoices_updated_at before update on public.invoices
  for each row execute function public.set_updated_at();

-- Only drafts can be deleted.
create function public.document_before_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status <> 'draft' then
    raise exception '%', case tg_table_name
      when 'invoices' then 'Issued invoices are kept for 8 years and can''t be deleted. Issue a credit note instead.'
      else 'Sent quotes are kept and can''t be deleted.' end
      using errcode = 'P0001';
  end if;
  return old;
end;
$$;

create trigger quotes_before_delete before delete on public.quotes
  for each row execute function public.document_before_delete();
create trigger invoices_before_delete before delete on public.invoices
  for each row execute function public.document_before_delete();

-- Lines change only while their document is a draft; each change re-totals it.
create function public.document_line_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_parent uuid;
  v_status text;
begin
  if tg_table_name = 'invoice_lines' then
    v_parent := coalesce(to_jsonb(new) ->> 'invoice_id', to_jsonb(old) ->> 'invoice_id')::uuid;
    select status::text into v_status from public.invoices where id = v_parent;
  else
    v_parent := coalesce(to_jsonb(new) ->> 'quote_id', to_jsonb(old) ->> 'quote_id')::uuid;
    select status::text into v_status from public.quotes where id = v_parent;
  end if;
  -- A cascade delete of a draft parent finds no parent: nothing to do.
  if v_status is null then
    return coalesce(new, old);
  end if;
  if v_status <> 'draft' then
    raise exception '%', case tg_table_name
      when 'invoice_lines' then 'Issued invoices can''t be changed. Issue a credit note instead.'
      else 'Sent quotes can''t be changed. Make a new quote instead.' end
      using errcode = 'P0001';
  end if;
  if tg_op = 'UPDATE' and v_parent is distinct from coalesce(
      to_jsonb(old) ->> 'invoice_id', to_jsonb(old) ->> 'quote_id')::uuid then
    raise exception 'Lines can''t move to another document.' using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end;
$$;

create function public.document_line_retotal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'invoice_lines' then
    update public.invoices set updated_at = now()
    where id = coalesce(new.invoice_id, old.invoice_id) and status = 'draft';
  else
    update public.quotes set updated_at = now()
    where id = coalesce(new.quote_id, old.quote_id) and status = 'draft';
  end if;
  return null;
end;
$$;

create trigger quote_lines_guard before insert or update or delete on public.quote_lines
  for each row execute function public.document_line_change();
create trigger quote_lines_retotal after insert or update or delete on public.quote_lines
  for each row execute function public.document_line_retotal();
create trigger invoice_lines_guard before insert or update or delete on public.invoice_lines
  for each row execute function public.document_line_change();
create trigger invoice_lines_retotal after insert or update or delete on public.invoice_lines
  for each row execute function public.document_line_retotal();

-- Payments and credit notes are permanent.
create function public.forbid_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_table_name = 'credit_notes' and tg_op = 'UPDATE' then
    if to_jsonb(old) ->> 'pdf_path' is null
      and (to_jsonb(new) - 'pdf_path') = (to_jsonb(old) - 'pdf_path') then
      return new; -- storing the PDF once
    end if;
  end if;
  raise exception '%', case tg_table_name
    when 'payments' then 'Payments can''t be changed or deleted. Issue a credit note to correct an invoice.'
    else 'Credit notes can''t be changed or deleted.' end
    using errcode = 'P0001';
end;
$$;

create trigger payments_permanent before update or delete on public.payments
  for each row execute function public.forbid_change();
create trigger credit_notes_permanent before update or delete on public.credit_notes
  for each row execute function public.forbid_change();

-- An invoice's status follows its balance.
create function public.invoice_status_for(p_total numeric, p_paid numeric, p_credited numeric)
returns public.invoice_status
language sql
immutable
set search_path = ''
as $$
  select case
    when p_total - p_paid - p_credited <= 0 then
      case when p_paid > 0 then 'paid' else 'credited' end::public.invoice_status
    when p_paid > 0 then 'part_paid'::public.invoice_status
    else 'issued'::public.invoice_status
  end;
$$;

-- Recording a payment: CEO, issued invoices, up to the balance.
create function public.payment_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inv public.invoices;
begin
  if not (public.is_ceo() or public.is_service_request()) then
    raise exception 'Only the CEO can record payments.' using errcode = '42501';
  end if;
  select * into v_inv from public.invoices where id = new.invoice_id for update;
  if v_inv.id is null then
    raise exception 'That invoice wasn''t found.' using errcode = 'P0002';
  end if;
  if v_inv.status not in ('issued', 'part_paid') then
    raise exception 'Payments can only be recorded on an issued invoice with a balance.' using errcode = 'P0001';
  end if;
  if new.amount > v_inv.balance then
    raise exception 'That''s more than the balance of %. Record up to the balance.',
      to_char(v_inv.balance, 'FM999,999,990.00') using errcode = 'P0001';
  end if;
  if new.paid_on > public.gaborone_today() then
    raise exception 'The payment date can''t be in the future.' using errcode = 'P0001';
  end if;
  update public.invoices
  set amount_paid = amount_paid + new.amount,
      status = public.invoice_status_for(total, amount_paid + new.amount, amount_credited)
  where id = new.invoice_id;
  return new;
end;
$$;

create trigger payments_before_insert before insert on public.payments
  for each row execute function public.payment_before_insert();

-- ---------------------------------------------------------------------------
-- Status moves (security definer, CEO only)
-- ---------------------------------------------------------------------------

create function public.send_quote(p_quote_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_q public.quotes;
  v_number text;
begin
  if not (public.is_ceo() or public.is_service_request()) then
    raise exception 'Only the CEO can send quotes.' using errcode = '42501';
  end if;
  select * into v_q from public.quotes where id = p_quote_id for update;
  if v_q.id is null then raise exception 'That quote wasn''t found.' using errcode = 'P0002'; end if;
  if v_q.status <> 'draft' then raise exception 'This quote has already been sent.' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.quote_lines where quote_id = p_quote_id) then
    raise exception 'Add at least one line before sending.' using errcode = 'P0001';
  end if;
  v_number := public.next_document_number('quote');
  update public.quotes
  set status = 'sent', number = v_number, issue_date = public.gaborone_today(),
      valid_until = coalesce(valid_until, public.gaborone_today() + 30), sent_at = now()
  where id = p_quote_id;
  update public.leads set stage = 'quote_sent'
  where id = v_q.lead_id and stage in ('new', 'contacted');
  return v_number;
end;
$$;

create function public.set_quote_outcome(p_quote_id uuid, p_outcome public.quote_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_q public.quotes;
begin
  if not public.is_ceo() then
    raise exception 'Only the CEO can do this.' using errcode = '42501';
  end if;
  if p_outcome not in ('accepted', 'declined') then
    raise exception 'Mark a quote accepted or declined.' using errcode = '22023';
  end if;
  select * into v_q from public.quotes where id = p_quote_id for update;
  if v_q.id is null then raise exception 'That quote wasn''t found.' using errcode = 'P0002'; end if;
  if v_q.status not in ('sent', 'expired') then
    raise exception 'Only a sent quote can be accepted or declined.' using errcode = 'P0001';
  end if;
  update public.quotes
  set status = p_outcome,
      accepted_at = case when p_outcome = 'accepted' then now() end,
      declined_at = case when p_outcome = 'declined' then now() end
  where id = p_quote_id;
end;
$$;

-- Sent quotes past their valid-until date are flagged expired (cron and CEO).
create function public.expire_quotes()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n int;
begin
  if not (public.is_ceo() or public.is_service_request()) then
    raise exception 'Only the CEO can do this.' using errcode = '42501';
  end if;
  update public.quotes set status = 'expired'
  where status = 'sent' and valid_until < public.gaborone_today();
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

create function public.issue_invoice(p_invoice_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inv public.invoices;
  v_s public.settings;
  v_number text;
begin
  if not (public.is_ceo() or public.is_service_request()) then
    raise exception 'Only the CEO can issue invoices.' using errcode = '42501';
  end if;
  select * into v_inv from public.invoices where id = p_invoice_id for update;
  if v_inv.id is null then raise exception 'That invoice wasn''t found.' using errcode = 'P0002'; end if;
  if v_inv.status <> 'draft' then raise exception 'This invoice has already been issued.' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.invoice_lines where invoice_id = p_invoice_id) then
    raise exception 'Add at least one line before issuing.' using errcode = 'P0001';
  end if;
  if v_inv.total <= 0 then
    raise exception 'The invoice total must be more than P0.00.' using errcode = 'P0001';
  end if;
  select * into v_s from public.settings where id = 1;
  v_number := public.next_document_number('invoice');
  update public.invoices
  set status = 'issued', number = v_number,
      title = case when v_s.vat_registered then 'Tax invoice' else 'Invoice' end,
      issue_date = public.gaborone_today(),
      due_date = public.gaborone_today() + v_s.payment_terms_days,
      issued_at = now()
  where id = p_invoice_id;
  return v_number;
end;
$$;

create function public.issue_credit_note(p_invoice_id uuid, p_amount numeric, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inv public.invoices;
  v_id uuid;
begin
  if not public.is_ceo() then
    raise exception 'Only the CEO can issue credit notes.' using errcode = '42501';
  end if;
  select * into v_inv from public.invoices where id = p_invoice_id for update;
  if v_inv.id is null then raise exception 'That invoice wasn''t found.' using errcode = 'P0002'; end if;
  if v_inv.status not in ('issued', 'part_paid') then
    raise exception 'Credit notes are for issued invoices with a balance.' using errcode = 'P0001';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Enter an amount more than P0.00.' using errcode = 'P0001';
  end if;
  if p_amount > v_inv.balance then
    raise exception 'A credit note can''t be more than the balance of %.',
      to_char(v_inv.balance, 'FM999,999,990.00') using errcode = 'P0001';
  end if;
  if coalesce(length(trim(p_reason)), 0) = 0 then
    raise exception 'Give a reason for the credit note.' using errcode = 'P0001';
  end if;
  insert into public.credit_notes (number, invoice_id, amount, reason, issued_on, created_by)
  values (public.next_document_number('credit_note'), p_invoice_id, round(p_amount, 2),
          trim(p_reason), public.gaborone_today(), auth.uid())
  returning id into v_id;
  update public.invoices
  set amount_credited = amount_credited + round(p_amount, 2),
      status = public.invoice_status_for(total, amount_paid, amount_credited + round(p_amount, 2))
  where id = p_invoice_id;
  return v_id;
end;
$$;

-- The monthly retainer run: one draft per active client with a fee, never
-- twice for the same month. Returns how many drafts it made.
create function public.create_retainer_drafts(p_month date)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_month date := date_trunc('month', p_month)::date;
  v_label text := to_char(date_trunc('month', p_month), 'FMMonth YYYY');
  v_c record;
  v_inv uuid;
  v_n int := 0;
begin
  if not (public.is_ceo() or public.is_service_request()) then
    raise exception 'Only the CEO can run retainer invoices.' using errcode = '42501';
  end if;
  for v_c in
    select c.id, c.monthly_fee, c.service_id, coalesce(s.name, 'Monthly retainer') as service_name
    from public.clients c
    left join public.services s on s.id = c.service_id
    where c.status = 'active' and coalesce(c.monthly_fee, 0) > 0
    order by c.name
  loop
    insert into public.retainer_runs (client_id, month) values (v_c.id, v_month)
    on conflict do nothing;
    if not found then continue; end if;
    insert into public.invoices (client_id, period_label, period_month, is_retainer)
    values (v_c.id, v_label, v_month, true)
    returning id into v_inv;
    insert into public.invoice_lines (invoice_id, service_id, name, unit, quantity, unit_price)
    values (v_inv, v_c.service_id, v_c.service_name || ' · ' || v_label, 'monthly', 1, v_c.monthly_fee);
    update public.retainer_runs set invoice_id = v_inv where client_id = v_c.id and month = v_month;
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

-- The CEO stores a document's PDF once, after it's issued.
create function public.set_document_pdf(p_kind text, p_id uuid, p_path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (public.is_ceo() or public.is_service_request()) then
    raise exception 'Only the CEO can do this.' using errcode = '42501';
  end if;
  if p_kind = 'invoice' then
    update public.invoices set pdf_path = p_path where id = p_id and pdf_path is null and status <> 'draft';
  elsif p_kind = 'quote' then
    update public.quotes set pdf_path = p_path where id = p_id and pdf_path is null and status <> 'draft';
  elsif p_kind = 'credit_note' then
    update public.credit_notes set pdf_path = p_path where id = p_id and pdf_path is null;
  else
    raise exception 'Unknown document.' using errcode = '22023';
  end if;
end;
$$;

revoke execute on function public.send_quote(uuid) from public, anon;
revoke execute on function public.set_quote_outcome(uuid, public.quote_status) from public, anon;
revoke execute on function public.expire_quotes() from public, anon;
revoke execute on function public.issue_invoice(uuid) from public, anon;
revoke execute on function public.issue_credit_note(uuid, numeric, text) from public, anon;
revoke execute on function public.create_retainer_drafts(date) from public, anon;
revoke execute on function public.set_document_pdf(text, uuid, text) from public, anon;
grant execute on function public.send_quote(uuid) to authenticated, service_role;
grant execute on function public.set_quote_outcome(uuid, public.quote_status) to authenticated, service_role;
grant execute on function public.expire_quotes() to authenticated, service_role;
grant execute on function public.issue_invoice(uuid) to authenticated, service_role;
grant execute on function public.issue_credit_note(uuid, numeric, text) to authenticated, service_role;
grant execute on function public.create_retainer_drafts(date) to authenticated, service_role;
grant execute on function public.set_document_pdf(text, uuid, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Access
-- ---------------------------------------------------------------------------

alter table public.quotes enable row level security;
alter table public.quote_lines enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_lines enable row level security;
alter table public.payments enable row level security;
alter table public.credit_notes enable row level security;

create policy "CEO reads quotes" on public.quotes for select to authenticated using (public.is_ceo());
create policy "CEO adds quotes" on public.quotes for insert to authenticated with check (public.is_ceo());
create policy "CEO updates quotes" on public.quotes for update to authenticated using (public.is_ceo()) with check (public.is_ceo());
create policy "CEO removes draft quotes" on public.quotes for delete to authenticated using (public.is_ceo());

create policy "CEO reads quote lines" on public.quote_lines for select to authenticated using (public.is_ceo());
create policy "CEO adds quote lines" on public.quote_lines for insert to authenticated with check (public.is_ceo());
create policy "CEO updates quote lines" on public.quote_lines for update to authenticated using (public.is_ceo()) with check (public.is_ceo());
create policy "CEO removes quote lines" on public.quote_lines for delete to authenticated using (public.is_ceo());

-- Invoices: the CEO; account execs read their clients'; clients read their own
-- once issued (01-auth-and-roles.md).
create function public.can_read_invoice(p_client_id uuid, p_status public.invoice_status)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case public.auth_role()
    when 'ceo' then true
    when 'account_exec' then public.can_access_client(p_client_id)
    when 'client' then p_status <> 'draft' and public.can_access_client(p_client_id)
    else false
  end;
$$;

revoke execute on function public.can_read_invoice(uuid, public.invoice_status) from public, anon;
grant execute on function public.can_read_invoice(uuid, public.invoice_status) to authenticated, service_role;

create policy "Invoices: CEO, the client's account exec, the client once issued" on public.invoices
  for select to authenticated using (public.can_read_invoice(client_id, status));
create policy "CEO adds invoices" on public.invoices for insert to authenticated with check (public.is_ceo());
create policy "CEO updates invoices" on public.invoices for update to authenticated using (public.is_ceo()) with check (public.is_ceo());
create policy "CEO removes draft invoices" on public.invoices for delete to authenticated using (public.is_ceo());

create policy "Invoice lines follow their invoice" on public.invoice_lines
  for select to authenticated using (exists (select 1 from public.invoices i where i.id = invoice_id));
create policy "CEO adds invoice lines" on public.invoice_lines for insert to authenticated with check (public.is_ceo());
create policy "CEO updates invoice lines" on public.invoice_lines for update to authenticated using (public.is_ceo()) with check (public.is_ceo());
create policy "CEO removes invoice lines" on public.invoice_lines for delete to authenticated using (public.is_ceo());

create policy "Payments follow their invoice" on public.payments
  for select to authenticated using (exists (select 1 from public.invoices i where i.id = invoice_id));
create policy "CEO records payments" on public.payments
  for insert to authenticated with check (public.is_ceo() and recorded_by = auth.uid());

create policy "Credit notes follow their invoice" on public.credit_notes
  for select to authenticated using (exists (select 1 from public.invoices i where i.id = invoice_id));

grant select, insert, update, delete on public.quotes, public.quote_lines, public.invoices, public.invoice_lines to authenticated;
grant select on public.payments, public.credit_notes to authenticated;
grant insert (invoice_id, amount, paid_on, method, reference, recorded_by) on public.payments to authenticated;
grant select, insert, update, delete on public.quotes, public.quote_lines, public.invoices, public.invoice_lines,
  public.payments, public.credit_notes to service_role;

-- Company and bank details for documents, readable by anyone signed in
-- (the portal's invoice view). The rest of settings stays CEO only.
create view public.billing_details as
  select company_name, legal_name, address, email, phone, bank_details, invoice_footer, vat_number
  from public.settings
  where id = 1 and public.auth_role() is not null;

revoke all on public.billing_details from anon, authenticated;
grant select on public.billing_details to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- documents bucket: {client_id}/invoices/…, quotes/…, company/logo-…
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 10485760, array['application/pdf', 'image/png', 'image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Documents: CEO uploads" on storage.objects
  for insert to authenticated with check (bucket_id = 'documents' and public.is_ceo());
-- Readers follow the document's own access: an invoice or credit note the
-- person can read (RLS on those tables), or any document for the CEO.
create policy "Documents: read with the document" on storage.objects
  for select to authenticated using (
    bucket_id = 'documents' and (
      public.is_ceo()
      or exists (select 1 from public.invoices i where i.pdf_path = name)
      or exists (select 1 from public.credit_notes n where n.pdf_path = name)
    )
  );

-- ---------------------------------------------------------------------------
-- The portal's own client row gains the contact, for the bill-to on invoices
-- (clients can't read public.clients directly).
-- ---------------------------------------------------------------------------

create or replace view public.portal_client
with (security_barrier = true)
as
select
  c.id,
  c.name,
  c.client_code,
  c.status,
  c.start_date,
  c.platforms,
  c.monthly_fee,
  ae.full_name as account_exec_name,
  ae.email as account_exec_email,
  c.main_goal,
  c.baseline,
  s.name as service_name,
  s.inclusions as service_inclusions,
  ae.phone as account_exec_phone,
  c.contact_name,
  c.contact_email
from public.clients c
left join public.profiles ae on ae.id = c.account_exec_id
left join public.services s on s.id = c.service_id
where public.can_access_client(c.id);

-- ---------------------------------------------------------------------------
-- Scheduled jobs (07-integrations.md): Vercel Cron calls /api/cron/*, which
-- runs as the service role. Each job is safe to run twice.
-- ---------------------------------------------------------------------------

-- Which automatic emails went out, so a re-run never sends one twice.
-- kind: 'reminder_due_soon' | 'reminder_overdue_1' | 'reminder_overdue_7' |
-- 'approvals_waiting'; ref: the invoice id, or client id and date.
create table public.sent_emails (
  kind text not null check (kind in ('reminder_due_soon', 'reminder_overdue_1', 'reminder_overdue_7', 'approvals_waiting')),
  ref text not null check (length(ref) <= 120),
  sent_at timestamptz not null default now(),
  primary key (kind, ref)
);

alter table public.sent_emails enable row level security;
grant select, insert, update, delete on public.sent_emails to service_role;

-- Weekly tidy-up: sign-in attempts older than 30 days, and questionnaire
-- links that expired over 90 days ago without being used.
create function public.cleanup_old_records()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempts int;
  v_links int;
begin
  delete from public.login_attempts where created_at < now() - interval '30 days';
  get diagnostics v_attempts = row_count;
  delete from public.questionnaire_invites
  where used_at is null and expires_at < now() - interval '90 days';
  get diagnostics v_links = row_count;
  delete from public.sent_emails where sent_at < now() - interval '400 days';
  return jsonb_build_object('login_attempts', v_attempts, 'questionnaire_links', v_links);
end;
$$;

revoke execute on function public.cleanup_old_records() from public, anon, authenticated;
grant execute on function public.cleanup_old_records() to service_role;

-- The stale-review nudge moves from pg_cron to the approval-nudges job.
grant execute on function public.notify_stale_client_reviews() to service_role;
select cron.unschedule('nudge-client-reviews')
where exists (select 1 from cron.job where jobname = 'nudge-client-reviews');
