-- Align Supabase Storage bucket file size limits with CMS requirements:
-- images up to 10 MB, hero videos up to 100 MB (homepage-images bucket).

UPDATE storage.buckets
SET file_size_limit = 104857600
WHERE id = 'homepage-images';

UPDATE storage.buckets
SET file_size_limit = 10485760
WHERE id IN ('menu-images', 'gallery-images', 'offer-images', 'restaurant-assets');
