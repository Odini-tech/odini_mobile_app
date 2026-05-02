import { supabase } from '../../lib/supabase';
import { callRecommendationApi, recommendationApiPath, runDualMode } from './recommendationGateway';

export interface Listing {
  id: string;
  host_id: string;
  listing_type: 'stay' | 'event' | 'offering';
  title: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  price: number | null;
  events?: Array<{
    event_time: string | null;
    event_type: string | null;
    capacity: number | null;
    available_slots: number | null;
    location: string | null;
    end_time: string | null;
  }> | null;
  stays?: Array<{
    durations_nights: number | null;
    max_guests: number | null;
    available_rooms: number | null;
  }> | null;
  offering?: Array<{
    service_type: string | null;
    location: string | null;
    opening_hours: string | null;
    duration_minutes: number | null;
    max_bookings: number | null;
  }> | null;
}

export interface RatingInput {
  userId: string;
  listingId: string;
  rating: number;
  reviewText?: string;
  tripId?: string;
}

export interface TripInput {
  userId: string;
  listingId: string;
  startDate: string;
  endDate: string;
  guestCount: number;
  tripName?: string;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface ProximityParams {
  lat: number;
  lng: number;
  radiusKm?: number;
}

const mapRatingToInteractionScore = (rating: number): number => {
  const value = Math.max(1, Math.min(5, Math.round(rating)));
  const lookup: Record<number, number> = {
    1: -1,
    2: 0,
    3: 3,
    4: 5,
    5: 7,
  };
  return lookup[value];
};

const listingSelect = `
  id,
  host_id,
  listing_type,
  title,
  description,
  is_active,
  created_at,
  price,
  events(event_time, event_type, capacity, available_slots, location, end_time),
  stays(durations_nights, max_guests, available_rooms),
  offering(service_type, location, opening_hours, duration_minutes, max_bookings)
`;

type RecommendationApiListing = Partial<Listing> & { hostId?: string };

const normalizeApiListing = (row: RecommendationApiListing): Listing => ({
  id: String(row.id || ''),
  host_id: String(row.host_id || row.hostId || ''),
  listing_type: (row.listing_type as Listing['listing_type']) || 'stay',
  title: row.title || 'Untitled listing',
  description: row.description || null,
  is_active: row.is_active ?? true,
  created_at: row.created_at || new Date().toISOString(),
  price: typeof row.price === 'number' ? row.price : Number(row.price || 0),
  events: row.events || null,
  stays: row.stays || null,
  offering: row.offering || null,
});

/**
 * Main listing service - handles all listing-related operations
 */
export const listingService = {
  /**
   * Fetch listings with pagination and optional filtering
   */
  async fetchListings(
    params?: {
      pagination?: PaginationParams;
      proximity?: ProximityParams;
      category?: string;
      minPrice?: number;
      maxPrice?: number;
      amenities?: string[];
      availability?: { start: string; end: string };
    }
  ): Promise<Listing[]> {
    const runBasic = async (): Promise<Listing[]> => {
      const page = params?.pagination?.page || 1;
      const pageSize = params?.pagination?.pageSize || 20;
      const start = (page - 1) * pageSize;

      let categoryListingIds: string[] | null = null;
      if (params?.category) {
        const { data: categoryRows } = await supabase
          .from('categories')
          .select('id')
          .or(`id.eq.${params.category},name.ilike.${params.category}`);

        const categoryIds = (categoryRows || []).map(row => row.id);
        if (categoryIds.length === 0) {
          return [];
        }

        const { data: links, error: linkError } = await supabase
          .from('category_listings')
          .select('listing_id')
          .in('category_id', categoryIds);

        if (linkError) {
          throw new Error(`Failed to filter by category: ${linkError.message}`);
        }

        categoryListingIds = (links || []).map(link => link.listing_id);
        if (categoryListingIds.length === 0) {
          return [];
        }
      }

      let query = supabase
        .from('listings')
        .select(listingSelect)
        .eq('is_active', true);

      if (params?.minPrice !== undefined) {
        query = query.gte('price', params.minPrice);
      }

      if (params?.maxPrice !== undefined) {
        query = query.lte('price', params.maxPrice);
      }

      if (categoryListingIds) {
        query = query.in('id', categoryListingIds);
      }

      if (params?.proximity || (params?.amenities && params.amenities.length > 0)) {
        console.debug('Ignoring proximity/amenities filters: columns were removed from listings schema.');
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(start, start + pageSize - 1);

      if (error) {
        throw new Error(`Failed to fetch listings: ${error.message}`);
      }

      return (data || []) as Listing[];
    };

    try {
      return await runDualMode<Listing[]>({
        context: 'listingService.fetchListings',
        recEng: async () => {
          const page = params?.pagination?.page || 1;
          const pageSize = params?.pagination?.pageSize || 20;
          const path = recommendationApiPath('/v1/listings', {
            page,
            limit: pageSize,
            type: params?.category || undefined,
          });
          const envelope = await callRecommendationApi<RecommendationApiListing[]>(path, { method: 'GET' });
          let rows = (envelope.data || []).map(normalizeApiListing).filter(row => row.is_active);

          if (params?.minPrice !== undefined) {
            rows = rows.filter(row => Number(row.price || 0) >= params.minPrice!);
          }
          if (params?.maxPrice !== undefined) {
            rows = rows.filter(row => Number(row.price || 0) <= params.maxPrice!);
          }

          return rows;
        },
        basic: runBasic,
      });
    } catch (error) {
      console.error('Error in fetchListings:', error);
      throw error;
    }
  },

  /**
   * Fetch a single listing by ID with complete details
   */
  async fetchListingById(listingId: string): Promise<Listing | null> {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select(listingSelect)
        .eq('id', listingId)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to fetch listing: ${error.message}`);
      }

      return (data as Listing | null) || null;
    } catch (error) {
      console.error('Error in fetchListingById:', error);
      throw error;
    }
  },

  /**
   * Record user rating as an interaction score and trigger recommendation updates
   */
  async updateListingRating(input: RatingInput): Promise<{ success: boolean; newAverage?: number }> {
    try {
      const score = mapRatingToInteractionScore(input.rating);

      const { error: interactionError } = await supabase
        .from('interactions')
        .insert({
          user_id: input.userId,
          listing_id: input.listingId,
          score,
          last_action: input.reviewText ? `rating:${input.rating}:${input.reviewText}` : `rating:${input.rating}`,
        });

      if (interactionError) {
        throw new Error(`Failed to record rating interaction: ${interactionError.message}`);
      }

      await this.triggerRecommendationUpdate(input.userId, {
        listingId: input.listingId,
        rating: input.rating,
        action: 'rate',
      });

      return { success: true };
    } catch (error) {
      console.error('Error in updateListingRating:', error);
      return { success: false };
    }
  },

  /**
   * Create a pending booking as a saved trip intent
   */
  async addToTrips(input: TripInput): Promise<{ success: boolean; tripId?: string }> {
    try {
      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .select('id, host_id, listing_type, price')
        .eq('id', input.listingId)
        .single();

      if (listingError || !listing) {
        throw new Error(`Listing not found: ${listingError?.message || 'Unknown error'}`);
      }

      const bookingPayload: Record<string, unknown> = {
        booking_ref: `TRIP-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        host_id: listing.host_id,
        user_id: input.userId,
        listing_id: input.listingId,
        listing_type: listing.listing_type,
        guests: Math.max(1, input.guestCount || 1),
        price_at_booking: listing.price || 0,
        total_price: listing.price || 0,
        status: 'pending',
        notes: input.tripName ? `Trip: ${input.tripName}` : 'Trip intent',
      };

      if (listing.listing_type === 'stay') {
        bookingPayload.check_in = input.startDate;
        bookingPayload.check_out = input.endDate;
      } else {
        bookingPayload.reservation_time = input.startDate;
        bookingPayload.quantity = Math.max(1, input.guestCount || 1);
      }

      const { data, error } = await supabase
        .from('bookings')
        .insert(bookingPayload)
        .select('id')
        .single();

      if (error) {
        throw new Error(`Failed to create trip booking: ${error.message}`);
      }

      await this.triggerRecommendationUpdate(input.userId, {
        listingId: input.listingId,
        action: 'add_to_trip',
      });

      return {
        success: true,
        tripId: data.id,
      };
    } catch (error) {
      console.error('Error in addToTrips:', error);
      return { success: false };
    }
  },

  /**
   * Trigger recommendation score update via Edge Function
   */
  async triggerRecommendationUpdate(
    userId: string,
    context?: {
      listingId?: string;
      rating?: number;
      action?: 'view' | 'save' | 'rate' | 'add_to_trip' | 'book';
    }
  ): Promise<void> {
    try {
      await runDualMode({
        context: 'listingService.triggerRecommendationUpdate',
        recEng: async () => {
          await callRecommendationApi('/v1/listings/interactions', {
            method: 'POST',
            body: JSON.stringify({
              userId,
              listingId: context?.listingId,
              interactionType: context?.action || 'view',
              rating: context?.rating,
              metadata: context || {},
              timestamp: new Date().toISOString(),
            }),
          });
        },
        basic: async () => {
          await supabase.functions.invoke('recommendations', {
            body: {
              action: 'user_interaction',
              userId,
              timestamp: new Date().toISOString(),
              ...context,
            },
          });
        },
      });
    } catch (error) {
      console.debug('Failed to trigger recommendation update:', error);
    }
  },

  /**
   * Search listings by text query
   */
  async searchListings(
    query: string,
    params?: PaginationParams
  ): Promise<Listing[]> {
    try {
      const page = params?.page || 1;
      const pageSize = params?.pageSize || 20;
      const start = (page - 1) * pageSize;

      const { data, error } = await supabase
        .from('listings')
        .select(listingSelect)
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .eq('is_active', true)
        .range(start, start + pageSize - 1)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Search failed: ${error.message}`);
      }

      return (data || []) as Listing[];
    } catch (error) {
      console.error('Error in searchListings:', error);
      throw error;
    }
  },

  /**
   * Get listings by host ID
   */
  async getListingsByHost(hostId: string, pagination?: PaginationParams): Promise<Listing[]> {
    try {
      const page = pagination?.page || 1;
      const pageSize = pagination?.pageSize || 20;
      const start = (page - 1) * pageSize;

      const { data, error } = await supabase
        .from('listings')
        .select(listingSelect)
        .eq('host_id', hostId)
        .range(start, start + pageSize - 1)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch host listings: ${error.message}`);
      }

      return (data || []) as Listing[];
    } catch (error) {
      console.error('Error in getListingsByHost:', error);
      throw error;
    }
  },

  /**
   * Get user's trip intents from bookings table
   */
  async getUserTrips(userId: string): Promise<Array<{
    tripId: string;
    listing: Listing;
    startDate: string | null;
    endDate: string | null;
    status: string;
  }>> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          check_in,
          check_out,
          status,
          listing:listings(${listingSelect})
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch trips: ${error.message}`);
      }

      return (data || [])
        .filter(row => row.listing)
        .map((row: any) => ({
          tripId: row.id,
          listing: row.listing as Listing,
          startDate: row.check_in,
          endDate: row.check_out,
          status: row.status,
        }));
    } catch (error) {
      console.error('Error in getUserTrips:', error);
      throw error;
    }
  },
};
