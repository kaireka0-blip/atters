-- Associate a logged-in session with its own opt-in browser push endpoint.
ALTER TABLE public.user_login_sessions
  ADD COLUMN IF NOT EXISTS push_endpoint text;
