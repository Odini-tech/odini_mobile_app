import { useEffect, useRef, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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
import burgundyTheme from "../../theme/burgundyTheme";
import ListingCard from "../cards";
import { FeedCardSkeleton } from "../shared/CardSkeleton";
import EventDetail from "../details/EventDetail";
import OfferingDetail from "../details/OfferingDetail";
import StayDetail from "../details/StayDetail";

const PAGE_SIZE = 6;

export function ForYouPage({ onEventClick }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [selectedListing, setSelectedListing] = useState(null);
  const [detailsType, setDetailsType] = useState(null);
  const [recMode, setRecMode] = useState('basic');

  // For basic mode: store shuffled IDs, track which we've loaded
  const shuffledIdsRef = useRef([]);
  const loadedCountRef = useRef(0);
  // For rec_eng mode: store all enriched results, page through them locally
  const allRecListingsRef = useRef([]);
  const detailRequestRef = useRef(null);
  const bottomNavScroll = useBottomNavScroll();

  useEffect(() => {
    const status = getRecommendationModeStatus();
    setRecMode(status.mode);
    initialLoad(status.mode);
  }, []);

  const initialLoad = async (mode) => {
    try {
      setLoading(true);
      setError(null);

      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;

      if (mode === 'rec_eng' && userId) {
        const recListings = await RecommendationService.getForYou(userId);
        if (recListings.length > 0) {
          const enriched = await enrichRecommendationListings(recListings);
          if (enriched.length > 0) {
            allRecListingsRef.current = enriched;
            const first = enriched.slice(0, PAGE_SIZE);
            loadedCountRef.current = first.length;
            setListings(first);
            setHasMore(enriched.length > PAGE_SIZE);
            return;
          }
        }
      }

      // Basic mode: shuffle IDs, load first page
      const ids = await getShuffledListingIds();
      shuffledIdsRef.current = ids;
      const firstBatch = ids.slice(0, PAGE_SIZE);
      const data = await getListingsByIds(firstBatch);
      loadedCountRef.current = firstBatch.length;
      setListings(data);
      setHasMore(ids.length > PAGE_SIZE);
    } catch (err) {
      console.error("Error loading feed:", err);
      setError(err.message || "Failed to load listings");
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      // rec_eng mode: page through the already-fetched list
      if (allRecListingsRef.current.length > 0) {
        const start = loadedCountRef.current;
        const next = allRecListingsRef.current.slice(start, start + PAGE_SIZE);
        if (next.length === 0) { setHasMore(false); return; }
        loadedCountRef.current = start + next.length;
        setListings((prev) => [...prev, ...next]);
        setHasMore(loadedCountRef.current < allRecListingsRef.current.length);
        return;
      }

      // Basic mode: fetch next batch of IDs from Supabase
      const start = loadedCountRef.current;
      const nextIds = shuffledIdsRef.current.slice(start, start + PAGE_SIZE);
      if (nextIds.length === 0) { setHasMore(false); return; }
      const data = await getListingsByIds(nextIds);
      loadedCountRef.current = start + nextIds.length;
      setListings((prev) => [...prev, ...data]);
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
    const userId = authData?.user?.id;
    if (userId) {
      InteractionService.trackClick(userId, listing.id).catch(() => {});
      RecommendationService.recordInteraction(userId, listing.id, 'click', 'fyp').catch(() => {});
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

  const handleCloseDetails = () => {
    detailRequestRef.current = null;
    setSelectedListing(null);
    setDetailsType(null);
  };

  const handleInteractionAction = (actionId, listing) => {
    if (actionId === 'hide' || actionId === 'dislike') {
      setListings((prev) => prev.filter((l) => l.id !== listing.id));
      // Also remove from rec cache so it won't reappear on next page
      allRecListingsRef.current = allRecListingsRef.current.filter((l) => l.id !== listing.id);
    }
  };

  const renderItem = ({ item }) => (
    <ListingCard
      item={item}
      onPress={() => handleCardPress(item)}
      onInteractionAction={handleInteractionAction}
    />
  );

  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View>
          <FeedCardSkeleton />
          <FeedCardSkeleton />
        </View>
      );
    }
    if (!hasMore && listings.length > 0) {
      return (
        <View style={styles.footer}>
          <Text style={styles.footerText}>You're all caught up</Text>
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
    <View style={styles.container}>
      <FlatList
        data={listings}
        keyExtractor={(item) => String(item?.id)}
        renderItem={renderItem}
        ListHeaderComponent={
          recMode === 'rec_eng' ? (
            <View style={styles.modeBanner}>
              <View style={styles.modeDot} />
              <Text style={styles.modeText}>Personalised for you</Text>
            </View>
          ) : null
        }
        ListFooterComponent={renderFooter}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80 }}
        {...bottomNavScroll}
      />

      {selectedListing && detailsType === 'stay' && (
        <StayDetail listing={selectedListing} onClose={handleCloseDetails} />
      )}
      {selectedListing && detailsType === 'event' && (
        <EventDetail listing={selectedListing} onClose={handleCloseDetails} />
      )}
      {selectedListing && detailsType === 'offering' && (
        <OfferingDetail listing={selectedListing} onClose={handleCloseDetails} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: burgundyTheme.colors.background,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: burgundyTheme.colors.primaryTint,
    borderBottomWidth: 1,
    borderBottomColor: burgundyTheme.colors.border,
  },
  modeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: burgundyTheme.colors.success,
  },
  modeText: {
    fontSize: 12,
    color: burgundyTheme.colors.primary,
    fontWeight: '600',
  },
  footer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: burgundyTheme.colors.textSubtle,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: burgundyTheme.colors.text,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: burgundyTheme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: burgundyTheme.colors.primary,
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
    color: burgundyTheme.colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: burgundyTheme.colors.textMuted,
    textAlign: 'center',
  },
});
