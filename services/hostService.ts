import { supabase } from '@/services/supabase/client';
import { Listing, listingService } from './listingService';

export interface HostProfile {
  id: string;
  role: string | null;
  created_at: string;
  username: string | null;
  firstname: string | null;
  middlename: string | null;
  lastname: string | null;
  location: string | null;
  phone_number: string | null;
}

export interface HostBooking {
  id: string;
  booking_ref: string;
  host_id: string;
  user_id: string;
  listing_id: string;
  listing_type: 'stay' | 'event' | 'offering';
  guest_firstname: string | null;
  guest_lastname: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  price_at_booking: number | null;
  total_price: number | null;
  notes: string | null;
  check_in: string | null;
  check_out: string | null;
  event_slot: string | null;
  quantity: number | null;
  reservation_time: string | null;
  cancelled_by: string | null;
  cancellation_note: string | null;
  cancelled_at: string | null;
  guests: number;
  booking_date: string;
  status: string;
  created_at: string;
  updated_at: string;
  listing_title?: string | null;
  location_label?: string | null;
}

export interface HostListing extends Listing {
  preview_image_url: string | null;
  location_label: string | null;
  location_city: string | null;
  location_country: string | null;
  location_lat: number | null;
  location_lng: number | null;
  booking_count: number;
  latest_booking_at: string | null;
}

export interface HostLocationSummary {
  label: string;
  city: string | null;
  country: string | null;
  listing_count: number;
  active_listing_count: number;
  booking_count: number;
}

export interface HostDashboardData {
  profile: HostProfile | null;
  listings: HostListing[];
  bookings: HostBooking[];
  locationSummaries: HostLocationSummary[];
}

type VenueLocation = {
  city: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
};

const IMAGE_TABLES: Record<Listing['listing_type'], string> = {
  stay: 'stay_images',
  event: 'event_images',
  offering: 'offering_images',
};

function formatLocationLabel(
  venueLocation: VenueLocation | null | undefined,
  listingLocation: string | null | undefined
): string {
  const parts = [venueLocation?.city, venueLocation?.country]
    .filter(Boolean)
    .map((part) => String(part).trim());

  if (parts.length > 0) {
    return parts.join(', ');
  }

  if (listingLocation) {
    return listingLocation;
  }

  return 'Location pending';
}

async function fetchPreviewImages(listings: Listing[]): Promise<Map<string, string | null>> {
  const imageMap = new Map<string, string | null>();
  const groupedIds: Partial<Record<Listing['listing_type'], string[]>> = {};

  listings.forEach((listing) => {
    if (!groupedIds[listing.listing_type]) {
      groupedIds[listing.listing_type] = [];
    }

    groupedIds[listing.listing_type]!.push(listing.id);
  });

  const queries = Object.entries(groupedIds)
    .filter(([, ids]) => Array.isArray(ids) && ids.length > 0)
    .map(async ([listingType, ids]) => {
      const table = IMAGE_TABLES[listingType as Listing['listing_type']];
      const { data } = await supabase
        .from(table)
        .select('listing_id, image_url, created_at')
        .in('listing_id', ids as string[])
        .order('created_at', { ascending: true });

      (data || []).forEach((row) => {
        if (!imageMap.has(row.listing_id)) {
          imageMap.set(row.listing_id, row.image_url || null);
        }
      });
    });

  await Promise.all(queries);
  return imageMap;
}

function buildBookingAggregates(bookings: HostBooking[]): {
  bookingCountByListing: Record<string, number>;
  latestBookingAtByListing: Record<string, string>;
} {
  return bookings.reduce(
    (acc, booking) => {
      acc.bookingCountByListing[booking.listing_id] =
        (acc.bookingCountByListing[booking.listing_id] || 0) + 1;

      const currentLatest = acc.latestBookingAtByListing[booking.listing_id];
      if (!currentLatest || new Date(booking.created_at).getTime() > new Date(currentLatest).getTime()) {
        acc.latestBookingAtByListing[booking.listing_id] = booking.created_at;
      }

      return acc;
    },
    {
      bookingCountByListing: {} as Record<string, number>,
      latestBookingAtByListing: {} as Record<string, string>,
    }
  );
}

function buildLocationSummaries(params: {
  listings: HostListing[];
  bookingCountByListing: Record<string, number>;
}): HostLocationSummary[] {
  const locationMap = new Map<string, HostLocationSummary>();

  params.listings.forEach((listing) => {
    const label = listing.location_label || 'Location pending';
    const current = locationMap.get(label) || {
      label,
      city: listing.location_city,
      country: listing.location_country,
      listing_count: 0,
      active_listing_count: 0,
      booking_count: 0,
    };

    current.listing_count += 1;
    if (listing.is_active) {
      current.active_listing_count += 1;
    }
    current.booking_count += params.bookingCountByListing[listing.id] || 0;
    current.city = current.city || listing.location_city;
    current.country = current.country || listing.location_country;

    locationMap.set(label, current);
  });

  return Array.from(locationMap.values()).sort((a, b) => {
    if (b.booking_count !== a.booking_count) return b.booking_count - a.booking_count;
    if (b.active_listing_count !== a.active_listing_count) {
      return b.active_listing_count - a.active_listing_count;
    }
    return b.listing_count - a.listing_count;
  });
}

export async function fetchHostDashboard(hostId: string): Promise<HostDashboardData> {
  if (!hostId) {
    throw new Error('hostId is required');
  }

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, created_at, username, firstname, middlename, lastname, location, phone_number')
    .eq('id', hostId)
    .maybeSingle();

  if (profileError) {
    throw new Error(`Failed to fetch host profile: ${profileError.message}`);
  }

  const profile = (profileData as HostProfile | null) || null;
  const listings = await listingService.getListingsByHost(hostId, { page: 1, pageSize: 200 });

  const [bookingsResult, previewImages] = await Promise.all([
    supabase
      .from('bookings')
      .select(
        'id, booking_ref, host_id, user_id, listing_id, listing_type, guest_firstname, guest_lastname, guest_email, guest_phone, price_at_booking, total_price, notes, check_in, check_out, event_slot, quantity, reservation_time, cancelled_by, cancellation_note, cancelled_at, guests, booking_date, status, created_at, updated_at'
      )
      .eq('host_id', hostId)
      .order('created_at', { ascending: false }),
    fetchPreviewImages(listings),
  ]);

  if (bookingsResult.error) {
    throw new Error(`Failed to fetch host bookings: ${bookingsResult.error.message}`);
  }

  const bookings = (bookingsResult.data || []) as HostBooking[];
  const { bookingCountByListing, latestBookingAtByListing } = buildBookingAggregates(bookings);
  const listingById = new Map(listings.map((listing) => [listing.id, listing]));

  const enrichedListings: HostListing[] = listings.map((listing) => {
    const venueLocation = listing.venues?.locations || null;
    const label = formatLocationLabel(venueLocation, listing.location);

    return {
      ...listing,
      preview_image_url: previewImages.get(listing.id) || null,
      location_label: label,
      location_city: venueLocation?.city || null,
      location_country: venueLocation?.country || null,
      location_lat: venueLocation?.lat ?? null,
      location_lng: venueLocation?.lng ?? null,
      booking_count: bookingCountByListing[listing.id] || 0,
      latest_booking_at: latestBookingAtByListing[listing.id] || null,
    };
  });

  const bookingsWithListingInfo: HostBooking[] = bookings.map((booking) => {
    const listing = listingById.get(booking.listing_id);

    return {
      ...booking,
      listing_title: listing?.title || null,
      location_label: formatLocationLabel(listing?.venues?.locations || null, listing?.location),
    };
  });

  const locationSummaries = buildLocationSummaries({
    listings: enrichedListings,
    bookingCountByListing,
  });

  return {
    profile,
    listings: enrichedListings,
    bookings: bookingsWithListingInfo,
    locationSummaries,
  };
}

export default {
  fetchHostDashboard,
};
