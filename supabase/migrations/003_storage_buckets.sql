-- =============================================================================
-- Supabase Storage buckets + policies
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('menu-images', 'menu-images', TRUE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('gallery-images', 'gallery-images', TRUE, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('offer-images', 'offer-images', TRUE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('homepage-images', 'homepage-images', TRUE, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4']),
  ('restaurant-assets', 'restaurant-assets', TRUE, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/x-icon', 'image/vnd.microsoft.icon'])
ON CONFLICT (id) DO NOTHING;

-- Public read for all buckets
CREATE POLICY "storage_public_read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id IN (
    'menu-images', 'gallery-images', 'offer-images', 'homepage-images', 'restaurant-assets'
  ));

-- Admin upload
CREATE POLICY "storage_admin_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id IN (
      'menu-images', 'gallery-images', 'offer-images', 'homepage-images', 'restaurant-assets'
    )
    AND public.is_admin()
  );

-- Admin update
CREATE POLICY "storage_admin_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admin delete
CREATE POLICY "storage_admin_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (public.is_admin());
