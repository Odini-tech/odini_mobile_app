import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '@/services/supabase/client';
import {
  getShuffledListingIds,
  getListingsByIds,
  getUserFavoriteListings,
  getListings,
  enrichRecommendationListings,
  fetchImagesForListings,
} from '@/services/listings.service';
import { ensureDailyListingMatchNotifications } from '@/services/notificationService';
import { RecommendationService } from '@/services/recommendationService';
import { getRecommendationModeStatus } from '@/services/recommendationGateway';
import { fetchVenuesForDash, VenueSummary } from '@/services/venueService';

const INITIAL_COUNT = 12;
const BATCH_SIZE = 6;

export interface AppListing {
  id: string;
  host_id?: string;
  listing_type: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  price?: number | null;
  is_active?: boolean;
  created_at?: string;
  location?: string | null;
  profiles?: any;
  stays?: any;
  events?: any;
  offering?: any;
  [key: string]: any;
}

interface SearchCategory {
  id: string;
  name: string;
  image_url?: string | null;
  collection_image_url?: string | null;
  count?: number;
}

interface CategoryMix {
  id: string;
  title: string;
  reason: string;
  items: AppListing[];
}

interface AppDataState {
  // Explore
  listings: AppListing[];
  allShuffledIds: string[];
  allRecListings: AppListing[];
  hasMore: boolean;
  favoritedIds: Set<string>;

  // Dash
  favoritePlaces: AppListing[];
  upcomingEvents: AppListing[];
  madeForYou: AppListing[];
  categoryMixes: CategoryMix[];
  venues: VenueSummary[];
  pastBookings: any[];
  collections: any[];

  // Search
  popularCategories: SearchCategory[];
  personalCategories: SearchCategory[];

  // Meta
  userId: string | null;
  userName: string;
  progress: number;
  isReady: boolean;
  dashReady: boolean;
}

interface AppDataContextValue extends AppDataState {
  refresh: () => Promise<void>;
  loadMoreListings: () => Promise<AppListing[]>;
  updateFavoritedId: (id: string, favorited: boolean) => void;
}

const defaultState: AppDataState = {
  listings: [],
  allShuffledIds: [],
  allRecListings: [],
  hasMore: true,
  favoritedIds: new Set(),
  favoritePlaces: [],
  upcomingEvents: [],
  madeForYou: [],
  categoryMixes: [],
  venues: [],
  pastBookings: [],
  collections: [],
  popularCategories: [],
  personalCategories: [],
  userId: null,
  userName: 'there',
  progress: 0,
  isReady: false,
  dashReady: false,
};

const AppDataContext = createContext<AppDataContextValue>({
  ...defaultState,
  refresh: async () => {},
  loadMoreListings: async () => [],
  updateFavoritedId: () => {},
});

export function useAppData() {
  return useContext(AppDataContext);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppDataState>(defaultState);
  const loadedCountRef = useRef(0);
  const isFetchingRef = useRef(false);

  const doFetch = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      // isReady/dashReady are left as-is so a pull-to-refresh keeps the current
      // content on screen instead of dropping back to skeletons.
      setState((prev) => ({ ...prev, progress: 2 }));

      // getSession reads the stored session locally; getUser would be an extra
      // network round-trip before anything else could start.
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData?.session?.user?.id ?? null;
      setState((prev) => ({ ...prev, userId: uid }));

      // Fire-and-forget: seeds today's 2 random listing-match notifications if not already done.
      if (uid) ensureDailyListingMatchNotifications(uid).catch(() => undefined);

      // Everything below starts at once and merges into state as it lands, so
      // no section waits on an unrelated (or slow) request.

      // Explore: first page of shuffled listings — the only thing isReady waits on.
      const listingsPromise = getShuffledListingIds()
        .then(async (shuffledIds: string[]) => {
          const listings = (await getListingsByIds(shuffledIds.slice(0, INITIAL_COUNT))) as AppListing[];
          loadedCountRef.current = listings.length;
          setState((prev) => ({
            ...prev,
            listings,
            allShuffledIds: shuffledIds,
            hasMore: shuffledIds.length > INITIAL_COUNT,
            upcomingEvents: listings.filter((l) => l.listing_type === 'event').slice(0, 6),
            progress: Math.max(prev.progress, 60),
            isReady: true,
          }));
          return { shuffledIds, listings };
        })
        .catch((err) => {
          console.error('AppDataContext listings error:', err);
          setState((prev) => ({ ...prev, isReady: true }));
          return { shuffledIds: [] as string[], listings: [] as AppListing[] };
        });

      const profilePromise = uid
        ? Promise.resolve(
            supabase.from('profiles').select('firstname, username').eq('id', uid).maybeSingle()
          ).then(({ data: profile }) => {
            setState((prev) => ({
              ...prev,
              userName: profile?.firstname || profile?.username || 'there',
            }));
          })
        : Promise.resolve();

      const favoritesPromise: Promise<AppListing[]> = (uid ? getUserFavoriteListings(uid) : Promise.resolve([]))
        .then((favoritePlaces: AppListing[]) => {
          setState((prev) => ({
            ...prev,
            favoritePlaces,
            favoritedIds: new Set(favoritePlaces.map((l) => l.id)),
          }));
          return favoritePlaces;
        })
        .catch(() => [] as AppListing[]);

      const bookingsPromise = uid
        ? Promise.resolve(
            supabase
              .from('bookings')
              .select(
                'id, booking_ref, listing_type, status, check_in, event_slot, reservation_time, created_at, listings!listing_id(id, title, listing_type)'
              )
              .eq('user_id', uid)
              .in('status', ['pending', 'confirmed', 'completed'])
              .order('created_at', { ascending: false })
              .limit(10)
          )
            .then(async ({ data }) => {
              const rawPastBookings: any[] = data ?? [];
              // listings has no image_url column — images live in stay_images/event_images/offering_images
              const bookingImageMap = await fetchImagesForListings(
                rawPastBookings.map((b) => b.listings).filter(Boolean)
              );
              const pastBookings = rawPastBookings.map((b) => ({
                ...b,
                listings: b.listings ? { ...b.listings, image_url: bookingImageMap.get(b.listings.id) || null } : null,
              }));
              setState((prev) => ({ ...prev, pastBookings }));
            })
            .catch(() => undefined)
        : Promise.resolve();

      const collectionsPromise = fetchPersonalizedHeroCollections(uid).then((collections) =>
        setState((prev) => ({ ...prev, collections }))
      );

      // Dash shows its skeleton until its own quick Supabase reads are in —
      // it no longer waits on the explore listings or the rec engine.
      Promise.allSettled([profilePromise, favoritesPromise, bookingsPromise, collectionsPromise]).then(() =>
        setState((prev) => ({ ...prev, dashReady: true }))
      );

      // Made For You: rec engine when available, otherwise favorites + explore picks.
      const { mode } = getRecommendationModeStatus();
      const recPromise: Promise<AppListing[]> =
        mode === 'rec_eng' && uid
          ? RecommendationService.getForYou(uid)
              .then((recs) => (recs.length ? enrichRecommendationListings(recs) : []))
              .catch(() => [])
          : Promise.resolve([]);

      let recLanded = false;
      recPromise.then((recListings) => {
        if (!recListings.length) return;
        recLanded = true;
        setState((prev) => ({ ...prev, madeForYou: recListings }));
      });

      Promise.all([listingsPromise, favoritesPromise]).then(([{ listings }, favoritePlaces]) => {
        if (recLanded) return;
        const madeForYou =
          uid && favoritePlaces.length > 0
            ? [...favoritePlaces.slice(0, 2), ...listings.slice(0, 4)]
            : listings.slice(0, 6);
        setState((prev) => ({ ...prev, madeForYou }));
      });

      // ── Background: non-critical sections ──
      fetchVenuesForDash(8)
        .then((venues) => setState((prev) => ({ ...prev, venues })))
        .catch(() => undefined);

      if (mode === 'rec_eng') {
        RecommendationService.getMixes()
          .then((mixes) =>
            Promise.all(
              mixes.map(async (mix) => ({
                id: mix.id,
                title: mix.title,
                reason: mix.reason,
                items: await enrichRecommendationListings(
                  mix.items.map((item) => ({ id: item.id, score: item.score }))
                ),
              }))
            )
          )
          .then((enrichedMixes) => enrichedMixes.filter((m) => m.items.length > 0))
          .then((categoryMixes) => setState((prev) => ({ ...prev, categoryMixes })))
          .catch(() => undefined);
      }

      // Search-tab data: scans whole tables, so it never blocks the home screen.
      fetchPopularCategories().then((popularCategories) =>
        setState((prev) => ({ ...prev, popularCategories }))
      );
      if (uid) {
        fetchPersonalCategories(uid).then((personalCategories) =>
          setState((prev) => ({ ...prev, personalCategories }))
        );
      }

      listingsPromise.then(({ shuffledIds }) =>
        getListingsByIds(shuffledIds.slice(INITIAL_COUNT, INITIAL_COUNT + BATCH_SIZE))
          .then((secondBatch: AppListing[]) => {
            loadedCountRef.current = INITIAL_COUNT + secondBatch.length;
            setState((prev) => ({ ...prev, listings: [...prev.listings, ...secondBatch] }));
          })
          .catch(() => undefined)
      );

      // Resolve (for pull-to-refresh) once the visible sections are in.
      await Promise.allSettled([listingsPromise, favoritesPromise, bookingsPromise, collectionsPromise]);
      setState((prev) => ({ ...prev, progress: 100 }));
    } catch (err) {
      console.error('AppDataContext prefetch error:', err);
      // Still mark ready so the app doesn't hang
      setState((prev) => ({ ...prev, progress: 100, isReady: true, dashReady: true }));
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  // Safety: force ready after 5s max
  useEffect(() => {
    const t = setTimeout(() => {
      setState((prev) => {
        if (!prev.isReady || !prev.dashReady) return { ...prev, progress: 100, isReady: true, dashReady: true };
        return prev;
      });
    }, 5000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    doFetch();
  }, [doFetch]);

  const refresh = useCallback(async () => {
    loadedCountRef.current = 0;
    setState((prev) => ({ ...prev, progress: 0 }));
    await doFetch();
  }, [doFetch]);

  const loadMoreListings = useCallback(async (): Promise<AppListing[]> => {
    const { allShuffledIds, allRecListings } = state;
    const start = loadedCountRef.current;

    if (allRecListings.length > 0) {
      const next = allRecListings.slice(start, start + BATCH_SIZE) as AppListing[];
      if (!next.length) return [];
      loadedCountRef.current = start + next.length;
      setState((prev) => ({
        ...prev,
        listings: [...prev.listings, ...next],
        hasMore: loadedCountRef.current < allRecListings.length,
      }));
      return next;
    }

    const nextIds = allShuffledIds.slice(start, start + BATCH_SIZE);
    if (!nextIds.length) {
      setState((prev) => ({ ...prev, hasMore: false }));
      return [];
    }
    const data = (await getListingsByIds(nextIds)) as AppListing[];
    loadedCountRef.current = start + nextIds.length;
    setState((prev) => ({
      ...prev,
      listings: [...prev.listings, ...data],
      hasMore: loadedCountRef.current < allShuffledIds.length,
    }));
    return data;
  }, [state]);

  const updateFavoritedId = useCallback((id: string, favorited: boolean) => {
    setState((prev) => {
      const next = new Set(prev.favoritedIds);
      if (favorited) next.add(id); else next.delete(id);
      return { ...prev, favoritedIds: next };
    });
  }, []);

  return (
    <AppDataContext.Provider value={{ ...state, refresh, loadMoreListings, updateFavoritedId }}>
      {children}
    </AppDataContext.Provider>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────────

async function fetchPopularCategories(): Promise<SearchCategory[]> {
  try {
    const [{ data: catListings }, { data: bookings }, { data: allCats }] = await Promise.all([
      supabase.from('category_listings').select('listing_id, categories(id, name, image_url, collection_image_url)'),
      supabase.from('bookings').select('listing_id'),
      supabase.from('categories').select('id, name, image_url, collection_image_url'),
    ]);

    if (!catListings) return [];

    const bookingCountByListing: Record<string, number> = {};
    (bookings || []).forEach((b) => {
      bookingCountByListing[b.listing_id] = (bookingCountByListing[b.listing_id] || 0) + 1;
    });

    const catMap: Record<string, SearchCategory & { count: number }> = {};
    catListings.forEach((cl: any) => {
      const cat = cl.categories;
      if (!cat) return;
      catMap[cat.id] = catMap[cat.id] || { ...cat, count: 0 };
      catMap[cat.id].count += bookingCountByListing[cl.listing_id] || 0;
    });

    const ranked = Object.values(catMap).sort((a, b) => b.count - a.count);
    const topFive = ranked.slice(0, 5);
    const topIds = new Set(topFive.map((c) => c.id));
    const pool = (allCats || []).filter((c: any) => !topIds.has(c.id));
    const wildcard = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null;
    const combined = wildcard ? [...topFive, wildcard] : topFive;
    return shuffle(combined);
  } catch {
    return [];
  }
}

async function fetchPersonalCategories(uid: string): Promise<SearchCategory[]> {
  try {
    const { data: userBookings } = await supabase
      .from('bookings')
      .select('listing_id')
      .eq('user_id', uid);

    const userListingIds = Array.from(new Set((userBookings || []).map((b: any) => b.listing_id)));
    if (!userListingIds.length) return [];

    const { data: catListings } = await supabase
      .from('category_listings')
      .select('listing_id, categories(id, name, image_url, collection_image_url)')
      .in('listing_id', userListingIds);

    const categoryCount: Record<string, SearchCategory & { count: number }> = {};
    (catListings || []).forEach((cl: any) => {
      const cat = cl.categories;
      if (!cat) return;
      categoryCount[cat.id] = categoryCount[cat.id] || { ...cat, count: 0 };
      categoryCount[cat.id].count += 1;
    });

    const personal = Object.values(categoryCount).sort((a, b) => b.count - a.count);
    return shuffle(personal.slice(0, 6));
  } catch {
    return [];
  }
}

interface HeroCollection {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  collection_image_url: string | null;
}

/**
 * Hero carousel content, ranked by each user's own interaction history
 * (via category_listings) instead of raw popularity, with a randomized
 * weighted draw so the order — and which categories make the cut — varies
 * between opens instead of showing the same lineup every time.
 */
async function fetchPersonalizedHeroCollections(uid: string | null): Promise<HeroCollection[]> {
  try {
    const { data: allCats } = await supabase
      .from('categories')
      .select('id, name, description, image_url, collection_image_url');
    if (!allCats?.length) return [];

    const affinity: Record<string, number> = {};
    if (uid) {
      const { data: interactions } = await supabase
        .from('interactions')
        .select('listing_id, score')
        .eq('user_id', uid)
        .not('listing_id', 'is', null)
        .gte('score', 1)
        .order('updated_at', { ascending: false })
        .limit(100);

      const listingIds = Array.from(new Set((interactions || []).map((i: any) => i.listing_id)));
      if (listingIds.length) {
        const scoreByListing = new Map((interactions || []).map((i: any) => [i.listing_id, i.score]));
        const { data: catListings } = await supabase
          .from('category_listings')
          .select('listing_id, category_id')
          .in('listing_id', listingIds);

        (catListings || []).forEach((cl: any) => {
          const score = scoreByListing.get(cl.listing_id) || 0;
          affinity[cl.category_id] = (affinity[cl.category_id] || 0) + score;
        });
      }
    }

    // Weighted-random draw (exponential keys): categories the user engages
    // with more get a smaller (better) key more often, but every category —
    // including ones with no signal yet — stays eligible via the +1 floor.
    const drawn = allCats
      .map((cat: any) => {
        const weight = 1 + (affinity[cat.id] || 0);
        const key = -Math.log(Math.random()) / weight;
        return { cat, key };
      })
      .sort((a, b) => a.key - b.key)
      .slice(0, 5)
      .map(({ cat }) => ({
        id: cat.id,
        title: cat.name,
        description: cat.description || 'Curated picks for you',
        image_url: cat.image_url,
        collection_image_url: cat.collection_image_url,
      }));

    return drawn;
  } catch {
    return [];
  }
}
