-- =============================================================================
-- Production hardening — RLS tightening and safe user provisioning
-- =============================================================================

-- Never assign admin from user-controlled signup metadata.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    'staff'::public.user_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Public gallery: only visible images (defense in depth with client filter).
DROP POLICY IF EXISTS "gallery_public_read" ON public.gallery;
CREATE POLICY "gallery_public_read"
  ON public.gallery FOR SELECT
  TO anon, authenticated
  USING (visible = TRUE);

-- Public reviews: submissions must start unapproved and not featured.
DROP POLICY IF EXISTS "reviews_public_insert" ON public.reviews;
CREATE POLICY "reviews_public_insert"
  ON public.reviews FOR INSERT
  TO anon, authenticated
  WITH CHECK (approved = FALSE AND featured = FALSE);

-- Public reservations: only pending bookings from anonymous forms.
DROP POLICY IF EXISTS "reservations_public_insert" ON public.reservations;
CREATE POLICY "reservations_public_insert"
  ON public.reservations FOR INSERT
  TO anon, authenticated
  WITH CHECK (status = 'pending'::public.reservation_status);
