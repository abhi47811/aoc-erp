-- Custom invite flow, replacing reliance on Supabase Auth's built-in email
-- sender (signInWithOtp/admin.inviteUserByEmail both route through it
-- regardless of SMTP config, and it's rate-limited to a handful of
-- emails/hour on the default tier -- confirmed live: "email rate limit
-- exceeded"). The invite record and token live here; the actual email is
-- sent directly via Resend from application code, and acceptance creates
-- the auth user via the service-role admin API.

create table if not exists tenant_invites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  email text not null,
  role text not null,
  token text not null unique,
  invited_by uuid,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz
);

create index tenant_invites_token on tenant_invites(token);
create index tenant_invites_tenant on tenant_invites(tenant_id);

-- Deny-all by default (anon/authenticated). All access goes through the
-- service-role client in tRPC procedures, which validate the token
-- server-side before returning or acting on anything -- the same pattern
-- already used by admin.ts for platform-wide queries.
alter table tenant_invites enable row level security;
