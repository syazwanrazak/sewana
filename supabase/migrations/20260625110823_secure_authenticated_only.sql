-- Storage: revert to authenticated-only writes, public reads
DROP POLICY IF EXISTS "auth_upload_documents" ON storage.objects;
CREATE POLICY "auth_upload_documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "auth_delete_documents" ON storage.objects;
CREATE POLICY "auth_delete_documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "auth_update_documents" ON storage.objects;
CREATE POLICY "auth_update_documents"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'documents');

-- Public read is intentional — files are served via public URLs
DROP POLICY IF EXISTS "public_read_documents" ON storage.objects;
CREATE POLICY "public_read_documents"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'documents');

-- Documents table: re-enable RLS (authenticated policies already exist from earlier migration)
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
