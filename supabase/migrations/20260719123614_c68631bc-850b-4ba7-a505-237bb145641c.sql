
CREATE POLICY exports_own_all ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'exports' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'exports' AND (storage.foldername(name))[1] = auth.uid()::text);
