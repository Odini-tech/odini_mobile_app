import { supabase } from '@/services/supabase/client';
import {
  enrichRecommendationListings,
  fetchImagesForListings,
  getListingsByIds,
} from '@/services/listings.service';
import { getRecommendationModeStatus } from './recommendationGateway';
import { RecommendationService } from './recommendationService';

export interface VenueLocation {
  city: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
}

export interface VenueSummary {
  id: string;
  name: string;
  description: string | null;
  location: VenueLocation | null;
  listingCount?: number;
  previewImageUrl?: string | null;
}

export interface VenueListingsResult {
  venue: VenueSummary | null;
  items: any[];
}

async function fetchVenueListingsBasic(venueId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('listings')
    .select('id')
    .eq('venue_id', venueId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error || !data?.length) return [];
  return getListingsByIds(data.map((row) => row.id));
}

/**
 * Venue header info + the listings hosted at it, ranked for the caller the
 * same way Feed is when the rec engine is live.
 */
export async function fetchVenueListings(venueId: string): Promise<VenueListingsResult> {
  if (!venueId) return { venue: null, items: [] };

  const { mode } = getRecommendationModeStatus();

  const [{ data: venueRow, error: venueError }, items] = await Promise.all([
    supabase
      .from('venues')
      .select('id, name, description, locations:location_id(city, country, lat, lng)')
      .eq('id', venueId)
      .maybeSingle(),
    mode === 'rec_eng'
      ? RecommendationService.getVenueListings(venueId).then((res) =>
          res.items.length ? enrichRecommendationListings(res.items) : []
        )
      : fetchVenueListingsBasic(venueId),
  ]);

  if (venueError || !venueRow) return { venue: null, items: [] };

  return {
    venue: {
      id: venueRow.id,
      name: venueRow.name,
      description: venueRow.description,
      location: (venueRow as any).locations || null,
    },
    items,
  };
}

/**
 * "Venues like this one". In basic mode there's no content-similarity
 * available client-side, so recently-created venues (excluding this one)
 * are surfaced as a reasonable browse fallback.
 */
export async function fetchSimilarVenues(venueId: string, limit = 10): Promise<VenueSummary[]> {
  if (!venueId) return [];
  const { mode } = getRecommendationModeStatus();

  if (mode === 'rec_eng') {
    const venues = await RecommendationService.getSimilarVenues(venueId, limit);
    return venues.map((v) => ({ id: v.id, name: v.name, description: v.description, location: v.location }));
  }

  try {
    const { data, error } = await supabase
      .from('venues')
      .select('id, name, description, locations:location_id(city, country, lat, lng)')
      .neq('id', venueId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data.map((v) => ({
      id: v.id,
      name: v.name,
      description: v.description,
      location: (v as any).locations || null,
    }));
  } catch {
    return [];
  }
}

/**
 * A browsable set of venues (with a preview image pulled from one of their
 * active listings) for the Dash "Venues" carousel.
 */
export async function fetchVenuesForDash(limit = 8): Promise<VenueSummary[]> {
  try {
    const { data: venueRows, error } = await supabase
      .from('venues')
      .select('id, name, description, locations:location_id(city, country, lat, lng)')
      .order('created_at', { ascending: false })
      .limit(limit * 3);

    if (error || !venueRows?.length) return [];

    const venueIds = venueRows.map((v) => v.id);
    const { data: listingRows } = await supabase
      .from('listings')
      .select('id, venue_id, listing_type')
      .in('venue_id', venueIds)
      .eq('is_active', true);

    const listingsByVenue = new Map<string, { id: string; listing_type: string }[]>();
    (listingRows || []).forEach((row) => {
      const list = listingsByVenue.get(row.venue_id) || [];
      list.push({ id: row.id, listing_type: row.listing_type });
      listingsByVenue.set(row.venue_id, list);
    });

    const populatedVenues = venueRows
      .filter((v) => (listingsByVenue.get(v.id)?.length || 0) > 0)
      .slice(0, limit);
    if (!populatedVenues.length) return [];

    const sampleListings = populatedVenues
      .map((v) => listingsByVenue.get(v.id)?.[0])
      .filter(Boolean) as { id: string; listing_type: string }[];
    const imageMap = await fetchImagesForListings(sampleListings);

    return populatedVenues.map((v) => {
      const sample = listingsByVenue.get(v.id)?.[0];
      return {
        id: v.id,
        name: v.name,
        description: v.description,
        location: (v as any).locations || null,
        listingCount: listingsByVenue.get(v.id)?.length || 0,
        previewImageUrl: sample ? imageMap.get(sample.id) || null : null,
      };
    });
  } catch {
    return [];
  }
}

export default {
  fetchVenueListings,
  fetchSimilarVenues,
  fetchVenuesForDash,
};
