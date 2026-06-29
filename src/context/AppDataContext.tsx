import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  getShuffledListingIds,
  getListingsByIds,
  getUserFavoriteListings,
  getUserRecentlyViewedListings,
  getListings,
  enrichRecommendationListings,
} from '../../services/listings.service';
import { RecommendationService } from '../services/recommendationService';
import { getRecommendationModeStatus } from '../services/recommendationGateway';

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
  count?: number;
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
  recentlyViewed: AppListing[];
  upcomingEvents: AppListing[];
  madeForYou: AppListing[];
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
  recentlyViewed: [],
  upcomingEvents: [],
  madeForYou: [],
  pastBookings: [],
  collections: [],
  popularCategories: [],
  personalCategories: [],
  userId: null,
  userName: 'there',
  progress: 0,
  isReady: false,
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

  const setProgress = (p: number) =>
    setState((prev) => ({ ...prev, progress: Math.min(100, Math.max(prev.progress, p)) }));

  const doFetch = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      setState((prev) => ({ ...prev, progress: 2, isReady: false }));

      // ── Phase 1: auth + listing IDs (parallel, no blocking) ──
      const [authResult, idsResult] = await Promise.allSettled([
        supabase.auth.getUser(),
        getShuffledListingIds(),
      ]);

      setProgress(12);

      const uid =
        authResult.status === 'fulfilled' ? authResult.value.data?.user?.id ?? null : null;
      const shuffledIds: string[] =
        idsResult.status === 'fulfilled' ? idsResult.value : [];

      // ── Phase 2: first 12 listings + user profile (parallel) ──
      const firstIds = shuffledIds.slice(0, INITIAL_COUNT);
      const [firstListings, profileResult] = await Promise.allSettled([
        getListingsByIds(firstIds),
        uid
          ? supabase
              .from('profiles')
              .select('firstname, username')
              .eq('id', uid)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      setProgress(42);

      const listings: AppListing[] =
        firstListings.status === 'fulfilled' ? (firstListings.value as AppListing[]) : [];
      loadedCountRef.current = listings.length;

      const profile =
        profileResult.status === 'fulfilled' ? (profileResult.value as any)?.data : null;
      const userName =
        profile?.firstname || profile?.username || 'there';

      setState((prev) => ({
        ...prev,
        listings,
        allShuffledIds: shuffledIds,
        hasMore: shuffledIds.length > INITIAL_COUNT,
        userId: uid,
        userName,
        progress: 42,
      }));

      // ── Phase 3: personalized dash data + search categories (parallel) ──
      const [
        favResult,
        recentResult,
        bookingsResult,
        popCatResult,
        recModeListings,
      ] = await Promise.allSettled([
        uid ? getUserFavoriteListings(uid) : Promise.resolve([]),
        uid ? getUserRecentlyViewedListings(uid, 8) : Promise.resolve([]),
        uid
          ? supabase
              .from('bookings')
              .select(
                'id, booking_ref, listing_type, status, check_in, event_slot, reservation_time, created_at, listings(id, title, listing_type, image_url)'
              )
              .eq('user_id', uid)
              .order('created_at', { ascending: false })
              .limit(10)
          : Promise.resolve({ data: [] }),
        fetchPopularCategories(),
        (() => {
          const { mode } = getRecommendationModeStatus();
          if (mode === 'rec_eng' && uid) {
            return RecommendationService.getForYou(uid)
              .then((recs) => (recs.length ? enrichRecommendationListings(recs) : []))
              .catch(() => []);
          }
          return Promise.resolve([]);
        })(),
      ]);

      setProgress(72);

      const favoritePlaces: AppListing[] =
        favResult.status === 'fulfilled' ? (favResult.value as AppListing[]) : [];
      const recentlyViewed: AppListing[] =
        recentResult.status === 'fulfilled' ? (recentResult.value as AppListing[]) : [];
      const pastBookings: any[] =
        bookingsResult.status === 'fulfilled'
          ? ((bookingsResult.value as any)?.data ?? [])
          : [];
      const popularCategories: SearchCategory[] =
        popCatResult.status === 'fulfilled' ? popCatResult.value : [];
      const recListings: AppListing[] =
        recModeListings.status === 'fulfilled' ? recModeListings.value : [];

      const upcomingEvents = listings.filter((l) => l.listing_type === 'event').slice(0, 6);
      const madeForYou: AppListing[] =
        recListings.length > 0
          ? recListings
          : uid && favoritePlaces.length > 0
          ? [...favoritePlaces.slice(0, 2), ...listings.slice(0, 4)]
          : listings.slice(0, 6);

      const favoritedIds = new Set(favoritePlaces.map((l) => l.id));

      setState((prev) => ({
        ...prev,
        favoritePlaces,
        recentlyViewed,
        upcomingEvents,
        madeForYou,
        pastBookings,
        popularCategories,
        favoritedIds,
        progress: 72,
      }));

      // ── Phase 4: personal search categories + second batch of listings (parallel) ──
      const [persCatResult, secondBatchResult] = await Promise.allSettled([
        uid ? fetchPersonalCategories(uid) : Promise.resolve([]),
        getListingsByIds(shuffledIds.slice(INITIAL_COUNT, INITIAL_COUNT + BATCH_SIZE)),
      ]);

      setProgress(94);

      const personalCategories: SearchCategory[] =
        persCatResult.status === 'fulfilled' ? persCatResult.value : [];
      const secondBatch: AppListing[] =
        secondBatchResult.status === 'fulfilled'
          ? (secondBatchResult.value as AppListing[])
          : [];

      loadedCountRef.current = INITIAL_COUNT + secondBatch.length;

      setState((prev) => ({
        ...prev,
        listings: [...prev.listings, ...secondBatch],
        personalCategories,
        progress: 100,
        isReady: true,
      }));
    } catch (err) {
      console.error('AppDataContext prefetch error:', err);
      // Still mark ready so the app doesn't hang
      setState((prev) => ({ ...prev, progress: 100, isReady: true }));
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  // Safety: force ready after 5s max
  useEffect(() => {
    const t = setTimeout(() => {
      setState((prev) => {
        if (!prev.isReady) return { ...prev, progress: 100, isReady: true };
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
    setState((prev) => ({ ...prev, progress: 0, isReady: false }));
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
      supabase.from('category_listings').select('listing_id, categories(id, name, image_url)'),
      supabase.from('bookings').select('listing_id'),
      supabase.from('categories').select('id, name, image_url'),
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
      .select('listing_id, categories(id, name, image_url)')
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
