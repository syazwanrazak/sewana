ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_documents" ON documents;
CREATE POLICY "auth_select_documents"
ON documents FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "auth_insert_documents" ON documents;
CREATE POLICY "auth_insert_documents"
ON documents FOR INSERT TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_documents" ON documents;
CREATE POLICY "auth_update_documents"
ON documents FOR UPDATE TO authenticated
USING (true);

DROP POLICY IF EXISTS "auth_delete_documents" ON documents;
CREATE POLICY "auth_delete_documents"
ON documents FOR DELETE TO authenticated
USING (true);
