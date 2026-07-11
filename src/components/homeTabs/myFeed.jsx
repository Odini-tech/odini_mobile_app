import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { supabase } from "../../../lib/supabase";
import {
  enrichRecommendationListings,
  getShuffledListingIds,
  getListingsByIds,
} from "../../../services/listings.service";
import { useBottomNavScroll } from "../../context/BottomNavVisibilityContext";
import { RecommendationService } from "../../services/recommendationService";
import { getRecommendationModeStatus } from "../../services/recommendationGateway";
import { InteractionService } from "../../services/interactionService";
import { useAppMode } from "../../context/AppModeContext";
import ListingCard from "../cards";
import { FeedCardSkeleton } from "../shared/CardSkeleton";
import EventDetail from "../details/EventDetail";
import OfferingDetail from "../details/OfferingDetail";
import StayDetail from "../details/StayDetail";

const INITIAL_PAGE_SIZE = 18;
const LOAD_MORE_SIZE = 6;
const CACHE_TTL = 5 * 60 * 1000;

const _cache = {
  listings: null,
  allRec: [],
  shuffledIds: [],
  loadedCount: 0,
  hasMore: true,
  favIds: new Set(),
  ts: 0,
};

function isCacheValid() {
  return _cache.listings !== null && Date.now() - _cache.ts < CACHE_TTL;
}

export function ForYouPage({ onEventClick }) {
  const { theme } = useAppMode();
  const styles = getStyles(theme);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(!isCacheValid());
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [selectedListing, setSelectedListing] = useState(null);
  const [detailsType, setDetailsType] = useState(null);
  const [favoritedIds, setFavoritedIds] = useState(() => _cache.favIds);

  const shuffledIdsRef = useRef(_cache.shuffledIds);
  const loadedCountRef = useRef(_cache.loadedCount);
  const allRecListingsRef = useRef(_cache.allRec);
  const detailRequestRef = useRef(null);
  const bottomNavScroll = useBottomNavScroll();

  useEffect(() => {
    const status = getRecommendationModeStatus();
    initialLoad(status.mode);
  }, []);

  const doFetch = async (mode) => {
    setError(null);
    const { data: authData } = await supabase.auth.getUser();
    const uid = authData?.user?.id;

    const favPromise = uid
      ? supabase.from('interactions').select('listing_id').eq('user_id', uid).gte('score', 5)
      : Promise.resolve({ data: [] });

    let finalListings = null;
    let finalAllRec = [];
    let finalShuffledIds = [];
    let finalLoadedCount = 0;
    let finalHasMore = true;

    if (mode === 'rec_eng' && uid) {
      const recListings = await RecommendationService.getForYou(uid);
      if (recListings.length > 0) {
        const enriched = await enrichRecommendationListings(recListings);
        if (enriched.length > 0) {
          finalAllRec = enriched;
          finalListings = enriched.slice(0, INITIAL_PAGE_SIZE);
          finalLoadedCount = finalListings.length;
          finalHasMore = enriched.length > INITIAL_PAGE_SIZE;
        }
      }
    }

    if (!finalListings) {
      const ids = await getShuffledListingIds();
      finalShuffledIds = ids;
      finalListings = await getListingsByIds(ids.slice(0, INITIAL_PAGE_SIZE));
      finalLoadedCount = Math.min(ids.length, INITIAL_PAGE_SIZE);
      finalHasMore = ids.length > INITIAL_PAGE_SIZE;
    }

    const favResult = await favPromise;
    const favSet = new Set((favResult.data || []).map(r => r.listing_id));

    shuffledIdsRef.current = finalShuffledIds;
    allRecListingsRef.current = finalAllRec;
    loadedCountRef.current = finalLoadedCount;

    setListings(finalListings);
    setHasMore(finalHasMore);
    setFavoritedIds(favSet);

    _cache.listings = finalListings;
    _cache.allRec = finalAllRec;
    _cache.shuffledIds = finalShuffledIds;
    _cache.loadedCount = finalLoadedCount;
    _cache.hasMore = finalHasMore;
    _cache.favIds = favSet;
    _cache.ts = Date.now();
  };

  const initialLoad = async (mode) => {
    if (isCacheValid()) {
      shuffledIdsRef.current = _cache.shuffledIds;
      allRecListingsRef.current = _cache.allRec;
      loadedCountRef.current = _cache.loadedCount;
      setListings(_cache.listings);
      setHasMore(_cache.hasMore);
      setFavoritedIds(_cache.favIds);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      await doFetch(mode);
    } catch (err) {
      console.error("Error loading feed:", err);
      setError(err.message || "Failed to load listings");
    } finally {
      setLoading(false);
    }
  };

  const refresh = useCallback(async () => {
    const mode = getRecommendationModeStatus().mode;
    setRefreshing(true);
    _cache.ts = 0;
    try {
      await doFetch(mode);
    } catch (err) {
      console.error('Error refreshing feed:', err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      if (allRecListingsRef.current.length > 0) {
        const start = loadedCountRef.current;
        const next = allRecListingsRef.current.slice(start, start + LOAD_MORE_SIZE);
        if (next.length === 0) { setHasMore(false); _cache.hasMore = false; return; }
        loadedCountRef.current = start + next.length;
        setListings(prev => {
          const updated = [...prev, ...next];
          _cache.listings = updated;
          _cache.loadedCount = loadedCountRef.current;
          _cache.hasMore = loadedCountRef.current < allRecListingsRef.current.length;
          return updated;
        });
        setHasMore(loadedCountRef.current < allRecListingsRef.current.length);
        return;
      }
      const start = loadedCountRef.current;
      const nextIds = shuffledIdsRef.current.slice(start, start + LOAD_MORE_SIZE);
      if (nextIds.length === 0) { setHasMore(false); _cache.hasMore = false; return; }
      const data = await getListingsByIds(nextIds);
      loadedCountRef.current = start + nextIds.length;
      setListings(prev => {
        const updated = [...prev, ...data];
        _cache.listings = updated;
        _cache.loadedCount = loadedCountRef.current;
        _cache.hasMore = loadedCountRef.current < shuffledIdsRef.current.length;
        return updated;
      });
      setHasMore(loadedCountRef.current < shuffledIdsRef.current.length);
    } catch (err) {
      console.error("Error loading more:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleCardPress = async (listing) => {
    detailRequestRef.current = listing.id;
    setDetailsType(listing.listing_type);
    setSelectedListing(listing);
    onEventClick?.(listing);

    const { data: authData } = await supabase.auth.getUser().catch(() => ({ data: null }));
    const uid = authData?.user?.id;
    if (uid) {
      // InteractionService writes to Supabase and (in rec_eng mode) best-effort
      // pushes the same signal to the engine — no need to also call
      // RecommendationService.recordInteraction here, that'd just double-post.
      InteractionService.trackClick(uid, listing.id).catch(() => {});
    }

    try {
      const { getListingById } = await import("../../../services/listings.service");
      const detailed = await getListingById(listing.id);
      if (detailRequestRef.current !== listing.id) return;
      if (detailed) setSelectedListing(detailed);
    } catch (err) {
      console.error("Error loading listing details:", err);
    }
  };

  const handleCloseDetails = useCallback(() => {
    detailRequestRef.current = null;
    setSelectedListing(null);
    setDetailsType(null);
  }, []);

  const handleInteractionAction = useCallback((actionId, listing) => {
    if (actionId === 'hide' || actionId === 'dislike') {
      setListings(prev => {
        const updated = prev.filter(l => l.id !== listing.id);
        _cache.listings = updated;
        return updated;
      });
      allRecListingsRef.current = allRecListingsRef.current.filter(l => l.id !== listing.id);
      _cache.allRec = allRecListingsRef.current;
    } else if (actionId === 'favorite') {
      setFavoritedIds(prev => {
        const next = new Set(prev);
        if (next.has(listing.id)) next.delete(listing.id); else next.add(listing.id);
        _cache.favIds = next;
        return next;
      });
    }
  }, []);

  const renderItem = useCallback(({ item }) => (
    <ListingCard
      item={item}
      onPress={() => handleCardPress(item)}
      isFavorited={favoritedIds.has(item.id)}
      onInteractionAction={handleInteractionAction}
    />
  ), [favoritedIds, handleInteractionAction]);

  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.loadingMoreRow}>
          <Text style={styles.loadingMoreText}>Loading more…</Text>
        </View>
      );
    }
    if (!hasMore && listings.length > 0) {
      return (
        <View style={styles.footer}>
          <Text style={styles.footerText}>You're all caught up</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={refresh}>
            <Ionicons name="refresh" size={15} color={theme.colors.primary} />
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <FeedCardSkeleton />
        <FeedCardSkeleton />
        <FeedCardSkeleton />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.centerBox}>
          <Text style={styles.errorTitle}>Oops!</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => initialLoad(getRecommendationModeStatus().mode)}
          >
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!listings.length) {
    return (
      <View style={styles.container}>
        <View style={styles.centerBox}>
          <Text style={styles.emptyTitle}>No listings yet</Text>
          <Text style={styles.emptyText}>Check back soon for new stays, events, and offerings</Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        <FlatList
          data={listings}
          keyExtractor={(item) => String(item?.id)}
          renderItem={renderItem}
          ListFooterComponent={renderFooter}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 80 }}
          extraData={favoritedIds}
          removeClippedSubviews
          maxToRenderPerBatch={4}
          windowSize={7}
          initialNumToRender={6}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
          {...bottomNavScroll}
        />
      </View>
      {selectedListing && detailsType === 'stay' && (
        <StayDetail listing={selectedListing} onClose={handleCloseDetails} />
      )}
      {selectedListing && detailsType === 'event' && (
        <EventDetail listing={selectedListing} onClose={handleCloseDetails} />
      )}
      {selectedListing && detailsType === 'offering' && (
        <OfferingDetail listing={selectedListing} onClose={handleCloseDetails} />
      )}
    </>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  footer: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 12,
  },
  footerText: {
    fontSize: 13,
    color: theme.colors.textSubtle,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  refreshButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  loadingMoreRow: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingMoreText: {
    fontSize: 13,
    color: theme.colors.textSubtle,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});
