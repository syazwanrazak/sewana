DROP POLICY IF EXISTS "auth_upload_documents" ON storage.objects;
CREATE POLICY "auth_upload_documents"
ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "public_read_documents" ON storage.objects;
CREATE POLICY "public_read_documents"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "auth_delete_documents" ON storage.objects;
CREATE POLICY "auth_delete_documents"
ON storage.objects FOR DELETE TO anon
USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "auth_update_documents" ON storage.objects;
CREATE POLICY "auth_update_documents"
ON storage.objects FOR UPDATE TO anon
USING (bucket_id = 'documents');
