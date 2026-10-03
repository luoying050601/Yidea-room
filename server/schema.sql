CREATE TABLE IF NOT EXISTS public.idea_boards (
  id text PRIMARY KEY CHECK (id ~ '^[a-zA-Z0-9_-]{1,80}$'),
  board jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.idea_boards ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.idea_boards FROM anon, authenticated;