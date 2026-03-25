
CREATE TABLE public.recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text,
  email text,
  phone text,
  last_contacted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recipients"
  ON public.recipients FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recipients"
  ON public.recipients FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recipients"
  ON public.recipients FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);
