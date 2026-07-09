-- Tenants can attach a photo or short video to a maintenance ticket so the
-- landlord can see the problem without a site visit.

ALTER TABLE maintenance_tickets RENAME COLUMN photo_url TO attachment_url;
ALTER TABLE maintenance_tickets
  ADD COLUMN IF NOT EXISTS attachment_name TEXT,
  ADD COLUMN IF NOT EXISTS attachment_type TEXT CHECK (attachment_type IN ('image', 'video'));

-- Dedicated bucket (kept separate from `documents`) so large video uploads
-- don't share quota/limits with receipts and tenant paperwork.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'maintenance-media',
  'maintenance-media',
  true,
  104857600, -- 100 MB
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'video/webm'
  ]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "auth_upload_maintenance_media" ON storage.objects;
CREATE POLICY "auth_upload_maintenance_media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'maintenance-media');

DROP POLICY IF EXISTS "public_read_maintenance_media" ON storage.objects;
CREATE POLICY "public_read_maintenance_media"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'maintenance-media');

DROP POLICY IF EXISTS "auth_delete_maintenance_media" ON storage.objects;
CREATE POLICY "auth_delete_maintenance_media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'maintenance-media');

DROP POLICY IF EXISTS "auth_update_maintenance_media" ON storage.objects;
CREATE POLICY "auth_update_maintenance_media"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'maintenance-media');
