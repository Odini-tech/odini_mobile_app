// src/services/searchService.ts

import { supabase } from '../../lib/supabase';

/**
 * Category interface
 */
export interface Category {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  parent_id?: string;
  created_at: string;
}

/**
 * Tag interface
 */
export interface Tag {
  id: string;
  name: string;
  created_at: string;
}

/**
 * Listing with categories and tags
 */
export interface SearchListing {
  id: string;
  host_id: string;
  listing_type: 'stay' | 'event' | 'offering';
  title: string;
  description?: string;
  is_active: boolean;
  price: number;
  created_at: string;
  categories: Category[];
  tags: Tag[];
}

/**
 * Search results containing listings, categories, and tags
 */
export interface SearchResults {
  listings: SearchListing[];
  categories: Category[];
  tags: Tag[];
  total_count: number;
}

/**
 * Search parameters
 */
export interface SearchParams {
  query?: string;
  listing_type?: 'stay' | 'event' | 'offering';
  category_ids?: string[];
  tag_ids?: string[];
  min_price?: number;
  max_price?: number;
  is_active?: boolean;
  page?: number;
  page_size?: number;
}

/**
 * Search service - handles search operations across listings, categories, and tags
 */
export const searchService = {
  /**
   * Comprehensive search across listings with categories and tags
   */
  async searchListings(params: SearchParams = {}): Promise<SearchResults> {
    try {
      const {
        query = '',
        listing_type,
        category_ids = [],
        tag_ids = [],
        min_price,
        max_price,
        is_active = true,
        page = 1,
        page_size = 20
      } = params;

      const offset = (page - 1) * page_size;

      // Search listings
      let listingsQuery = supabase
        .from('listings')
        .select('*');

      // Apply text search
      if (query.trim()) {
        listingsQuery = listingsQuery.or(
          `title.ilike.%${query}%,description.ilike.%${query}%`
        );
      }

      // Filter by listing type
      if (listing_type) {
        listingsQuery = listingsQuery.eq('listing_type', listing_type);
      }

      // Filter by active status
      listingsQuery = listingsQuery.eq('is_active', is_active);

      // Filter by price range
      if (min_price !== undefined) {
        listingsQuery = listingsQuery.gte('price', min_price);
      }
      if (max_price !== undefined) {
        listingsQuery = listingsQuery.lte('price', max_price);
      }

      // Apply pagination
      listingsQuery = listingsQuery
        .range(offset, offset + page_size - 1)
        .order('created_at', { ascending: false });

      const { data: listings, error: listingsError, count: total_count } = await listingsQuery;

      if (listingsError) {
        throw new Error(`Failed to search listings: ${listingsError.message}`);
      }

      // If no listings found, return early
      if (!listings || listings.length === 0) {
        return {
          listings: [],
          categories: [],
          tags: [],
          total_count: 0
        };
      }

      const listingIds = listings.map(l => l.id);

      // Fetch categories for these listings
      const { data: categoryListings, error: categoryError } = await supabase
        .from('category_listings')
        .select('listing_id, categories(id, name, description, image_url, parent_id, created_at)')
        .in('listing_id', listingIds);

      if (categoryError) {
        console.error('Category fetch error:', categoryError);
      }

      // Fetch tags for these listings
      const { data: tagListings, error: tagError } = await supabase
        .from('tag_listings')
        .select('listing_id, tags(id, name, created_at)')
        .in('listing_id', listingIds);

      if (tagError) {
        console.error('Tag fetch error:', tagError);
      }

      // Build a map of listing id -> categories
      const listingCategoriesMap: Record<string, Category[]> = {};
      categoryListings?.forEach((cl: any) => {
        if (!listingCategoriesMap[cl.listing_id]) {
          listingCategoriesMap[cl.listing_id] = [];
        }
        if (cl.categories) {
          listingCategoriesMap[cl.listing_id].push(cl.categories);
        }
      });

      // Build a map of listing id -> tags
      const listingTagsMap: Record<string, Tag[]> = {};
      tagListings?.forEach((tl: any) => {
        if (!listingTagsMap[tl.listing_id]) {
          listingTagsMap[tl.listing_id] = [];
        }
        if (tl.tags) {
          listingTagsMap[tl.listing_id].push(tl.tags);
        }
      });

      // Combine listings with their categories and tags
      const searchListings: SearchListing[] = listings.map(listing => ({
        ...listing,
        categories: listingCategoriesMap[listing.id] || [],
        tags: listingTagsMap[listing.id] || []
      }));

      // Get all unique categories and tags from results
      const categoriesSet = new Set<string>();
      const tagsSet = new Set<string>();

      searchListings.forEach(listing => {
        listing.categories.forEach(cat => categoriesSet.add(JSON.stringify(cat)));
        listing.tags.forEach(tag => tagsSet.add(JSON.stringify(tag)));
      });

      const categories = Array.from(categoriesSet).map(c => JSON.parse(c));
      const tags = Array.from(tagsSet).map(t => JSON.parse(t));

      return {
        listings: searchListings,
        categories,
        tags,
        total_count: total_count || 0
      };
    } catch (error) {
      console.error('Error in searchListings:', error);
      throw error;
    }
  },

  /**
   * Search by category only
   */
  async searchByCategory(
    categoryId: string,
    pagination?: { page?: number; page_size?: number }
  ): Promise<SearchResults> {
    try {
      const page = pagination?.page || 1;
      const page_size = pagination?.page_size || 20;
      const offset = (page - 1) * page_size;

      // Get listings from this category
      const { data: categoryListings, error, count } = await supabase
        .from('category_listings')
        .select('listing_id, listings(id, host_id, listing_type, title, description, is_active, price, created_at)')
        .eq('category_id', categoryId)
        .range(offset, offset + page_size - 1);

      if (error) {
        throw new Error(`Failed to search by category: ${error.message}`);
      }

      const listings = categoryListings?.map((cl: any) => cl.listings).filter(Boolean) || [];
      const listingIds = listings.map(l => l.id);

      if (listingIds.length === 0) {
        return { listings: [], categories: [], tags: [], total_count: 0 };
      }

      // Fetch tags for listings
      const { data: tagListings } = await supabase
        .from('tag_listings')
        .select('listing_id, tags(id, name, created_at)')
        .in('listing_id', listingIds);

      const listingTagsMap: Record<string, Tag[]> = {};
      tagListings?.forEach((tl: any) => {
        if (!listingTagsMap[tl.listing_id]) {
          listingTagsMap[tl.listing_id] = [];
        }
        if (tl.tags) {
          listingTagsMap[tl.listing_id].push(tl.tags);
        }
      });

      // Get category details
      const { data: categoryData } = await supabase
        .from('categories')
        .select('*')
        .eq('id', categoryId)
        .single();

      const searchListings: SearchListing[] = listings.map((listing: any) => ({
        ...listing,
        categories: categoryData ? [categoryData] : [],
        tags: listingTagsMap[listing.id] || []
      }));

      return {
        listings: searchListings,
        categories: categoryData ? [categoryData] : [],
        tags: Array.from(new Set(
          Object.values(listingTagsMap).flat().map(t => JSON.stringify(t))
        )).map(t => JSON.parse(t)),
        total_count: count || 0
      };
    } catch (error) {
      console.error('Error in searchByCategory:', error);
      throw error;
    }
  },

  /**
   * Search by tag only
   */
  async searchByTag(
    tagId: string,
    pagination?: { page?: number; page_size?: number }
  ): Promise<SearchResults> {
    try {
      const page = pagination?.page || 1;
      const page_size = pagination?.page_size || 20;
      const offset = (page - 1) * page_size;

      // Get listings with this tag
      const { data: tagListings, error, count } = await supabase
        .from('tag_listings')
        .select('listing_id, listings(id, host_id, listing_type, title, description, is_active, price, created_at)')
        .eq('tag_id', tagId)
        .range(offset, offset + page_size - 1);

      if (error) {
        throw new Error(`Failed to search by tag: ${error.message}`);
      }

      const listings = tagListings?.map((tl: any) => tl.listings).filter(Boolean) || [];
      const listingIds = listings.map(l => l.id);

      if (listingIds.length === 0) {
        return { listings: [], categories: [], tags: [], total_count: 0 };
      }

      // Fetch categories for listings
      const { data: categoryListings } = await supabase
        .from('category_listings')
        .select('listing_id, categories(id, name, description, image_url, parent_id, created_at)')
        .in('listing_id', listingIds);

      const listingCategoriesMap: Record<string, Category[]> = {};
      categoryListings?.forEach((cl: any) => {
        if (!listingCategoriesMap[cl.listing_id]) {
          listingCategoriesMap[cl.listing_id] = [];
        }
        if (cl.categories) {
          listingCategoriesMap[cl.listing_id].push(cl.categories);
        }
      });

      // Get tag details
      const { data: tagData } = await supabase
        .from('tags')
        .select('*')
        .eq('id', tagId)
        .single();

      const searchListings: SearchListing[] = listings.map((listing: any) => ({
        ...listing,
        categories: listingCategoriesMap[listing.id] || [],
        tags: tagData ? [tagData] : []
      }));

      return {
        listings: searchListings,
        categories: Array.from(new Set(
          Object.values(listingCategoriesMap).flat().map(c => JSON.stringify(c))
        )).map(c => JSON.parse(c)),
        tags: tagData ? [tagData] : [],
        total_count: count || 0
      };
    } catch (error) {
      console.error('Error in searchByTag:', error);
      throw error;
    }
  },

  /**
   * Get all available categories
   */
  async getCategories(): Promise<Category[]> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch categories: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getCategories:', error);
      throw error;
    }
  },

  /**
   * Get all available tags
   */
  async getTags(): Promise<Tag[]> {
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch tags: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getTags:', error);
      throw error;
    }
  }
};
