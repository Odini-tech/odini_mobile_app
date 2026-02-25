// src/services/popularTodayService.ts

import { supabase } from '../../lib/supabase';
import { Category, SearchListing, Tag } from './searchService';

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
  period: string; // 'today', 'this_week', 'this_month'
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
    try {
      const page = pagination?.page || 1;
      const page_size = pagination?.page_size || 20;
      const offset = (page - 1) * page_size;

      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get interactions from today and calculate scores
      const { data: interactions, error: interactionError } = await supabase
        .from('interactions')
        .select('listing_id, score')
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString());

      if (interactionError) {
        console.error('Interaction fetch error:', interactionError);
      }

      // Calculate interaction scores per listing
      const interactionScores: Record<string, number> = {};
      interactions?.forEach(interaction => {
        if (!interactionScores[interaction.listing_id]) {
          interactionScores[interaction.listing_id] = 0;
        }
        interactionScores[interaction.listing_id] += interaction.score || 0;
      });

      // Get listings that have interactions today, sorted by score
      const topListingIds = Object.entries(interactionScores)
        .sort((a, b) => b[1] - a[1])
        .slice(offset, offset + page_size)
        .map(([id]) => id);

      if (topListingIds.length === 0) {
        // Fallback: get recent active listings if no interactions today
        return await popularTodayService.getRecentPopular(pagination);
      }

      // Fetch full listing details
      const { data: listings, error: listingError, count } = await supabase
        .from('listings')
        .select('*')
        .in('id', topListingIds)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (listingError) {
        throw new Error(`Failed to fetch popular listings: ${listingError.message}`);
      }

      if (!listings || listings.length === 0) {
        return {
          listings: [],
          categories: [],
          tags: [],
          total_count: 0,
          period: 'today'
        };
      }

      // Fetch categories and tags
      const { data: categoryListings } = await supabase
        .from('category_listings')
        .select('listing_id, categories(id, name, description, image_url, parent_id, created_at)')
        .in('listing_id', topListingIds);

      const { data: tagListings } = await supabase
        .from('tag_listings')
        .select('listing_id, tags(id, name, created_at)')
        .in('listing_id', topListingIds);

      // Build maps
      const listingCategoriesMap: Record<string, Category[]> = {};
      categoryListings?.forEach((cl: any) => {
        if (!listingCategoriesMap[cl.listing_id]) {
          listingCategoriesMap[cl.listing_id] = [];
        }
        if (cl.categories) {
          listingCategoriesMap[cl.listing_id].push(cl.categories);
        }
      });

      const listingTagsMap: Record<string, Tag[]> = {};
      tagListings?.forEach((tl: any) => {
        if (!listingTagsMap[tl.listing_id]) {
          listingTagsMap[tl.listing_id] = [];
        }
        if (tl.tags) {
          listingTagsMap[tl.listing_id].push(tl.tags);
        }
      });

      // Build popular listings with scores
      const popularListings: PopularListing[] = listings.map((listing, index) => ({
        ...listing,
        categories: listingCategoriesMap[listing.id] || [],
        tags: listingTagsMap[listing.id] || [],
        interaction_score: interactionScores[listing.id] || 0,
        trending_rank: offset + index + 1
      }));

      // Get unique categories and tags
      const categoriesSet = new Set<string>();
      const tagsSet = new Set<string>();

      popularListings.forEach(listing => {
        listing.categories.forEach(cat => categoriesSet.add(JSON.stringify(cat)));
        listing.tags.forEach(tag => tagsSet.add(JSON.stringify(tag)));
      });

      return {
        listings: popularListings,
        categories: Array.from(categoriesSet).map(c => JSON.parse(c)),
        tags: Array.from(tagsSet).map(t => JSON.parse(t)),
        total_count: count || 0,
        period: 'today'
      };
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
    try {
      const page = pagination?.page || 1;
      const page_size = pagination?.page_size || 20;
      const offset = (page - 1) * page_size;

      // Get week date range (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      // Get interactions from this week
      const { data: interactions } = await supabase
        .from('interactions')
        .select('listing_id, score')
        .gte('created_at', weekAgo.toISOString());

      // Calculate scores
      const interactionScores: Record<string, number> = {};
      interactions?.forEach(interaction => {
        if (!interactionScores[interaction.listing_id]) {
          interactionScores[interaction.listing_id] = 0;
        }
        interactionScores[interaction.listing_id] += interaction.score || 0;
      });

      // Get top listings
      const topListingIds = Object.entries(interactionScores)
        .sort((a, b) => b[1] - a[1])
        .slice(offset, offset + page_size)
        .map(([id]) => id);

      if (topListingIds.length === 0) {
        return {
          listings: [],
          categories: [],
          tags: [],
          total_count: 0,
          period: 'this_week'
        };
      }

      // Fetch listings
      const { data: listings, error, count } = await supabase
        .from('listings')
        .select('*')
        .in('id', topListingIds)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      if (!listings || listings.length === 0) {
        return {
          listings: [],
          categories: [],
          tags: [],
          total_count: 0,
          period: 'this_week'
        };
      }

      // Fetch categories and tags
      const { data: categoryListings } = await supabase
        .from('category_listings')
        .select('listing_id, categories(id, name, description, image_url, parent_id, created_at)')
        .in('listing_id', topListingIds);

      const { data: tagListings } = await supabase
        .from('tag_listings')
        .select('listing_id, tags(id, name, created_at)')
        .in('listing_id', topListingIds);

      // Build maps
      const listingCategoriesMap: Record<string, Category[]> = {};
      categoryListings?.forEach((cl: any) => {
        if (!listingCategoriesMap[cl.listing_id]) {
          listingCategoriesMap[cl.listing_id] = [];
        }
        if (cl.categories) {
          listingCategoriesMap[cl.listing_id].push(cl.categories);
        }
      });

      const listingTagsMap: Record<string, Tag[]> = {};
      tagListings?.forEach((tl: any) => {
        if (!listingTagsMap[tl.listing_id]) {
          listingTagsMap[tl.listing_id] = [];
        }
        if (tl.tags) {
          listingTagsMap[tl.listing_id].push(tl.tags);
        }
      });

      const popularListings: PopularListing[] = listings.map((listing, index) => ({
        ...listing,
        categories: listingCategoriesMap[listing.id] || [],
        tags: listingTagsMap[listing.id] || [],
        interaction_score: interactionScores[listing.id] || 0,
        trending_rank: offset + index + 1
      }));

      // Get unique categories and tags
      const categoriesSet = new Set<string>();
      const tagsSet = new Set<string>();

      popularListings.forEach(listing => {
        listing.categories.forEach(cat => categoriesSet.add(JSON.stringify(cat)));
        listing.tags.forEach(tag => tagsSet.add(JSON.stringify(tag)));
      });

      return {
        listings: popularListings,
        categories: Array.from(categoriesSet).map(c => JSON.parse(c)),
        tags: Array.from(tagsSet).map(t => JSON.parse(t)),
        total_count: count || 0,
        period: 'this_week'
      };
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

      // Get recent active listings
      const { data: listings, error, count } = await supabase
        .from('listings')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + page_size - 1);

      if (error) {
        throw error;
      }

      if (!listings || listings.length === 0) {
        return {
          listings: [],
          categories: [],
          tags: [],
          total_count: 0,
          period: 'today'
        };
      }

      const listingIds = listings.map(l => l.id);

      // Fetch categories and tags
      const { data: categoryListings } = await supabase
        .from('category_listings')
        .select('listing_id, categories(id, name, description, image_url, parent_id, created_at)')
        .in('listing_id', listingIds);

      const { data: tagListings } = await supabase
        .from('tag_listings')
        .select('listing_id, tags(id, name, created_at)')
        .in('listing_id', listingIds);

      // Build maps
      const listingCategoriesMap: Record<string, Category[]> = {};
      categoryListings?.forEach((cl: any) => {
        if (!listingCategoriesMap[cl.listing_id]) {
          listingCategoriesMap[cl.listing_id] = [];
        }
        if (cl.categories) {
          listingCategoriesMap[cl.listing_id].push(cl.categories);
        }
      });

      const listingTagsMap: Record<string, Tag[]> = {};
      tagListings?.forEach((tl: any) => {
        if (!listingTagsMap[tl.listing_id]) {
          listingTagsMap[tl.listing_id] = [];
        }
        if (tl.tags) {
          listingTagsMap[tl.listing_id].push(tl.tags);
        }
      });

      const recentListings: PopularListing[] = listings.map((listing, index) => ({
        ...listing,
        categories: listingCategoriesMap[listing.id] || [],
        tags: listingTagsMap[listing.id] || [],
        trending_rank: offset + index + 1
      }));

      // Get unique categories and tags
      const categoriesSet = new Set<string>();
      const tagsSet = new Set<string>();

      recentListings.forEach(listing => {
        listing.categories.forEach(cat => categoriesSet.add(JSON.stringify(cat)));
        listing.tags.forEach(tag => tagsSet.add(JSON.stringify(tag)));
      });

      return {
        listings: recentListings,
        categories: Array.from(categoriesSet).map(c => JSON.parse(c)),
        tags: Array.from(tagsSet).map(t => JSON.parse(t)),
        total_count: count || 0,
        period: 'today'
      };
    } catch (error) {
      console.error('Error in getRecentPopular:', error);
      throw error;
    }
  },

  /**
   * Get trending listings by booking count (requires additional data aggregation)
   */
  async getTrendingByBookings(
    pagination?: { page?: number; page_size?: number }
  ): Promise<PopularTodayResults> {
    try {
      const page = pagination?.page || 1;
      const page_size = pagination?.page_size || 20;
      const offset = (page - 1) * page_size;

      // Get listings with their booking counts
      const { data: bookingCounts, error: bookingError } = await supabase
        .rpc('get_trending_listings', {
          limit: page_size,
          offset: offset,
          days: 7
        })
        .select('*');

      if (bookingError) {
        console.warn('Booking trending fetch error, falling back to recent:', bookingError);
        return await popularTodayService.getRecentPopular(pagination);
      }

      if (!bookingCounts || bookingCounts.length === 0) {
        return {
          listings: [],
          categories: [],
          tags: [],
          total_count: 0,
          period: 'this_week'
        };
      }

      const listingIds = bookingCounts.map((bc: any) => bc.listing_id);

      // Fetch full listing details
      const { data: listings } = await supabase
        .from('listings')
        .select('*')
        .in('id', listingIds)
        .eq('is_active', true);

      if (!listings) {
        return {
          listings: [],
          categories: [],
          tags: [],
          total_count: 0,
          period: 'this_week'
        };
      }

      // Create booking count map
      const bookingCountMap: Record<string, number> = {};
      bookingCounts.forEach((bc: any) => {
        bookingCountMap[bc.listing_id] = bc.booking_count || 0;
      });

      // Fetch categories and tags
      const { data: categoryListings } = await supabase
        .from('category_listings')
        .select('listing_id, categories(id, name, description, image_url, parent_id, created_at)')
        .in('listing_id', listingIds);

      const { data: tagListings } = await supabase
        .from('tag_listings')
        .select('listing_id, tags(id, name, created_at)')
        .in('listing_id', listingIds);

      // Build maps
      const listingCategoriesMap: Record<string, Category[]> = {};
      categoryListings?.forEach((cl: any) => {
        if (!listingCategoriesMap[cl.listing_id]) {
          listingCategoriesMap[cl.listing_id] = [];
        }
        if (cl.categories) {
          listingCategoriesMap[cl.listing_id].push(cl.categories);
        }
      });

      const listingTagsMap: Record<string, Tag[]> = {};
      tagListings?.forEach((tl: any) => {
        if (!listingTagsMap[tl.listing_id]) {
          listingTagsMap[tl.listing_id] = [];
        }
        if (tl.tags) {
          listingTagsMap[tl.listing_id].push(tl.tags);
        }
      });

      const trendingListings: PopularListing[] = listings
        .sort((a, b) => (bookingCountMap[b.id] || 0) - (bookingCountMap[a.id] || 0))
        .map((listing, index) => ({
          ...listing,
          categories: listingCategoriesMap[listing.id] || [],
          tags: listingTagsMap[listing.id] || [],
          booking_count: bookingCountMap[listing.id],
          trending_rank: offset + index + 1
        }));

      // Get unique categories and tags
      const categoriesSet = new Set<string>();
      const tagsSet = new Set<string>();

      trendingListings.forEach(listing => {
        listing.categories.forEach(cat => categoriesSet.add(JSON.stringify(cat)));
        listing.tags.forEach(tag => tagsSet.add(JSON.stringify(tag)));
      });

      return {
        listings: trendingListings,
        categories: Array.from(categoriesSet).map(c => JSON.parse(c)),
        tags: Array.from(tagsSet).map(t => JSON.parse(t)),
        total_count: bookingCounts.length,
        period: 'this_week'
      };
    } catch (error) {
      console.error('Error in getTrendingByBookings:', error);
      throw error;
    }
  }
};
