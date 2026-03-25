
CREATE TABLE public.important_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  contact_id uuid REFERENCES public.recipients(id) ON DELETE SET NULL,
  name text NOT NULL,
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  day integer NOT NULL CHECK (day >= 1 AND day <= 31),
  occasion_type text NOT NULL DEFAULT 'Birthday',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.important_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own important dates"
  ON public.important_dates FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own important dates"
  ON public.important_dates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own important dates"
  ON public.important_dates FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
