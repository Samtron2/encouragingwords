
CREATE POLICY "Public read message-photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'message-photos');

CREATE POLICY "Users upload own message-photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'message-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users update own message-photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'message-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users delete own message-photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'message-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
