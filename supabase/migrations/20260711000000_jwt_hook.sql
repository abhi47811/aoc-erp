-- Custom JWT hook: inject tenant_id and user_role into access token claims.
-- After creating this function, register it in the Supabase Dashboard:
--   Authentication → Hooks → Custom Access Token Hook → set to public.custom_jwt_claims

CREATE OR REPLACE FUNCTION public.custom_jwt_claims(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims     jsonb;
  user_row   record;
BEGIN
  claims := event -> 'claims';

  SELECT tenant_id, role
    INTO user_row
    FROM public.tenant_users
   WHERE user_id = (event ->> 'user_id')::uuid
     AND is_active = true
   LIMIT 1;

  IF user_row IS NOT NULL THEN
    claims := jsonb_set(claims, '{tenant_id}', to_jsonb(user_row.tenant_id::text));
    claims := jsonb_set(claims, '{user_role}',  to_jsonb(user_row.role::text));
  END IF;

  RETURN claims;
END;
$$;

-- Grant execute to the Supabase Auth hook role
GRANT EXECUTE ON FUNCTION public.custom_jwt_claims(jsonb)
  TO supabase_auth_admin;

REVOKE EXECUTE ON FUNCTION public.custom_jwt_claims(jsonb)
  FROM PUBLIC, anon, authenticated;
