-- Let an interaction target a host (follow) or a venue (favorite) as well as a
-- listing. Exactly one of listing_id / host_id / venue_id is set per row.
ALTER TABLE public.interactions
  ALTER COLUMN listing_id DROP NOT NULL;

ALTER TABLE public.interactions
  ADD COLUMN IF NOT EXISTS host_id uuid,
  ADD COLUMN IF NOT EXISTS venue_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'interactions_host_id_fkey'
  ) THEN
    ALTER TABLE public.interactions
      ADD CONSTRAINT interactions_host_id_fkey
      FOREIGN KEY (host_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'interactions_venue_id_fkey'
  ) THEN
    ALTER TABLE public.interactions
      ADD CONSTRAINT interactions_venue_id_fkey
      FOREIGN KEY (venue_id) REFERENCES public.venues(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'interactions_single_target_check'
  ) THEN
    ALTER TABLE public.interactions
      ADD CONSTRAINT interactions_single_target_check
      CHECK (num_nonnulls(listing_id, host_id, venue_id) = 1);
  END IF;
END $$;

-- One follow per (user, host) and one favorite per (user, venue).
CREATE UNIQUE INDEX IF NOT EXISTS interactions_user_host_key
  ON public.interactions (user_id, host_id)
  WHERE host_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS interactions_user_venue_key
  ON public.interactions (user_id, venue_id)
  WHERE venue_id IS NOT NULL;
