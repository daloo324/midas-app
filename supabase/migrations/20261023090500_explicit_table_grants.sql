-- Table privileges, stated explicitly so local and hosted databases match.
--
-- Newer hosted Supabase projects don't grant the API roles anything on new
-- tables, while the local stack grants everything. Neither is right: RLS
-- decides which rows a signed-in user reaches, but the grants decide which
-- operations exist at all, and TRUNCATE is not covered by RLS.
--
-- anon:          nothing (the public pages go through server code)
-- authenticated: exactly the operations the policies allow
-- service_role:  read and write, no TRUNCATE (server-only tasks, see CLAUDE.md)

revoke all on
  public.profiles, public.client_users, public.clients, public.services,
  public.settings, public.login_attempts, public.status_events,
  public.comments, public.notifications, public.document_counters,
  public.portal_client
from anon, authenticated, service_role;

-- Revoking table privileges also removes column privileges, so the
-- column-limited updates from earlier migrations are granted again here.
grant select on public.profiles to authenticated;
grant update (full_name, role, active, avatar_path) on public.profiles to authenticated;

grant select on public.client_users to authenticated;
grant update (full_name, active) on public.client_users to authenticated;

grant select, insert, update on public.clients to authenticated;
grant select, insert, update on public.services to authenticated;
grant select, update on public.settings to authenticated;

grant select on public.status_events to authenticated;
grant select, insert on public.comments to authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

grant select on public.portal_client to authenticated;

-- login_attempts and document_counters: server code only.
grant select, insert, update, delete on
  public.profiles, public.client_users, public.clients, public.services,
  public.settings, public.login_attempts, public.status_events,
  public.comments, public.notifications, public.document_counters,
  public.portal_client
to service_role;

-- New tables start with no API access; each migration grants what it needs.
alter default privileges in schema public revoke all on tables from anon, authenticated, service_role;
