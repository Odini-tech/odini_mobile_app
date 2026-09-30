-- Link each saved location to its listing so create and edit flows can upsert it.
ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS listing_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'locations_listing_id_fkey'
  ) THEN
    ALTER TABLE public.locations
      ADD CONSTRAINT locations_listing_id_fkey
      FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS locations_listing_id_key
  ON public.locations (listing_id);
