-- While the brand kit waits for the client's sign-off, the client sees the
-- logo, icon and guide previews they're signing off (Dave, 2026-10-23).
-- Fonts, extras, the zip and the Brand assets tab stay closed until approval.

create function public.client_sees_kit_slot(p_client_id uuid, p_slot text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.brand_kits k
    where k.client_id = p_client_id
      and (k.status = 'approved'
        or (k.status = 'client_review' and (p_slot ~ '^(logo|icon)_' or p_slot = 'guide_pdf')))
  );
$$;

revoke execute on function public.client_sees_kit_slot(uuid, text) from public, anon;
grant execute on function public.client_sees_kit_slot(uuid, text) to authenticated;

drop policy "Clients read signed-off brand kit files" on public.brand_kit_files;
create policy "Clients read their kit files at sign-off and after" on public.brand_kit_files
  for select to authenticated
  using (
    public.auth_role() = 'client' and public.can_access_client(client_id)
    and public.client_sees_kit_slot(client_id, slot)
  );

create or replace function public.kit_object_readable(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when public.is_staff() then public.can_access_client(public.storage_client_id(p_name))
    when public.auth_role() = 'client' then
      public.can_access_client(public.storage_client_id(p_name))
      and public.client_sees_kit_slot(public.storage_client_id(p_name), (storage.foldername(p_name))[2])
    else false
  end;
$$;
