// src/services/listingService.ts

import { supabase } from '../../lib/supabase';

/**
 * Core listing type from database
 */
export interface Listing {
  id: string;
  title: string;
  description: string;
  host_id: string;
  price: number;
  location_lat: number;
  location_lng: number;
  address_city: string;
  address_country: string;
  amenities: string[];
  images: string[];
  max_guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  is_available: boolean;
  average_rating: number;
  review_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Rating input for updating user ratings
 */
export interface RatingInput {
  userId: string;
  listingId: string;
  rating: number; // 1-5
  reviewText?: string;
  tripId?: string;
}

/**
 * Trip input for adding a listing to user's trips
 */
export interface TripInput {
  userId: string;
  listingId: string;
  startDate: string; // ISO string
  endDate: string; // ISO string
  guestCount: number;
  tripName?: string;
}

/**
 * Pagination parameters for listing queries
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

/**
 * Proximity parameters for location-based searches
 */
export interface ProximityParams {
  lat: number;
  lng: number;
  radiusKm?: number;
}

/**
 * Main listing service - handles all listing-related operations
 */
export const listingService = {
  /**
   * Fetch listings with pagination and optional proximity filtering
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
    } = {}
  ): Promise<Listing[]> {
    try {
      let query = supabase
        .from('listings')
        .select('*');

      // Apply pagination
      const page = params?.pagination?.page || 1;
      const pageSize = params?.pagination?.pageSize || 20;
      const start = (page - 1) * pageSize;
      query = query.range(start, start + pageSize - 1);

      // Apply proximity filtering if provided
      if (params?.proximity) {
        const { lat, lng, radiusKm = 50 } = params.proximity;
        // Use PostGIS earthdistance extension via Supabase RPC
        const { data, error } = await supabase.rpc('listings_within_radius', {
          center_lat: lat,
          center_lng: lng,
          radius_km: radiusKm,
          page_num: page,
          page_size: pageSize
        });

        if (error) throw error;
        return data || [];
      }

      // Apply category filter 
      if (params?.category) {
        query = query.eq('category', params.category);
      }

      // Apply price range filter
      if (params?.minPrice !== undefined) {
        query = query.gte('price  ', params.minPrice);
      }
      if (params?.maxPrice !== undefined) {
        query = query.lte('price ', params.maxPrice);
      }

      // Apply amenities filter
      if (params?.amenities?.length) {
        query = query.contains('amenities', params.amenities);
      }

      // Execute query
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase Error:', error);
        throw new Error(`Failed to fetch listings: ${error.message}`);
      }

      console.log('Listings fetched:', data?.length || 0);
      return data || [];
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
        .select('*')
        .eq('id', listingId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No listing found
        }
        console.error('Error fetching listing:', error);
        throw new Error(`Failed to fetch listing: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in fetchListingById:', error);
      throw error;
    }
  },

  /**
   * Update user rating for a listing and trigger recommendation updates
   */
  async updateListingRating(input: RatingInput): Promise<{ success: boolean; newAverage?: number }> {
    try {
      // Insert or update the user's rating in the ratings table
      const { error: ratingError } = await supabase
        .from('ratings')
        .upsert({
          user_id: input.userId,
          listing_id: input.listingId,
          rating: input.rating,
          review_text: input.reviewText,
          trip_id: input.tripId,
          created_at: new Date().toISOString(),
        });

      if (ratingError) {
        console.error('Error updating rating:', ratingError);
        throw new Error(`Failed to update rating: ${ratingError.message}`);
      }

      // Recalculate the listing's average rating
      const { data: avgData, error: avgError } = await supabase.rpc('calculate_listing_average', {
        listing_id: input.listingId,
      });

      if (avgError) {
        console.error('Error calculating average:', avgError);
        // Continue anyway, the rating was recorded
      }

      // Trigger recommendation system update for this user
      await this.triggerRecommendationUpdate(input.userId, {
        listingId: input.listingId,
        rating: input.rating,
      });

      return {
        success: true,
        newAverage: avgData?.average_rating,
      };
    } catch (error) {
      console.error('Error in updateListingRating:', error);
      return { success: false };
    }
  },

  /**
   * Add a listing to user's trips (save for later or book)
   */
  async addToTrips(input: TripInput): Promise<{ success: boolean; tripId?: string }> {
    try {
      const { data, error } = await supabase
        .from('trips')
        .insert({
          user_id: input.userId,
          listing_id: input.listingId,
          start_date: input.startDate,
          end_date: input.endDate,
          guest_count: input.guestCount,
          trip_name: input.tripName || 'My Trip',
          status: 'saved', // saved, booked, cancelled, completed
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error adding to trips:', error);
        throw new Error(`Failed to add to trips: ${error.message}`);
      }

      // Trigger recommendation update since user showed strong interest
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
   * This informs the recommendation system about user actions
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
      // Non-blocking call to recommendation system
      await supabase.functions.invoke('recommendations', {
        body: {
          action: 'user_interaction',
          userId,
          timestamp: new Date().toISOString(),
          ...context,
        },
      });
    } catch (error) {
      // Silent fail - this is a background optimization
      console.debug('Failed to trigger recommendation update:', error);
    }
  },

  /**
   * Search listings by text query (for search functionality)
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
        .select('*')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%,address_city.ilike.%${query}%`)
        .eq('is_available', true)
        .range(start, start + pageSize - 1)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error searching listings:', error);
        throw new Error(`Search failed: ${error.message}`);
      }

      return data || [];
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
        .select('*')
        .eq('host_id', hostId)
        .range(start, start + pageSize - 1)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching host listings:', error);
        throw new Error(`Failed to fetch host listings: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getListingsByHost:', error);
      throw error;
    }
  },

  /**
   * Get user's saved/booked listings (from trips table)
   */
  async getUserTrips(userId: string): Promise<Array<{
    tripId: string;
    listing: Listing;
    startDate: string;
    endDate: string;
    status: string;
  }>> {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select(`
          id,
          start_date,
          end_date,
          status,
          listings (*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user trips:', error);
        throw new Error(`Failed to fetch trips: ${error.message}`);
      }

      return (data || []).map(trip => ({
        tripId: trip.id,
        listing: trip.listings as Listing,
        startDate: trip.start_date,
        endDate: trip.end_date,
        status: trip.status,
      }));
    } catch (error) {
      console.error('Error in getUserTrips:', error);
      throw error;
    }
  },
};