import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../../lib/supabase';
import {
  enrichRecommendationListings,
  getShuffledListingIds,
  getListingsByIds,
} from '../../../services/listings.service';
import { RecommendationService } from '../../services/recommendationService';
import { getRecommendationModeStatus } from '../../services/recommendationGateway';
import { InteractionService } from '../../services/interactionService';
import burgundyTheme from '../../theme/burgundyTheme';
import ExploreCard from '../ExploreCard';
import { GridCardSkeleton } from '../shared/CardSkeleton';
import StayDetail from '../details/StayDetail';
import EventDetail from '../details/EventDetail';
import OfferingDetail from '../details/OfferingDetail';

const INITIAL_PAGE_SIZE = 18;
const LOAD_MORE_SIZE = 6;
const NUM_COLUMNS = 2;
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

export default function Explore({ onItemClick }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(!isCacheValid());
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [selectedListing, setSelectedListing] = useState(null);
  const [detailsType, setDetailsType] = useState(null);
  const [userId, setUserId] = useState(null);
  const [favoritedIds, setFavoritedIds] = useState(() => _cache.favIds);

  const shuffledIdsRef = useRef(_cache.shuffledIds);
  const loadedCountRef = useRef(_cache.loadedCount);
  const allRecListingsRef = useRef(_cache.allRec);

  useEffect(() => {
    initialLoad();
  }, []);

  const doFetch = async () => {
    setError(null);
    const { mode } = getRecommendationModeStatus();
    const { data: authData } = await supabase.auth.getUser();
    const uid = authData?.user?.id;
    if (uid) setUserId(uid);

    const favPromise = uid
      ? supabase.from('interactions').select('listing_id').eq('user_id', uid).gte('score', 5)
      : Promise.resolve({ data: [] });

    let finalListings = null;
    let finalAllRec = [];
    let finalShuffledIds = [];
    let finalLoadedCount = 0;
    let finalHasMore = true;

    if (mode === 'rec_eng' && uid) {
      const recListings = await RecommendationService.getExplore(uid);
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

  const initialLoad = async () => {
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
      await doFetch();
    } catch (err) {
      console.error('Error loading explore:', err);
      setError(err instanceof Error ? err.message : 'Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  const refresh = useCallback(async () => {
    setRefreshing(true);
    _cache.ts = 0;
    try {
      await doFetch();
    } catch (err) {
      console.error('Error refreshing explore:', err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleCardPress = useCallback((item) => {
    setSelectedListing(item);
    setDetailsType(item.listing_type);
    onItemClick?.(item);
    if (userId) {
      InteractionService.trackClick(userId, item.id).catch(() => {});
    }
  }, [userId, onItemClick]);

  const handleCloseDetails = useCallback(() => {
    setSelectedListing(null);
    setDetailsType(null);
  }, []);

  const handleInteractionAction = useCallback((actionId, listing) => {
    if (actionId === 'favorite') {
      setFavoritedIds(prev => {
        const next = new Set(prev);
        if (next.has(listing.id)) next.delete(listing.id); else next.add(listing.id);
        _cache.favIds = next;
        return next;
      });
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
      console.error('Error loading more explore:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const renderItem = useCallback(({ item }) => (
    <View style={styles.gridItem}>
      <ExploreCard
        item={item}
        onPress={() => handleCardPress(item)}
        isFavorited={favoritedIds.has(item.id)}
        onInteractionAction={handleInteractionAction}
      />
    </View>
  ), [favoritedIds, handleCardPress, handleInteractionAction]);

  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.skeletonRow}>
          <View style={styles.gridItem}><GridCardSkeleton /></View>
          <View style={styles.gridItem}><GridCardSkeleton /></View>
        </View>
      );
    }
    if (!hasMore && listings.length > 0) {
      return (
        <View style={styles.footer}>
          <Text style={styles.footerText}>All listings loaded</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={refresh}>
            <Ionicons name="refresh" size={15} color={burgundyTheme.colors.primary} />
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
        <View style={styles.skeletonRow}>
          <View style={styles.gridItem}><GridCardSkeleton /></View>
          <View style={styles.gridItem}><GridCardSkeleton /></View>
        </View>
        <View style={styles.skeletonRow}>
          <View style={styles.gridItem}><GridCardSkeleton /></View>
          <View style={styles.gridItem}><GridCardSkeleton /></View>
        </View>
        <View style={styles.skeletonRow}>
          <View style={styles.gridItem}><GridCardSkeleton /></View>
          <View style={styles.gridItem}><GridCardSkeleton /></View>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={initialLoad}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
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
          numColumns={NUM_COLUMNS}
          columnWrapperStyle={styles.row}
          ListFooterComponent={renderFooter}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.gridContent}
          extraData={favoritedIds}
          removeClippedSubviews
          maxToRenderPerBatch={6}
          windowSize={7}
          initialNumToRender={12}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={burgundyTheme.colors.primary}
              colors={[burgundyTheme.colors.primary]}
            />
          }
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: burgundyTheme.colors.background,
  },
  gridContent: {
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 80,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  gridItem: {
    flex: 1,
    marginHorizontal: 4,
  },
  skeletonRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 10,
    marginBottom: 10,
    marginTop: 8,
  },
  footer: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 12,
  },
  footerText: {
    fontSize: 13,
    color: burgundyTheme.colors.textSubtle,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: burgundyTheme.colors.primary,
  },
  refreshButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: burgundyTheme.colors.primary,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 14,
    color: burgundyTheme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: burgundyTheme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
