// src/services/recommendationService.ts

import { supabase } from '../../lib/supabase';

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
    try {
      // Call Supabase Edge Function with standardized payload
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

      if (error) {
        throw new Error(`Recommendation Edge Function error: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data returned from recommendation service');
      }

      // Validate response structure
      if (!Array.isArray(data.listings)) {
        throw new Error('Invalid response format: listings must be an array');
      }

      return data;
    } catch (error) {
      console.error(`Error in _callRecommendationFunction for context ${request.context}:`, error);
      throw error;
    }
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
    try {
      // Non-blocking call - we don't want to break UX if analytics fails
      supabase.functions.invoke('recommendations', {
        body: {
          action: 'record_interaction',
          userId,
          listingId,
          interactionType,
          context,
          metadata,
          timestamp: new Date().toISOString(),
        },
      }).catch(error => {
        console.error('Failed to record interaction:', error);
      });
    } catch (error) {
      // Swallow errors for analytics calls
      console.error('Error in recordInteraction:', error);
    }
  },
};
