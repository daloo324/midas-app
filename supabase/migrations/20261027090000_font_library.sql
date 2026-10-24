-- A shared font library for the Design Studio's Fonts & pairings: the
-- creative director (or CEO) uploads downloaded fonts and adds pairings
-- (Dave, 2026-10-24). Every staff member can see and use them.

create function public.manages_font_library()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.auth_role() in ('ceo', 'creative_director'), false);
$$;

revoke execute on function public.manages_font_library() from public, anon;
grant execute on function public.manages_font_library() to authenticated;

-- ---------------------------------------------------------------------------
-- library_fonts: one file per family, weight and style
-- ---------------------------------------------------------------------------

create table public.library_fonts (
  id uuid primary key default gen_random_uuid(),
  family text not null check (family ~ '^[A-Za-z0-9][A-Za-z0-9 \-]{0,59}$'),
  weight int not null check (weight in (100, 200, 300, 400, 500, 600, 700, 800, 900)),
  italic boolean not null default false,
  storage_path text not null unique,
  file_name text not null check (lower(file_name) ~ '\.(ttf|otf|woff|woff2)$' and length(file_name) <= 200),
  size_bytes bigint not null check (size_bytes between 1 and 10485760),
  licence_note text check (length(licence_note) <= 300),
  uploaded_by uuid not null references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now(),
  unique (family, weight, italic)
);

alter table public.library_fonts enable row level security;
create policy "Staff read the font library" on public.library_fonts
  for select to authenticated using (public.is_staff());
create policy "Creative director adds library fonts" on public.library_fonts
  for insert to authenticated with check (public.manages_font_library() and uploaded_by = auth.uid());
create policy "Creative director removes library fonts" on public.library_fonts
  for delete to authenticated using (public.manages_font_library());

grant select, delete on public.library_fonts to authenticated;
grant insert (family, weight, italic, storage_path, file_name, size_bytes, licence_note, uploaded_by) on public.library_fonts to authenticated;
grant select, insert, update, delete on public.library_fonts to service_role;

-- ---------------------------------------------------------------------------
-- library_pairings: a heading and body family (library or Google Fonts)
-- ---------------------------------------------------------------------------

create table public.library_pairings (
  id uuid primary key default gen_random_uuid(),
  heading_family text not null check (heading_family ~ '^[A-Za-z0-9][A-Za-z0-9 \-]{0,59}$'),
  body_family text not null check (body_family ~ '^[A-Za-z0-9][A-Za-z0-9 \-]{0,59}$'),
  style text not null check (style in ('Classic serif', 'Clean modern', 'Friendly rounded', 'Bold & condensed', 'Handwritten')),
  good_for text check (length(good_for) <= 120),
  created_by uuid not null references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now(),
  unique (heading_family, body_family)
);

alter table public.library_pairings enable row level security;
create policy "Staff read library pairings" on public.library_pairings
  for select to authenticated using (public.is_staff());
create policy "Creative director adds pairings" on public.library_pairings
  for insert to authenticated with check (public.manages_font_library() and created_by = auth.uid());
create policy "Creative director removes pairings" on public.library_pairings
  for delete to authenticated using (public.manages_font_library());

grant select, delete on public.library_pairings to authenticated;
grant insert (heading_family, body_family, style, good_for, created_by) on public.library_pairings to authenticated;
grant select, insert, update, delete on public.library_pairings to service_role;

-- ---------------------------------------------------------------------------
-- fonts bucket: {uuid}/{file}, private, font files only
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit)
values ('fonts', 'fonts', false, 10485760)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

create policy "Font library files: staff read" on storage.objects
  for select to authenticated using (bucket_id = 'fonts' and public.is_staff());
create policy "Font library files: creative director uploads" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fonts' and public.manages_font_library() and lower(name) ~ '\.(ttf|otf|woff|woff2)$');
create policy "Font library files: creative director removes" on storage.objects
  for delete to authenticated using (bucket_id = 'fonts' and public.manages_font_library());
