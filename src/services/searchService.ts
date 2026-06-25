import { supabase } from '../../lib/supabase';
import { callRecommendationApi, recommendationApiPath, runDualMode } from './recommendationGateway';

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

type ListingRow = Omit<SearchListing, 'categories' | 'tags'>;
type RecommendationApiListing = Partial<ListingRow> & { hostId?: string };

type CategoryJoinRow = {
  listing_id: string;
  category: Category | Category[] | null;
};

type TagJoinRow = {
  listing_id: string;
  tag: Tag | Tag[] | null;
};

const uniqueById = <T extends { id: string }>(items: T[]): T[] => {
  const seen = new Set<string>();
  return items.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

const toMapArray = <T>(rows: Array<{ listing_id: string; value: T | null }>): Record<string, T[]> => {
  const map: Record<string, T[]> = {};
  rows.forEach(row => {
    if (!row.value) return;
    if (!map[row.listing_id]) {
      map[row.listing_id] = [];
    }
    map[row.listing_id].push(row.value);
  });
  return map;
};

const toArrayValue = <T>(value: T | T[] | null): T[] => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const normalizeApiListingRows = (rows: RecommendationApiListing[]): ListingRow[] =>
  rows
    .filter(row => !!row.id)
    .map(row => ({
      id: String(row.id),
      host_id: String(row.host_id || row.hostId || ''),
      listing_type: (row.listing_type as ListingRow['listing_type']) || 'stay',
      title: row.title || 'Untitled listing',
      description: row.description || '',
      is_active: row.is_active ?? true,
      price: typeof row.price === 'number' ? row.price : Number(row.price || 0),
      created_at: row.created_at || new Date().toISOString(),
    }));

async function fetchListingIdsByQueryTaxonomy(query: string): Promise<Set<string>> {
  const term = `%${query}%`;
  const [{ data: matchingCats }, { data: matchingTags }] = await Promise.all([
    supabase.from('categories').select('id').ilike('name', term),
    supabase.from('tags').select('id').ilike('name', term),
  ]);

  const catIds = (matchingCats || []).map((c) => c.id);
  const tagIds = (matchingTags || []).map((t) => t.id);

  if (!catIds.length && !tagIds.length) return new Set<string>();

  const [catRows, tagRows] = await Promise.all([
    catIds.length
      ? supabase.from('category_listings').select('listing_id').in('category_id', catIds).then((r) => r.data || [])
      : Promise.resolve([]),
    tagIds.length
      ? supabase.from('tag_listings').select('listing_id').in('tag_id', tagIds).then((r) => r.data || [])
      : Promise.resolve([]),
  ]);

  const ids = new Set<string>();
  catRows.forEach((r) => ids.add(r.listing_id));
  tagRows.forEach((r) => ids.add(r.listing_id));
  return ids;
}

async function fetchListingIdsByTaxonomy(categoryIds: string[], tagIds: string[]): Promise<Set<string> | null> {
  let categorySet: Set<string> | null = null;
  let tagSet: Set<string> | null = null;

  if (categoryIds.length > 0) {
    const { data, error } = await supabase
      .from('category_listings')
      .select('listing_id')
      .in('category_id', categoryIds);

    if (error) {
      throw new Error(`Failed to filter categories: ${error.message}`);
    }

    categorySet = new Set((data || []).map(row => row.listing_id));
  }

  if (tagIds.length > 0) {
    const { data, error } = await supabase
      .from('tag_listings')
      .select('listing_id')
      .in('tag_id', tagIds);

    if (error) {
      throw new Error(`Failed to filter tags: ${error.message}`);
    }

    tagSet = new Set((data || []).map(row => row.listing_id));
  }

  if (!categorySet && !tagSet) {
    return null;
  }

  if (categorySet && tagSet) {
    return new Set(Array.from(categorySet).filter(id => tagSet!.has(id)));
  }

  return categorySet || tagSet;
}

async function attachCategoriesAndTags(listings: ListingRow[]): Promise<SearchResults> {
  if (listings.length === 0) {
    return { listings: [], categories: [], tags: [], total_count: 0 };
  }

  const listingIds = listings.map(l => l.id);

  const [{ data: categoryRows, error: categoryError }, { data: tagRows, error: tagError }] = await Promise.all([
    supabase
      .from('category_listings')
      .select('listing_id, category:categories(id, name, description, image_url, parent_id, created_at)')
      .in('listing_id', listingIds),
    supabase
      .from('tag_listings')
      .select('listing_id, tag:tags(id, name, created_at)')
      .in('listing_id', listingIds),
  ]);

  if (categoryError) {
    console.error('Category fetch error:', categoryError);
  }

  if (tagError) {
    console.error('Tag fetch error:', tagError);
  }

  const listingCategoriesMap = toMapArray<Category>(
    ((categoryRows || []) as CategoryJoinRow[]).flatMap(row =>
      toArrayValue(row.category).map(category => ({ listing_id: row.listing_id, value: category }))
    )
  );
  const listingTagsMap = toMapArray<Tag>(
    ((tagRows || []) as TagJoinRow[]).flatMap(row =>
      toArrayValue(row.tag).map(tag => ({ listing_id: row.listing_id, value: tag }))
    )
  );

  const searchListings: SearchListing[] = listings.map(listing => ({
    ...listing,
    categories: uniqueById(listingCategoriesMap[listing.id] || []),
    tags: uniqueById(listingTagsMap[listing.id] || []),
  }));

  const categories = uniqueById(searchListings.flatMap(listing => listing.categories));
  const tags = uniqueById(searchListings.flatMap(listing => listing.tags));

  return {
    listings: searchListings,
    categories,
    tags,
    total_count: 0,
  };
}

/**
 * Search service - handles search operations across listings, categories, and tags
 */
export const searchService = {
  /**
   * Comprehensive search across listings with categories and tags
   */
  async searchListings(params: SearchParams = {}): Promise<SearchResults> {
    const runBasic = async (): Promise<SearchResults> => {
      const {
        query = '',
        listing_type,
        category_ids = [],
        tag_ids = [],
        min_price,
        max_price,
        is_active = true,
        page = 1,
        page_size = 20,
      } = params;

      const offset = (page - 1) * page_size;

      const filteredIdSet = await fetchListingIdsByTaxonomy(category_ids, tag_ids);
      if (filteredIdSet && filteredIdSet.size === 0) {
        return {
          listings: [],
          categories: [],
          tags: [],
          total_count: 0,
        };
      }

      let listingsQuery = supabase
        .from('listings')
        .select('id, host_id, listing_type, title, description, is_active, price, created_at', { count: 'exact' });

      if (query.trim()) {
        const taxonomyIds = await fetchListingIdsByQueryTaxonomy(query);
        const idList = Array.from(taxonomyIds);
        if (idList.length > 0) {
          listingsQuery = listingsQuery.or(
            `title.ilike.%${query}%,description.ilike.%${query}%,id.in.(${idList.join(',')})`
          );
        } else {
          listingsQuery = listingsQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
        }
      }

      if (listing_type) {
        listingsQuery = listingsQuery.eq('listing_type', listing_type);
      }

      listingsQuery = listingsQuery.eq('is_active', is_active);

      if (min_price !== undefined) {
        listingsQuery = listingsQuery.gte('price', min_price);
      }

      if (max_price !== undefined) {
        listingsQuery = listingsQuery.lte('price', max_price);
      }

      if (filteredIdSet) {
        listingsQuery = listingsQuery.in('id', Array.from(filteredIdSet));
      }

      const { data: listings, error: listingsError, count } = await listingsQuery
        .order('created_at', { ascending: false })
        .range(offset, offset + page_size - 1);

      if (listingsError) {
        throw new Error(`Failed to search listings: ${listingsError.message}`);
      }

      const combined = await attachCategoriesAndTags((listings || []) as ListingRow[]);

      return {
        ...combined,
        total_count: count || 0,
      };
    };

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
        page_size = 20,
      } = params;
      const offset = (page - 1) * page_size;

      return await runDualMode<SearchResults>({
        context: 'searchService.searchListings',
        fallbackToBasicOnError: false,
        recEng: async () => {
          const filteredIdSet = await fetchListingIdsByTaxonomy(category_ids, tag_ids);

          let path = '/v1/listings';
          if (query.trim()) {
            path = recommendationApiPath('/v1/listings/search', { q: query });
          } else if (listing_type) {
            path = `/v1/listings/type/${listing_type}`;
          }

          const envelope = await callRecommendationApi<RecommendationApiListing[]>(path, { method: 'GET' });
          let rows = normalizeApiListingRows(envelope.data || []);

          if (listing_type) {
            rows = rows.filter(row => row.listing_type === listing_type);
          }

          rows = rows.filter(row => row.is_active === is_active);

          if (filteredIdSet) {
            rows = rows.filter(row => filteredIdSet.has(row.id));
          }

          if (min_price !== undefined) {
            rows = rows.filter(row => Number(row.price) >= min_price);
          }

          if (max_price !== undefined) {
            rows = rows.filter(row => Number(row.price) <= max_price);
          }

          rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          const total = rows.length;
          const pagedRows = rows.slice(offset, offset + page_size);

          const combined = await attachCategoriesAndTags(pagedRows);
          return {
            ...combined,
            total_count: total,
          };
        },
        basic: runBasic,
      });
    } catch (error) {
      // rec_eng failed — fall back to basic without switching mode
      try {
        return await (searchService as any)._runBasicSearch(params);
      } catch (basicError) {
        console.error('Error in searchListings:', basicError);
        throw basicError;
      }
    }
  },

  async _runBasicSearch(params: SearchParams): Promise<SearchResults> {
    const {
      query = '',
      listing_type,
      category_ids = [],
      tag_ids = [],
      min_price,
      max_price,
      is_active = true,
      page = 1,
      page_size = 20,
    } = params;
    const offset = (page - 1) * page_size;
    const filteredIdSet = await fetchListingIdsByTaxonomy(category_ids, tag_ids);
    if (filteredIdSet && filteredIdSet.size === 0) {
      return { listings: [], categories: [], tags: [], total_count: 0 };
    }
    let listingsQuery = supabase
      .from('listings')
      .select('id, host_id, listing_type, title, description, is_active, price, created_at', { count: 'exact' });
    if (query.trim()) {
      const taxonomyIds = await fetchListingIdsByQueryTaxonomy(query);
      const idList = Array.from(taxonomyIds);
      if (idList.length > 0) {
        listingsQuery = listingsQuery.or(
          `title.ilike.%${query}%,description.ilike.%${query}%,id.in.(${idList.join(',')})`
        );
      } else {
        listingsQuery = listingsQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
      }
    }
    if (listing_type) listingsQuery = listingsQuery.eq('listing_type', listing_type);
    listingsQuery = listingsQuery.eq('is_active', is_active);
    if (min_price !== undefined) listingsQuery = listingsQuery.gte('price', min_price);
    if (max_price !== undefined) listingsQuery = listingsQuery.lte('price', max_price);
    if (filteredIdSet) listingsQuery = listingsQuery.in('id', Array.from(filteredIdSet));
    const { data: listings, error, count } = await listingsQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + page_size - 1);
    if (error) throw new Error(`Failed to search listings: ${error.message}`);
    const combined = await attachCategoriesAndTags((listings || []) as ListingRow[]);
    return { ...combined, total_count: count || 0 };
  },

  /**
   * Search by category only
   */
  async searchByCategory(
    categoryId: string,
    pagination?: { page?: number; page_size?: number }
  ): Promise<SearchResults> {
    return this.searchListings({
      category_ids: [categoryId],
      page: pagination?.page,
      page_size: pagination?.page_size,
      is_active: true,
    });
  },

  /**
   * Search by tag only
   */
  async searchByTag(
    tagId: string,
    pagination?: { page?: number; page_size?: number }
  ): Promise<SearchResults> {
    return this.searchListings({
      tag_ids: [tagId],
      page: pagination?.page,
      page_size: pagination?.page_size,
      is_active: true,
    });
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
  },
};
