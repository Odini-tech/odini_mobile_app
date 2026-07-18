-- Adds the safety_notes table (Guardian pillar, v1 slice).
-- Curated, hand-written notes only for launch — NOT LLM-generated.
-- Scope: Lusaka + Livingstone only, matching the wedge-feature scope.

CREATE TABLE IF NOT EXISTS public.safety_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  city text NOT NULL,
  activity_tag text NOT NULL, -- e.g. 'safari', 'nightlife', 'hiking', 'water_activity', 'general'
  note_text text NOT NULL,
  severity text NOT NULL DEFAULT 'info' CHECK (severity = ANY (ARRAY['info'::text, 'caution'::text, 'warning'::text])),
  source text, -- who/what this note is based on, for accountability
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT safety_notes_pkey PRIMARY KEY (id),
  CONSTRAINT safety_notes_city_activity_unique UNIQUE (city, activity_tag)
);

-- Read-only public access — this is reference content, not user data.
ALTER TABLE public.safety_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "safety_notes_public_read"
  ON public.safety_notes
  FOR SELECT
  USING (true);

-- Seed rows — REPLACE with your team's actual vetted content before the demo.
-- These are placeholders to make the feature functionally testable end-to-end.
INSERT INTO public.safety_notes (city, activity_tag, note_text, severity, source) VALUES
  ('Lusaka', 'general', 'Keep valuables out of sight in busy markets like Soweto Market, especially during peak hours.', 'caution', 'placeholder - replace with vetted local guidance'),
  ('Lusaka', 'nightlife', 'Use registered taxis or ride-hailing apps after dark rather than hailing cars on the street.', 'caution', 'placeholder - replace with vetted local guidance'),
  ('Livingstone', 'safari', 'Wildlife encounters near Mosi-oa-Tunya can be unpredictable; always stay with a licensed guide and keep a safe distance from animals.', 'warning', 'placeholder - replace with vetted local guidance'),
  ('Livingstone', 'water_activity', 'River currents near Victoria Falls are strong; only swim or boat in areas explicitly marked safe by licensed operators.', 'warning', 'placeholder - replace with vetted local guidance'),
  ('Livingstone', 'general', 'Carry small notes for local vendors and confirm prices before purchase to avoid overcharging at tourist sites.', 'info', 'placeholder - replace with vetted local guidance')
ON CONFLICT (city, activity_tag) DO NOTHING;
