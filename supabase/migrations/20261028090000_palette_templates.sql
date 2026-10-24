-- Palette templates for the palette builder move into the database so the
-- creative director (or CEO) can add new ones and remove old or unused ones
-- (Dave, 2026-10-24). Brand kits keep their own copy of the colours, so
-- removing a template never changes a client's kit.

create function public.manages_palettes()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.auth_role() in ('ceo', 'creative_director'), false);
$$;

revoke execute on function public.manages_palettes() from public, anon;
grant execute on function public.manages_palettes() to authenticated;

create table public.palette_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) between 1 and 60),
  primary_color text not null check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  secondary_color text not null check (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  tertiary_color text not null check (tertiary_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color text not null check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order int not null default 1000,
  created_by uuid references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.palette_templates enable row level security;
create policy "Staff read palette templates" on public.palette_templates
  for select to authenticated using (public.is_staff());
create policy "Creative director adds palette templates" on public.palette_templates
  for insert to authenticated with check (public.manages_palettes() and created_by = auth.uid());
create policy "Creative director removes palette templates" on public.palette_templates
  for delete to authenticated using (public.manages_palettes());

grant select, delete on public.palette_templates to authenticated;
grant insert (name, primary_color, secondary_color, tertiary_color, accent_color, created_by)
  on public.palette_templates to authenticated;
grant select, insert, update, delete on public.palette_templates to service_role;

-- The eight templates from the prototype.
insert into public.palette_templates (name, primary_color, secondary_color, tertiary_color, accent_color, sort_order, created_by) values
  ('Midas navy & gold', '#0E2A36', '#18404F', '#4F8C8F', '#C49A47', 0, null),
  ('Earth & sand', '#6E4A2B', '#B98B5E', '#E6D2B5', '#2F6B3C', 1, null),
  ('Fresh greens', '#2F6B3C', '#5FA05B', '#BFDCA8', '#F2CF45', 2, null),
  ('Calm blues', '#1F5E8C', '#4E9AC7', '#BFE0F2', '#F2A65A', 3, null),
  ('Warm reds', '#B83A2E', '#E0663A', '#F6D9C7', '#F2CF45', 4, null),
  ('Plum & blush', '#4B2B5E', '#7E4E9C', '#E58AAE', '#C49A47', 5, null),
  ('Mono & sun', '#1A1A1A', '#7A7A7A', '#D9D9D9', '#F2CF45', 6, null),
  ('Teal & coral', '#1D5560', '#4F8C8F', '#CFE3E2', '#E5735C', 7, null)
;
