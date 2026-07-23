
GRANT SELECT ON public.message_tokens TO anon, authenticated;
GRANT INSERT ON public.message_tokens TO authenticated;
REVOKE UPDATE ON public.message_tokens FROM anon, authenticated;
GRANT UPDATE (opened_at) ON public.message_tokens TO anon, authenticated;
GRANT ALL ON public.message_tokens TO service_role;

CREATE POLICY "Anyone can view message tokens by token"
  ON public.message_tokens FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can create message tokens"
  ON public.message_tokens FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can mark message tokens opened"
  ON public.message_tokens FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
