
CREATE TABLE public.upgrade_interest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.upgrade_interest TO authenticated;
GRANT ALL ON public.upgrade_interest TO service_role;

ALTER TABLE public.upgrade_interest ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own interest"
  ON public.upgrade_interest FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own interest"
  ON public.upgrade_interest FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all interest"
  ON public.upgrade_interest FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
