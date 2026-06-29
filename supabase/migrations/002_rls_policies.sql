-- =============================================================================
-- Row Level Security policies
-- =============================================================================

-- Helper: authenticated admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role IN ('admin', 'staff')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own"
  ON public.users FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "users_admin_all"
  ON public.users FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- restaurant_settings
-- ---------------------------------------------------------------------------
ALTER TABLE public.restaurant_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "restaurant_settings_public_read"
  ON public.restaurant_settings FOR SELECT
  TO anon, authenticated
  USING (TRUE);

CREATE POLICY "restaurant_settings_admin_write"
  ON public.restaurant_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "restaurant_settings_admin_update"
  ON public.restaurant_settings FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "restaurant_settings_admin_delete"
  ON public.restaurant_settings FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- homepage_content
-- ---------------------------------------------------------------------------
ALTER TABLE public.homepage_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "homepage_content_public_read"
  ON public.homepage_content FOR SELECT
  TO anon, authenticated
  USING (TRUE);

CREATE POLICY "homepage_content_admin_insert"
  ON public.homepage_content FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "homepage_content_admin_update"
  ON public.homepage_content FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "homepage_content_admin_delete"
  ON public.homepage_content FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- menu_categories
-- ---------------------------------------------------------------------------
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "menu_categories_public_read"
  ON public.menu_categories FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

CREATE POLICY "menu_categories_admin_read"
  ON public.menu_categories FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "menu_categories_admin_insert"
  ON public.menu_categories FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "menu_categories_admin_update"
  ON public.menu_categories FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "menu_categories_admin_delete"
  ON public.menu_categories FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- menu_items
-- ---------------------------------------------------------------------------
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "menu_items_public_read"
  ON public.menu_items FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

CREATE POLICY "menu_items_admin_read"
  ON public.menu_items FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "menu_items_admin_insert"
  ON public.menu_items FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "menu_items_admin_update"
  ON public.menu_items FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "menu_items_admin_delete"
  ON public.menu_items FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- offers
-- ---------------------------------------------------------------------------
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "offers_public_read"
  ON public.offers FOR SELECT
  TO anon, authenticated
  USING (active = TRUE);

CREATE POLICY "offers_admin_read"
  ON public.offers FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "offers_admin_insert"
  ON public.offers FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "offers_admin_update"
  ON public.offers FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "offers_admin_delete"
  ON public.offers FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- gallery
-- ---------------------------------------------------------------------------
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gallery_public_read"
  ON public.gallery FOR SELECT
  TO anon, authenticated
  USING (TRUE);

CREATE POLICY "gallery_admin_insert"
  ON public.gallery FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "gallery_admin_update"
  ON public.gallery FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "gallery_admin_delete"
  ON public.gallery FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- reservations — public can insert (booking form); admins manage all
-- ---------------------------------------------------------------------------
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reservations_public_insert"
  ON public.reservations FOR INSERT
  TO anon, authenticated
  WITH CHECK (TRUE);

CREATE POLICY "reservations_admin_select"
  ON public.reservations FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "reservations_admin_update"
  ON public.reservations FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "reservations_admin_delete"
  ON public.reservations FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- reviews — public can submit; only approved visible to anon
-- ---------------------------------------------------------------------------
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews_public_read_approved"
  ON public.reviews FOR SELECT
  TO anon
  USING (approved = TRUE);

CREATE POLICY "reviews_public_insert"
  ON public.reviews FOR INSERT
  TO anon, authenticated
  WITH CHECK (TRUE);

CREATE POLICY "reviews_admin_select"
  ON public.reviews FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "reviews_admin_update"
  ON public.reviews FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "reviews_admin_delete"
  ON public.reviews FOR DELETE
  TO authenticated
  USING (public.is_admin());
