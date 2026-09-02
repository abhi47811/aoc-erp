-- Supabase security advisor: these two SECURITY INVOKER functions had no
-- explicit search_path, leaving them open to search_path hijacking if a
-- lower-privileged role could ever create shadowing objects earlier in the
-- resolution path. Pinning search_path is a no-op behaviorally (both
-- functions only ever reference public-schema tables) but closes the lint.

alter function public.guard_tenant_users_role_change() set search_path = public, pg_temp;
alter function public.next_document_number(uuid, text, text) set search_path = public, pg_temp;
