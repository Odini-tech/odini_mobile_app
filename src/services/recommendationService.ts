// src/services/recommendationService.ts

import { supabase } from '../../lib/supabase';
import { callRecommendationApi, recommendationApiPath, runDualMode } from './recommendationGateway';

/**
 * Recommendation context types
 */
export type RecommendationContext = 
  | 'fyp'           // For You Page
  | 'explore'       // Explore feed
  | 'after_booking' // Suggestions after booking
  | 'trip';         // Trip-specific suggestions

/**
 * Recommendation request payload
 */
interface RecommendationRequest {
  context: RecommendationContext;
  userId: string;
  params?: {
    location?: {
      lat: number;
      lng: number;
    };
    seedListingId?: string;
    tripId?: string;
    limit?: number;
    page?: number;
    excludeSeen?: boolean;
  };
}

/**
 * Listing card returned by recommendations Edge Function
 */
export interface ListingCard {
  id: string;
  title: string;
  description: string;
  imageUrls: string[];
  pricePerNight: number;
  averageRating: number;
  reviewCount: number;
  location: {
    city: string;
    country: string;
    lat?: number;
    lng?: number;
  };
  amenities: string[];
  isAvailable: boolean;
  hostId: string;
  score?: number; // Confidence score from recommendation algorithm
  explanation?: string; // Human-readable reason for recommendation
  metadata?: Record<string, any>;
}

/**
 * Recommendation response from Edge Function
 */
interface RecommendationResponse {
  listings: ListingCard[];
  metadata: {
    context: RecommendationContext;
    generatedAt: string;
    totalCount: number;
    page: number;
    hasMore: boolean;
  };
}

type RecommendationApiListing = {
  id: string;
  title?: string;
  description?: string;
  price?: number;
  listing_type?: string;
  is_active?: boolean;
  created_at?: string;
  host_id?: string;
  hostId?: string;
  score?: number;
  reason?: string;      // API returns 'reason'
  explanation?: string; // normalised alias
  metadata?: Record<string, any>;
};

/**
 * Acts as the ONLY frontend gateway to the recommendation system.
 * Calls the Supabase Edge Function "recommendations" for all recommendation logic.
 * Contains NO scoring or ranking logic - only data fetching and forwarding.
 */
export const RecommendationService = {
  /**
   * Get For You Page recommendations
   */
  async getForYou(userId: string): Promise<ListingCard[]> {
    try {
      const response = await RecommendationService._callRecommendationFunction({
        context: 'fyp',
        userId,
      });
      return response.listings;
    } catch (error) {
      console.error('Error in getForYou:', error);
      return [];
    }
  },

  /**
   * Get Explore feed recommendations
   */
  async getExplore(
    userId: string, 
    location?: { lat: number; lng: number }
  ): Promise<ListingCard[]> {
    try {
      const response = await RecommendationService._callRecommendationFunction({
        context: 'explore',
        userId,
        params: location ? { location } : undefined,
      });
      return response.listings;
    } catch (error) {
      console.error('Error in getExplore:', error);
      return [];
    }
  },

  /**
   * Get recommendations after booking (similar listings)
   */
  async getAfterBooking(
    userId: string, 
    seedListingId: string
  ): Promise<ListingCard[]> {
    try {
      const response = await RecommendationService._callRecommendationFunction({
        context: 'after_booking',
        userId,
        params: { seedListingId },
      });
      return response.listings;
    } catch (error) {
      console.error('Error in getAfterBooking:', error);
      return [];
    }
  },

  /**
   * Get trip-specific suggestions
   */
  async getTripSuggestions(
    userId: string, 
    tripId: string
  ): Promise<ListingCard[]> {
    try {
      const response = await RecommendationService._callRecommendationFunction({
        context: 'trip',
        userId,
        params: { tripId },
      });
      return response.listings;
    } catch (error) {
      console.error('Error in getTripSuggestions:', error);
      return [];
    }
  },

  /**
   * Private method to call the recommendations Edge Function
   * Centralizes all Edge Function calls for consistency and error handling
   */
  async _callRecommendationFunction(
    request: RecommendationRequest
  ): Promise<RecommendationResponse> {
    const emptyResponse = (): RecommendationResponse => ({
      listings: [],
      metadata: {
        context: request.context,
        generatedAt: new Date().toISOString(),
        totalCount: 0,
        page: request.params?.page ?? 1,
        hasMore: false,
      },
    });

    try {
      return await runDualMode<RecommendationResponse>({
        context: `recommendationService._callRecommendationFunction:${request.context}`,
        // Don't auto-switch mode on failure — keep configured mode so toggle stays meaningful
        fallbackToBasicOnError: false,
        recEng: async () => {
          const path = recommendationApiPath('/v1/listings/recommendations', {
            userId: request.userId,
            context: request.context,
            seedListingId: request.params?.seedListingId,
            tripId: request.params?.tripId,
            page: request.params?.page,
            limit: request.params?.limit,
            excludeSeen: request.params?.excludeSeen,
            lat: request.params?.location?.lat,
            lng: request.params?.location?.lng,
          });
          const envelope = await callRecommendationApi<RecommendationApiListing[]>(path, { method: 'GET' });
          return this._normalizeApiRecommendationResponse(request.context, envelope.data || [], request.params);
        },
        basic: () => this._callSupabaseRecommendationFunction(request),
      });
    } catch {
      // Both paths unavailable — return empty so UI falls back to getListings()
      return emptyResponse();
    }
  },

  async _callSupabaseRecommendationFunction(request: RecommendationRequest): Promise<RecommendationResponse> {
    const emptyResponse = (): RecommendationResponse => ({
      listings: [],
      metadata: {
        context: request.context,
        generatedAt: new Date().toISOString(),
        totalCount: 0,
        page: request.params?.page ?? 1,
        hasMore: false,
      },
    });

    const { data, error } = await supabase.functions.invoke<RecommendationResponse>(
      'recommendations',
      {
        body: {
          context: request.context,
          userId: request.userId,
          ...(request.params && { params: request.params }),
        },
      }
    );

    // Edge Function not deployed or unavailable — degrade silently so UI falls back to getListings()
    if (error || !data || !Array.isArray(data.listings)) {
      return emptyResponse();
    }

    return data;
  },

  _normalizeApiRecommendationResponse(
    context: RecommendationContext,
    listings: RecommendationApiListing[],
    params?: RecommendationRequest['params']
  ): RecommendationResponse {
    const normalizedListings: ListingCard[] = listings.map(item => ({
      id: item.id,
      title: item.title || 'Untitled listing',
      description: item.description || '',
      imageUrls: [],
      pricePerNight: Number(item.price || 0),
      averageRating: 0,
      reviewCount: 0,
      location: {
        city: '',
        country: '',
      },
      amenities: [],
      isAvailable: item.is_active !== false,
      hostId: item.hostId || item.host_id || '',
      score: item.score,
      // API returns 'reason'; also accept 'explanation' for forward compat
      explanation: item.reason || item.explanation,
      metadata: {
        ...(item.metadata || {}),
        listing_type: item.listing_type,
        created_at: item.created_at,
      },
    }));

    const page = params?.page || 1;
    const limit = params?.limit || normalizedListings.length;

    return {
      listings: normalizedListings,
      metadata: {
        context,
        generatedAt: new Date().toISOString(),
        totalCount: normalizedListings.length,
        page,
        hasMore: normalizedListings.length >= limit,
      },
    };
  },

  /**
   * Record user interaction with a recommended listing
   * Used for feedback loop to improve future recommendations
   */
  async recordInteraction(
    userId: string,
    listingId: string,
    interactionType: 'view' | 'click' | 'save' | 'book' | 'dismiss',
    context: RecommendationContext,
    metadata?: Record<string, any>
  ): Promise<void> {
    // Pure analytics — never switch mode, never throw
    runDualMode({
      context: 'recommendationService.recordInteraction',
      fallbackToBasicOnError: false,
      recEng: async () => {
        await callRecommendationApi('/v1/listings/interactions', {
          method: 'POST',
          body: JSON.stringify({
            userId,
            listingId,
            interactionType,
            context,
            metadata,
            timestamp: new Date().toISOString(),
          }),
        });
      },
      basic: async () => {
        await supabase.from('interactions').insert({
          user_id: userId,
          listing_id: listingId,
          score: interactionType === 'book' ? 7 : interactionType === 'save' ? 5 : 3,
          last_action: JSON.stringify({ action: interactionType, context, metadata }),
        });
      },
    }).catch(() => undefined);
  },
};
