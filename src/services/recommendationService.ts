// src/services/recommendationService.ts
//
// Frontend gateway to the standalone recommendation engine (see
// ../../../recommendation-engine repo README for the source of truth on
// routes/response shapes). User identity for personalization comes from the
// Supabase JWT attached by recommendationGateway — none of these calls take
// a userId parameter on the wire.

import { callRecommendationApi, recommendationApiPath, runDualMode } from './recommendationGateway';

export type EngineListingType = 'stay' | 'event' | 'offering';

export interface EngineListingCard {
  id: string;
  title: string;
  listingType: EngineListingType;
  price: number | null;
  coverImageUrl: string | null;
  location: { city: string | null; country: string | null; lat: number | null; lng: number | null } | null;
  tags: string[];
  categories: string[];
  score?: number;
}

export interface EngineMix {
  id: string;
  title: string;
  reason: string;
  items: EngineListingCard[];
}

interface FeedOrExploreResponse {
  source: 'personalized' | 'cold_start';
  items: EngineListingCard[];
  nextCursor: string | null;
}

interface MixesResponse {
  source: 'personalized' | 'cold_start';
  mixes: EngineMix[];
}

interface SimilarResponse {
  source: 'pair_affinity' | 'content_fallback';
  items: EngineListingCard[];
}

/**
 * Minimal shape the rest of the app works with once a listing comes back
 * from the engine — just enough for services/listings.service.js to
 * re-hydrate full Supabase rows in original rec order.
 */
export interface RecommendedListing {
  id: string;
  score?: number;
}

const toRecommended = (items: EngineListingCard[]): RecommendedListing[] =>
  items.map((item) => ({ id: item.id, score: item.score }));

const VALID_INTERACTION_ACTIONS = ['view', 'like', 'save', 'unlike', 'unsave'] as const;
export type EngineInteractionAction = (typeof VALID_INTERACTION_ACTIONS)[number];

export const RecommendationService = {
  /**
   * For You Page feed. `userId` is accepted for call-site compatibility
   * (callers already gate on having a logged-in user) but identity is
   * actually carried by the JWT attached in recommendationGateway.
   */
  async getForYou(userId: string, limit = 20): Promise<RecommendedListing[]> {
    if (!userId) return [];
    try {
      return await runDualMode<RecommendedListing[]>({
        context: 'recommendationService.getForYou',
        fallbackToBasicOnError: false,
        recEng: async () => {
          const path = recommendationApiPath('/api/feed', { limit });
          const envelope = await callRecommendationApi<FeedOrExploreResponse>(path, { method: 'GET' });
          return toRecommended(envelope.data.items || []);
        },
        basic: async () => [],
      });
    } catch {
      return [];
    }
  },

  /**
   * Explore feed. Location is intentionally not sent — the engine only does
   * a plain profile-city match today (see README "known simplifications").
   */
  async getExplore(userId: string, limit = 20): Promise<RecommendedListing[]> {
    try {
      return await runDualMode<RecommendedListing[]>({
        context: 'recommendationService.getExplore',
        fallbackToBasicOnError: false,
        recEng: async () => {
          const path = recommendationApiPath('/api/explore', { limit });
          const envelope = await callRecommendationApi<FeedOrExploreResponse>(path, { method: 'GET' });
          return toRecommended(envelope.data.items || []);
        },
        basic: async () => [],
      });
    } catch {
      return [];
    }
  },

  /**
   * Category mixes for the Dashboard carousels. Works for guests too (the
   * engine falls back to popularity-based mixes when there's no user/history).
   */
  async getMixes(): Promise<EngineMix[]> {
    try {
      return await runDualMode<EngineMix[]>({
        context: 'recommendationService.getMixes',
        fallbackToBasicOnError: false,
        recEng: async () => {
          const envelope = await callRecommendationApi<MixesResponse>('/api/mixes', { method: 'GET' });
          return envelope.data.mixes || [];
        },
        basic: async () => [],
      });
    } catch {
      return [];
    }
  },

  /**
   * Listings similar to a given one (pair-affinity, content fallback).
   * Not user-specific — no auth needed.
   */
  async getSimilar(listingId: string, limit = 10): Promise<RecommendedListing[]> {
    if (!listingId) return [];
    try {
      return await runDualMode<RecommendedListing[]>({
        context: 'recommendationService.getSimilar',
        fallbackToBasicOnError: false,
        recEng: async () => {
          const path = recommendationApiPath(`/api/listings/${encodeURIComponent(listingId)}/similar`, { limit });
          const envelope = await callRecommendationApi<SimilarResponse>(path, { method: 'GET' });
          return toRecommended(envelope.data.items || []);
        },
        basic: async () => [],
      });
    } catch {
      return [];
    }
  },

  /**
   * Record a user interaction with the engine (best-effort — this is a
   * secondary signal/cache-invalidation push; InteractionService owns the
   * canonical Supabase write). Never throws.
   */
  async recordInteraction(
    listingId: string,
    action: EngineInteractionAction,
    score?: -1 | 0 | 1 | 3 | 5 | 7
  ): Promise<void> {
    if (!listingId) return;
    try {
      await callRecommendationApi('/api/interactions', {
        method: 'POST',
        body: JSON.stringify({ listingId, action, score }),
      });
    } catch {
      // best-effort — swallow
    }
  },
};
