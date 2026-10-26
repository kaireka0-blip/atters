-- Keep browser push endpoints out of the public session table and Data API.
ALTER TABLE public.user_login_sessions
  DROP COLUMN IF EXISTS push_endpoint;

CREATE TABLE IF NOT EXISTS private.login_session_push_targets (
  session_id uuid PRIMARY KEY
    REFERENCES public.user_login_sessions(session_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL
);
REVOKE ALL ON private.login_session_push_targets FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO service_role;
GRANT SELECT ON private.login_session_push_targets TO service_role;

-- Authenticated clients can only attach an endpoint to their own live session.
CREATE OR REPLACE FUNCTION public.set_login_session_push_endpoint(
  p_session_id uuid,
  p_endpoint text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.user_login_sessions AS sessions
    WHERE sessions.session_id = p_session_id
      AND sessions.user_id = auth.uid()
      AND sessions.ended_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Active login session is required';
  END IF;

  IF p_endpoint IS NULL THEN
    DELETE FROM private.login_session_push_targets AS targets
    WHERE targets.session_id = p_session_id
      AND targets.user_id = auth.uid();
  ELSE
    INSERT INTO private.login_session_push_targets (session_id, user_id, endpoint)
    VALUES (p_session_id, auth.uid(), p_endpoint)
    ON CONFLICT (session_id) DO UPDATE
      SET user_id = EXCLUDED.user_id,
          endpoint = EXCLUDED.endpoint;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.set_login_session_push_endpoint(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_login_session_push_endpoint(uuid, text) TO authenticated;

-- Only the service-role Edge Function can resolve endpoints for other live sessions.
CREATE OR REPLACE FUNCTION public.get_active_other_login_push_endpoints(
  p_user_id uuid,
  p_excluded_session_id uuid
)
RETURNS TABLE(endpoint text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT targets.endpoint
  FROM private.login_session_push_targets AS targets
  JOIN public.user_login_sessions AS sessions
    ON sessions.session_id = targets.session_id
   AND sessions.user_id = targets.user_id
  WHERE sessions.user_id = p_user_id
    AND sessions.session_id <> p_excluded_session_id
    AND sessions.ended_at IS NULL
    AND sessions.last_seen_at >= now() - interval '2 minutes';
$$;
REVOKE ALL ON FUNCTION public.get_active_other_login_push_endpoints(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_other_login_push_endpoints(uuid, uuid) TO service_role;
