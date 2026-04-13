CREATE TABLE public.message_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  sender_name text,
  recipient_name text,
  message_text text NOT NULL,
  visual_emoji text,
  visual_image_url text,
  opened_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.message_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read message tokens"
  ON public.message_tokens FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert message tokens"
  ON public.message_tokens FOR INSERT
  TO authenticated
  WITH CHECK (true);