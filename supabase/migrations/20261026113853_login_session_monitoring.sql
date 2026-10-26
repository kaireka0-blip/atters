-- Track one row per Supabase Auth session without exposing the data to anon users.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE TABLE IF NOT EXISTS private.login_monitor_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);
REVOKE ALL ON private.login_monitor_admins FROM PUBLIC, anon, authenticated;

-- Snapshot existing application administrators at migration time. Changes to
-- this registry must be made by a trusted database operator, never by clients.
INSERT INTO private.login_monitor_admins (user_id)
SELECT u.id
FROM public.users AS u
JOIN auth.users AS au ON au.id = u.id
WHERE u.role = 'Admin'
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION private.is_login_monitor_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM private.login_monitor_admins AS admins
    WHERE admins.user_id = (SELECT auth.uid())
  );
$$;
REVOKE ALL ON FUNCTION private.is_login_monitor_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_login_monitor_admin() TO authenticated;

CREATE TABLE IF NOT EXISTS public.user_login_sessions (
  session_id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  device_label text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);

CREATE INDEX IF NOT EXISTS user_login_sessions_user_last_seen_idx
  ON public.user_login_sessions (user_id, last_seen_at DESC);

ALTER TABLE public.user_login_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_login_sessions FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON public.user_login_sessions TO authenticated;

DROP POLICY IF EXISTS "Users and admins can read login sessions" ON public.user_login_sessions;
CREATE POLICY "Users and admins can read login sessions"
  ON public.user_login_sessions FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT private.is_login_monitor_admin()));

DROP POLICY IF EXISTS "Users can register their own login sessions" ON public.user_login_sessions;
CREATE POLICY "Users can register their own login sessions"
  ON public.user_login_sessions FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own login sessions" ON public.user_login_sessions;
CREATE POLICY "Users can update their own login sessions"
  ON public.user_login_sessions FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
    AND NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'user_login_sessions'
    ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_login_sessions;
  END IF;
END;
$$;
