ALTER TABLE private.login_session_push_targets ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON private.login_session_push_targets TO authenticated;

DROP POLICY IF EXISTS "Users can read their own private login push targets"
  ON private.login_session_push_targets;
CREATE POLICY "Users can read their own private login push targets"
  ON private.login_session_push_targets FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can add their own private login push targets"
  ON private.login_session_push_targets;
CREATE POLICY "Users can add their own private login push targets"
  ON private.login_session_push_targets FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own private login push targets"
  ON private.login_session_push_targets;
CREATE POLICY "Users can update their own private login push targets"
  ON private.login_session_push_targets FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own private login push targets"
  ON private.login_session_push_targets;
CREATE POLICY "Users can delete their own private login push targets"
  ON private.login_session_push_targets FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.set_login_session_push_endpoint(
  p_session_id uuid,
  p_endpoint text
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
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
