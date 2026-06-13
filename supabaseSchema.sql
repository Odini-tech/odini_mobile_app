-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  role text,
  created_at timestamp with time zone DEFAULT now(),
  username text,
  firstname text,
  middlename text,
  lastname text,
  location text,
  gender USER-DEFINED,
  phone_number text,
  DOB date,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.listings (
  price integer CHECK (price > 0),
  host_id uuid NOT NULL,
  listing_type text NOT NULL CHECK (listing_type = ANY (ARRAY['stay'::text, 'event'::text, 'offering'::text])),
  title text NOT NULL,
  description text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  is_active boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  location character varying,
  CONSTRAINT listings_pkey PRIMARY KEY (id),
  CONSTRAINT listings_host_id_fkey FOREIGN KEY (host_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.stays (
  listing_id uuid NOT NULL,
  durations_nights integer,
  max_guests integer,
  available_rooms integer,
  CONSTRAINT stays_pkey PRIMARY KEY (listing_id),
  CONSTRAINT stays_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id)
);
CREATE TABLE public.events (
  available_slots integer,
  end_time timestamp with time zone,
  listing_id uuid NOT NULL,
  event_time timestamp with time zone,
  event_type text CHECK (event_type IS NULL OR (event_type = ANY (ARRAY['conference'::text, 'festival'::text, 'sports'::text, 'concert'::text, 'workshop'::text, 'networking'::text, 'other'::text, 'Tech'::text, 'Music'::text]))),
  capacity integer,
  CONSTRAINT events_pkey PRIMARY KEY (listing_id),
  CONSTRAINT events_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id)
);
CREATE TABLE public.stay_images (
  listing_id uuid,
  image_url text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT stay_images_pkey PRIMARY KEY (id),
  CONSTRAINT stay_images_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.stays(listing_id)
);
CREATE TABLE public.event_images (
  listing_id uuid,
  image_url text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT event_images_pkey PRIMARY KEY (id),
  CONSTRAINT event_images_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.events(listing_id)
);
CREATE TABLE public.interactions (
  user_id uuid NOT NULL,
  listing_id uuid NOT NULL,
  last_action text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  score integer NOT NULL DEFAULT 0 CHECK (score = ANY (ARRAY['-1'::integer, 0, 1, 3, 5, 7])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT interactions_pkey PRIMARY KEY (id),
  CONSTRAINT interactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT interactions_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id)
);
CREATE TABLE public.test_bookings (
  listing_id uuid NOT NULL,
  user_id uuid NOT NULL,
  guests integer NOT NULL CHECK (guests > 0),
  check_in date NOT NULL,
  check_out date NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  status USER-DEFINED NOT NULL DEFAULT 'pending'::booking_status,
  CONSTRAINT test_bookings_pkey PRIMARY KEY (id),
  CONSTRAINT test_bookings_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id),
  CONSTRAINT test_bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.categories (
  name text NOT NULL UNIQUE,
  description text,
  image_url text,
  parent_id uuid,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT categories_pkey PRIMARY KEY (id),
  CONSTRAINT categories_parent_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id)
);
CREATE TABLE public.category_listings (
  listing_id uuid NOT NULL,
  category_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT category_listings_pkey PRIMARY KEY (listing_id, category_id),
  CONSTRAINT category_listings_listing_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id),
  CONSTRAINT category_listings_category_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id)
);
CREATE TABLE public.tags (
  name text NOT NULL UNIQUE,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tags_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tag_listings (
  listing_id uuid NOT NULL,
  tag_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tag_listings_pkey PRIMARY KEY (listing_id, tag_id),
  CONSTRAINT tag_listings_listing_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id),
  CONSTRAINT tag_listings_tag_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id)
);
CREATE TABLE public.offering (
  listing_id uuid NOT NULL,
  service_type USER-DEFINED,
  opening_hours text,
  duration_minutes integer CHECK (duration_minutes IS NULL OR duration_minutes > 0),
  max_bookings integer CHECK (max_bookings IS NULL OR max_bookings > 0),
  closing time smallint,
  CONSTRAINT offering_pkey PRIMARY KEY (listing_id),
  CONSTRAINT offering_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id)
);
CREATE TABLE public.bookings (
  booking_ref text NOT NULL UNIQUE,
  host_id uuid NOT NULL,
  user_id uuid NOT NULL,
  listing_id uuid NOT NULL,
  listing_type text NOT NULL CHECK (listing_type = ANY (ARRAY['stay'::text, 'event'::text, 'offering'::text])),
  guest_firstname text,
  guest_lastname text,
  guest_email text,
  guest_phone text,
  price_at_booking numeric NOT NULL,
  total_price numeric,
  notes text,
  check_in date,
  check_out date,
  event_slot timestamp with time zone,
  quantity integer CHECK (quantity IS NULL OR quantity > 0),
  reservation_time timestamp with time zone,
  cancelled_by text CHECK (cancelled_by IS NULL OR (cancelled_by = ANY (ARRAY['user'::text, 'host'::text, 'system'::text]))),
  cancellation_note text,
  cancelled_at timestamp with time zone,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  guests integer NOT NULL DEFAULT 1 CHECK (guests > 0),
  booking_date date NOT NULL DEFAULT CURRENT_DATE,
  nights integer DEFAULT 
CASE
    WHEN ((check_in IS NOT NULL) AND (check_out IS NOT NULL)) THEN (check_out - check_in)
    ELSE NULL::integer
END,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'completed'::text, 'cancelled_by_user'::text, 'cancelled_by_host'::text, 'rejected'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT bookings_pkey PRIMARY KEY (id),
  CONSTRAINT bookings_listing_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id),
  CONSTRAINT bookings_listing_type_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id),
  CONSTRAINT bookings_listing_type_fkey FOREIGN KEY (listing_type) REFERENCES public.listings(listing_type),
  CONSTRAINT bookings_host_fkey FOREIGN KEY (host_id) REFERENCES public.profiles(id),
  CONSTRAINT bookings_user_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.offering_images (
  listing_id uuid,
  image_url text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT offering_images_pkey PRIMARY KEY (id),
  CONSTRAINT offering_images_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.offering(listing_id)
);
CREATE TABLE public.locations (
  listing_id uuid NOT NULL,
  lat numeric,
  lng numeric,
  place_id text,
  formatted_address text,
  city text,
  country text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT locations_pkey PRIMARY KEY (listing_id),
  CONSTRAINT locations_listing_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id)
);