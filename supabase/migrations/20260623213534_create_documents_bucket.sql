INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true,
  52428800,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "auth_upload_documents" ON storage.objects;
CREATE POLICY "auth_upload_documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "public_read_documents" ON storage.objects;
CREATE POLICY "public_read_documents"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "auth_delete_documents" ON storage.objects;
CREATE POLICY "auth_delete_documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "auth_update_documents" ON storage.objects;
CREATE POLICY "auth_update_documents"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'documents');
