import { supabase } from '@/services/supabase/client';
import type { GuideIntent } from '@/features/chat/utils/guideNlp';
import { popularTodayService } from './popularTodayService';
import { searchService, SearchListing } from './searchService';

export interface GuideResult {
  headline: string;
  listings: SearchListing[];
}

const PAGE_SIZE = 5;

async function fetchTrending(): Promise<SearchListing[]> {
  const res = await popularTodayService.getPopularToday({ page: 1, page_size: PAGE_SIZE });
  return res.listings;
}

async function fetchEventsInRange(start: Date, end: Date, limit: number): Promise<SearchListing[]> {
  const { data, error } = await supabase
    .from('listings')
    .select('id, host_id, listing_type, title, description, is_active, price, created_at, events!inner(event_time)')
    .eq('listing_type', 'event')
    .eq('is_active', true)
    .gte('events.event_time', start.toISOString())
    .lt('events.event_time', end.toISOString())
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    host_id: row.host_id,
    listing_type: row.listing_type,
    title: row.title,
    description: row.description,
    is_active: row.is_active,
    price: row.price,
    created_at: row.created_at,
    categories: [],
    tags: [],
  }));
}

export const guideService = {
  async getTrending(): Promise<GuideResult> {
    return {
      headline: "Here's what everyone's talking about right now",
      listings: await fetchTrending(),
    };
  },

  async getRecommendations(intent: GuideIntent): Promise<GuideResult> {
    const { keywords, listingType, dateHint } = intent;

    if (dateHint && listingType !== 'stay' && listingType !== 'offering') {
      try {
        const eventListings = await fetchEventsInRange(dateHint.start, dateHint.end, PAGE_SIZE);
        if (eventListings.length > 0) {
          return { headline: `Here's what's on ${dateHint.label}`, listings: eventListings };
        }
      } catch (err) {
        console.error('guideService: date-scoped event lookup failed', err);
      }

      if (keywords.length === 0) {
        return {
          headline: `Nothing on the calendar for ${dateHint.label} yet — here's what's trending instead`,
          listings: await fetchTrending(),
        };
      }
    }

    for (const keyword of keywords) {
      try {
        const res = await searchService.searchListings({
          query: keyword,
          listing_type: listingType || undefined,
          page: 1,
          page_size: PAGE_SIZE,
        });
        if (res.listings.length > 0) {
          return { headline: `Here's what's buzzing for "${keyword}"`, listings: res.listings };
        }
      } catch (err) {
        console.error('guideService: keyword search failed', keyword, err);
      }
    }

    if (listingType) {
      try {
        const res = await searchService.searchListings({ listing_type: listingType, page: 1, page_size: PAGE_SIZE });
        if (res.listings.length > 0) {
          return {
            headline: `Top ${listingType === 'offering' ? 'activities' : `${listingType}s`} right now`,
            listings: res.listings,
          };
        }
      } catch (err) {
        console.error('guideService: listing type search failed', err);
      }
    }

    return {
      headline: "Here's what everyone's talking about right now",
      listings: await fetchTrending(),
    };
  },
};
