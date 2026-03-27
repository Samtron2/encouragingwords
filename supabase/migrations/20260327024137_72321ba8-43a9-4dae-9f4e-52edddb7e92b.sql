CREATE POLICY "Users can delete their own recipients"
ON public.recipients
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);