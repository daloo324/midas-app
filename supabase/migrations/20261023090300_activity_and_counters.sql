-- The audit trail, comments, notifications and document counters
-- (02-data-model.md). client_id is stored on each row so RLS can check access.

-- ---------------------------------------------------------------------------
-- status_events: insert-only audit trail of every status move.
-- Rows are written by security-definer functions (set_content_status and
-- friends, from Phase 2), never inserted, edited or deleted directly by users.
-- ---------------------------------------------------------------------------

create table public.status_events (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id),
  entity_type text not null check (entity_type in ('content_item', 'brand_kit', 'content_month', 'campaign')),
  entity_id uuid not null,
  from_status text,
  to_status text not null,
  comment text,
  actor_id uuid references auth.users (id),
  actor_kind text not null check (actor_kind in ('staff', 'client', 'system')),
  created_at timestamptz not null default now(),
  check (
    (from_status is null or from_status in (
      'planned', 'in_design', 'internal_review', 'client_review', 'changes_requested',
      'approved', 'scheduled', 'published', 'draft', 'sent', 'live', 'complete'))
    and to_status in (
      'planned', 'in_design', 'internal_review', 'client_review', 'changes_requested',
      'approved', 'scheduled', 'published', 'draft', 'sent', 'live', 'complete')
  )
);

create index status_events_entity_idx on public.status_events (entity_type, entity_id, created_at);
create index status_events_client_id_idx on public.status_events (client_id);

alter table public.status_events enable row level security;
revoke all on public.status_events from anon;
revoke insert, update, delete, truncate on public.status_events from authenticated;

create policy "Staff read status history" on public.status_events
  for select to authenticated using (public.is_staff() and public.can_access_client(client_id));

-- ---------------------------------------------------------------------------
-- comments: discussion on any piece of work. Clients see and write only
-- comments that are visible to the client.
-- ---------------------------------------------------------------------------

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id),
  entity_type text not null check (entity_type in ('content_item', 'brand_kit', 'content_month', 'campaign')),
  entity_id uuid not null,
  body text not null check (length(trim(body)) > 0),
  author_id uuid not null references auth.users (id),
  author_kind text not null check (author_kind in ('staff', 'client')),
  visible_to_client boolean not null default false,
  created_at timestamptz not null default now()
);

create index comments_entity_idx on public.comments (entity_type, entity_id, created_at);
create index comments_client_id_idx on public.comments (client_id);

alter table public.comments enable row level security;
revoke all on public.comments from anon;
revoke update, delete, truncate on public.comments from authenticated;

create policy "Staff read comments" on public.comments
  for select to authenticated using (public.is_staff() and public.can_access_client(client_id));
create policy "Clients read comments shown to them" on public.comments
  for select to authenticated
  using (public.auth_role() = 'client' and visible_to_client and public.can_access_client(client_id));
create policy "Staff add comments" on public.comments
  for insert to authenticated
  with check (
    public.is_staff() and public.can_access_client(client_id)
    and author_id = auth.uid() and author_kind = 'staff'
  );
create policy "Clients add comments" on public.comments
  for insert to authenticated
  with check (
    public.auth_role() = 'client' and public.can_access_client(client_id)
    and author_id = auth.uid() and author_kind = 'client' and visible_to_client
  );

-- ---------------------------------------------------------------------------
-- notifications: one person's in-app messages. Created by triggers; the person
-- can only read theirs and mark them read.
-- ---------------------------------------------------------------------------

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id),
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_id_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;
revoke all on public.notifications from anon;
revoke insert, update, delete, truncate on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy "People read their notifications" on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy "People mark their notifications read" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- document_counters: one counter per document type per year, so quote,
-- invoice and credit note numbers never skip or repeat. Service role only.
-- The numbering function arrives with invoices in Phase 5.
-- ---------------------------------------------------------------------------

create table public.document_counters (
  doc_type text not null check (doc_type in ('quote', 'invoice', 'credit_note')),
  year int not null check (year between 2024 and 2200),
  last_number int not null default 0 check (last_number >= 0),
  updated_at timestamptz not null default now(),
  primary key (doc_type, year)
);

create trigger document_counters_updated_at before update on public.document_counters
  for each row execute function public.set_updated_at();

alter table public.document_counters enable row level security;
revoke all on public.document_counters from anon, authenticated;
