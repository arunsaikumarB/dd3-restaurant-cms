-- =============================================================================
-- Contact & catering enquiries — public form submissions
-- =============================================================================

CREATE TYPE public.enquiry_source AS ENUM ('contact', 'catering');

CREATE TABLE public.contact_enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL,
  source public.enquiry_source NOT NULL DEFAULT 'contact',
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  event_type TEXT,
  event_date DATE,
  guest_count INTEGER CHECK (guest_count IS NULL OR guest_count > 0),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT contact_enquiries_location_id_check
    CHECK (location_id IN ('south-plainfield', 'oak-tree', 'lawrenceville'))
);

CREATE INDEX contact_enquiries_location_id_idx ON public.contact_enquiries (location_id);
CREATE INDEX contact_enquiries_source_idx ON public.contact_enquiries (source);
CREATE INDEX contact_enquiries_status_idx ON public.contact_enquiries (status);
CREATE INDEX contact_enquiries_created_at_idx ON public.contact_enquiries (created_at DESC);

CREATE TRIGGER contact_enquiries_set_updated_at
  BEFORE UPDATE ON public.contact_enquiries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.contact_enquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contact_enquiries_public_insert"
  ON public.contact_enquiries FOR INSERT
  TO anon, authenticated
  WITH CHECK (status = 'new');

CREATE POLICY "contact_enquiries_admin_select"
  ON public.contact_enquiries FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "contact_enquiries_admin_update"
  ON public.contact_enquiries FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "contact_enquiries_admin_delete"
  ON public.contact_enquiries FOR DELETE
  TO authenticated
  USING (public.is_admin());
