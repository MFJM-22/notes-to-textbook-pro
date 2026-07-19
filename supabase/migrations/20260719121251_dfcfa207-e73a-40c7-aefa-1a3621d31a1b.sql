
-- Fix SECURITY DEFINER exposure
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;

-- Storage policies for 'scans' bucket, folder = author_id
CREATE POLICY "scans_select_own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'scans' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "scans_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'scans' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "scans_update_own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'scans' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "scans_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'scans' AND (storage.foldername(name))[1] = auth.uid()::text);
