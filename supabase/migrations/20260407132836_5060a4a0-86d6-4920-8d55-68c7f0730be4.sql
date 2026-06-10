-- Storage: Deny UPDATE on all three buckets (no one should overwrite files)
CREATE POLICY "Deny storage update" ON storage.objects FOR UPDATE TO authenticated
  USING (false);

-- Storage: Only admins can delete files
CREATE POLICY "Admin only storage delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id IN ('chat-media', 'delivery-photos', 'receipts')
    AND is_admin(auth.uid())
  );