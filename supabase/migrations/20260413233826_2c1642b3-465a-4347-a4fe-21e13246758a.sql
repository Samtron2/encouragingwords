CREATE POLICY "Anyone can update opened_at on message tokens"
  ON public.message_tokens FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);