import { supabase } from '@/services/supabase/client';
import { Category, SearchListing, Tag } from './searchService';
import { callRecommendationApi, recommendationApiPath, runDualMode } from './recommendationGateway';

/**
 * Popular listing with interaction score
 */
export interface PopularListing extends SearchListing {
  interaction_score?: number;
  booking_count?: number;
  trending_rank?: number;
}

/**
 * Popular today results
 */
export interface PopularTodayResults {
  listings: PopularListing[];
  categories: Category[];
  tags: Tag[];
  total_count: number;
  period: string;
}

type ListingRow = Omit<SearchListing, 'categories' | 'tags'>;
type RecommendationPopularRow = Partial<ListingRow> & { id: string; interaction_score?: number; booking_count?: number };

type CategoryJoinRow = { listing_id: string; category: Category | Category[] | null };
type TagJoinRow = { listing_id: string; tag: Tag | Tag[] | null };

const uniqueById = <T extends { id: string }>(items: T[]): T[] => {
  const seen = new Set<string>();
  return items.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

const toArrayValue = <T>(value: T | T[] | null): T[] => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

async function fetchListingsWithTaxonomy(listingIds: string[]): Promise<PopularListing[]> {
  if (listingIds.length === 0) return [];

  const { data: listings, error: listingsError } = await supabase
    .from('listings')
    .select('id, host_id, listing_type, title, description, is_active, price, created_at')
    .in('id', listingIds)
    .eq('is_active', true);

  if (listingsError) {
    throw new Error(`Failed to fetch listings: ${listingsError.message}`);
  }

  const [{ data: categoryRows }, { data: tagRows }] = await Promise.all([
    supabase
      .from('category_listings')
      .select('listing_id, category:categories(id, name, description, image_url, parent_id, created_at)')
      .in('listing_id', listingIds),
    supabase
      .from('tag_listings')
      .select('listing_id, tag:tags(id, name, created_at)')
      .in('listing_id', listingIds),
  ]);

  const listingCategoriesMap: Record<string, Category[]> = {};
  ((categoryRows || []) as CategoryJoinRow[]).forEach(row => {
    const categories = toArrayValue(row.category);
    if (categories.length === 0) return;
    if (!listingCategoriesMap[row.listing_id]) listingCategoriesMap[row.listing_id] = [];
    listingCategoriesMap[row.listing_id].push(...categories);
  });

  const listingTagsMap: Record<string, Tag[]> = {};
  ((tagRows || []) as TagJoinRow[]).forEach(row => {
    const tags = toArrayValue(row.tag);
    if (tags.length === 0) return;
    if (!listingTagsMap[row.listing_id]) listingTagsMap[row.listing_id] = [];
    listingTagsMap[row.listing_id].push(...tags);
  });

  const orderMap = new Map(listingIds.map((id, index) => [id, index]));

  return ((listings || []) as ListingRow[])
    .sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0))
    .map(listing => ({
      ...listing,
      categories: uniqueById(listingCategoriesMap[listing.id] || []),
      tags: uniqueById(listingTagsMap[listing.id] || []),
    }));
}

function extractMeta(listings: PopularListing[]): { categories: Category[]; tags: Tag[] } {
  return {
    categories: uniqueById(listings.flatMap(listing => listing.categories)),
    tags: uniqueById(listings.flatMap(listing => listing.tags)),
  };
}

const normalizeRecommendationRows = (rows: RecommendationPopularRow[]): ListingRow[] =>
  rows.map(row => ({
    id: row.id,
    host_id: String(row.host_id || ''),
    listing_type: (row.listing_type as ListingRow['listing_type']) || 'stay',
    title: row.title || 'Untitled listing',
    description: row.description || '',
    is_active: row.is_active ?? true,
    price: typeof row.price === 'number' ? row.price : Number(row.price || 0),
    created_at: row.created_at || new Date().toISOString(),
  }));

async function fetchPopularFromRecommendationApi(
  period: 'today' | 'this_week',
  pagination?: { page?: number; page_size?: number }
): Promise<PopularTodayResults> {
  const page = pagination?.page || 1;
  const page_size = pagination?.page_size || 20;
  const offset = (page - 1) * page_size;
  const path = recommendationApiPath('/v1/listings/popular', { page, limit: page_size, period });
  const envelope = await callRecommendationApi<RecommendationPopularRow[]>(path, { method: 'GET' });
  const apiRows = envelope.data || [];
  if (apiRows.length === 0) {
    return {
      listings: [],
      categories: [],
      tags: [],
      total_count: 0,
      period,
    };
  }

  const normalizedRows = normalizeRecommendationRows(apiRows);
  const listingIds = normalizedRows.map(row => row.id);
  const listings = await fetchListingsWithTaxonomy(listingIds);

  const interactionMap = new Map(apiRows.map(row => [row.id, Number(row.interaction_score || 0)]));
  const bookingMap = new Map(apiRows.map(row => [row.id, Number(row.booking_count || 0)]));

  const merged: PopularListing[] = listings.map((listing, index) => ({
    ...listing,
    interaction_score: interactionMap.get(listing.id) || undefined,
    booking_count: bookingMap.get(listing.id) || undefined,
    trending_rank: offset + index + 1,
  }));

  const meta = extractMeta(merged);
  return {
    listings: merged,
    categories: meta.categories,
    tags: meta.tags,
    total_count: envelope.count || merged.length,
    period,
  };
}

async function getInteractionScores(sinceIso: string, untilIso?: string): Promise<Record<string, number>> {
  let query = supabase
    .from('interactions')
    .select('listing_id, score')
    .gte('created_at', sinceIso);

  if (untilIso) {
    query = query.lt('created_at', untilIso);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch interactions: ${error.message}`);
  }

  const scores: Record<string, number> = {};
  (data || []).forEach(row => {
    scores[row.listing_id] = (scores[row.listing_id] || 0) + Number(row.score || 0);
  });

  return scores;
}

/**
 * Popular Today service - handles trending and popular listings
 */
export const popularTodayService = {
  /**
   * Get popular listings for today based on interactions
   */
  async getPopularToday(
    pagination?: { page?: number; page_size?: number }
  ): Promise<PopularTodayResults> {
    const runBasic = async (): Promise<PopularTodayResults> => {
      const page = pagination?.page || 1;
      const page_size = pagination?.page_size || 20;
      const offset = (page - 1) * page_size;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const scores = await getInteractionScores(today.toISOString(), tomorrow.toISOString());
      const rankedIds = Object.entries(scores)
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => id);

      const pageIds = rankedIds.slice(offset, offset + page_size);
      if (pageIds.length === 0) {
        return this.getRecentPopular(pagination);
      }

      const listings = await fetchListingsWithTaxonomy(pageIds);
      const popularListings: PopularListing[] = listings.map((listing, index) => ({
        ...listing,
        interaction_score: scores[listing.id] || 0,
        trending_rank: offset + index + 1,
      }));

      const meta = extractMeta(popularListings);

      return {
        listings: popularListings,
        categories: meta.categories,
        tags: meta.tags,
        total_count: rankedIds.length,
        period: 'today',
      };
    };

    try {
      return await runDualMode({
        context: 'popularTodayService.getPopularToday',
        recEng: () => fetchPopularFromRecommendationApi('today', pagination),
        basic: runBasic,
      });
    } catch (error) {
      console.error('Error in getPopularToday:', error);
      throw error;
    }
  },

  /**
   * Get popular listings for this week
   */
  async getPopularThisWeek(
    pagination?: { page?: number; page_size?: number }
  ): Promise<PopularTodayResults> {
    const runBasic = async (): Promise<PopularTodayResults> => {
      const page = pagination?.page || 1;
      const page_size = pagination?.page_size || 20;
      const offset = (page - 1) * page_size;

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const scores = await getInteractionScores(weekAgo.toISOString());
      const rankedIds = Object.entries(scores)
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => id);

      const pageIds = rankedIds.slice(offset, offset + page_size);
      if (pageIds.length === 0) {
        return {
          listings: [],
          categories: [],
          tags: [],
          total_count: 0,
          period: 'this_week',
        };
      }

      const listings = await fetchListingsWithTaxonomy(pageIds);
      const popularListings: PopularListing[] = listings.map((listing, index) => ({
        ...listing,
        interaction_score: scores[listing.id] || 0,
        trending_rank: offset + index + 1,
      }));

      const meta = extractMeta(popularListings);

      return {
        listings: popularListings,
        categories: meta.categories,
        tags: meta.tags,
        total_count: rankedIds.length,
        period: 'this_week',
      };
    };

    try {
      return await runDualMode({
        context: 'popularTodayService.getPopularThisWeek',
        recEng: () => fetchPopularFromRecommendationApi('this_week', pagination),
        basic: runBasic,
      });
    } catch (error) {
      console.error('Error in getPopularThisWeek:', error);
      throw error;
    }
  },

  /**
   * Get recent popular listings (fallback when no interactions)
   */
  async getRecentPopular(
    pagination?: { page?: number; page_size?: number }
  ): Promise<PopularTodayResults> {
    try {
      const page = pagination?.page || 1;
      const page_size = pagination?.page_size || 20;
      const offset = (page - 1) * page_size;

      const { data: listings, error, count } = await supabase
        .from('listings')
        .select('id, host_id, listing_type, title, description, is_active, price, created_at', { count: 'exact' })
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + page_size - 1);

      if (error) {
        throw error;
      }

      const baseListings = (listings || []) as ListingRow[];
      const fullListings = await fetchListingsWithTaxonomy(baseListings.map(l => l.id));

      const recentListings: PopularListing[] = fullListings.map((listing, index) => ({
        ...listing,
        trending_rank: offset + index + 1,
      }));

      const meta = extractMeta(recentListings);

      return {
        listings: recentListings,
        categories: meta.categories,
        tags: meta.tags,
        total_count: count || 0,
        period: 'today',
      };
    } catch (error) {
      console.error('Error in getRecentPopular:', error);
      throw error;
    }
  },

  /**
   * Get trending listings by booking count
   */
  async getTrendingByBookings(
    pagination?: { page?: number; page_size?: number }
  ): Promise<PopularTodayResults> {
    try {
      const page = pagination?.page || 1;
      const page_size = pagination?.page_size || 20;
      const offset = (page - 1) * page_size;

      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('listing_id')
        .in('status', ['confirmed', 'completed'])
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (error) {
        throw error;
      }

      const bookingCountMap: Record<string, number> = {};
      (bookings || []).forEach(row => {
        bookingCountMap[row.listing_id] = (bookingCountMap[row.listing_id] || 0) + 1;
      });

      const rankedIds = Object.entries(bookingCountMap)
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => id);

      const pageIds = rankedIds.slice(offset, offset + page_size);
      if (pageIds.length === 0) {
        return {
          listings: [],
          categories: [],
          tags: [],
          total_count: 0,
          period: 'this_week',
        };
      }

      const listings = await fetchListingsWithTaxonomy(pageIds);
      const trendingListings: PopularListing[] = listings.map((listing, index) => ({
        ...listing,
        booking_count: bookingCountMap[listing.id] || 0,
        trending_rank: offset + index + 1,
      }));

      const meta = extractMeta(trendingListings);

      return {
        listings: trendingListings,
        categories: meta.categories,
        tags: meta.tags,
        total_count: rankedIds.length,
        period: 'this_week',
      };
    } catch (error) {
      console.error('Error in getTrendingByBookings:', error);
      throw error;
    }
  },
};
