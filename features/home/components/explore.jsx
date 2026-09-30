import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppData } from '@/store/AppDataContext';
import { useAppMode } from '@/store/AppModeContext';
import { InteractionService } from '@/services/interactionService';
import { distributeIntoColumns, getAspectRatio } from '@/utils/masonryLayout';
import { getDistanceKm } from '@/utils/distance';
import { requestAndGetLocation } from '@/services/locationService';
import EventDetail from '@/features/listings/components/details/EventDetail';
import OfferingDetail from '@/features/listings/components/details/OfferingDetail';
import StayDetail from '@/features/listings/components/details/StayDetail';
import ExploreCard from '@/features/listings/components/ExploreCard';
import { GridCardSkeleton } from '@/components/ui/CardSkeleton';

const NUM_COLUMNS = 2;
const LOAD_MORE_THRESHOLD = 500;
const SKELETON_RATIOS = [1.3, 0.8, 0.7, 1.1, 1.35, 0.9];

export default function Explore({ onItemClick }) {
  const { theme } = useAppMode();
  const styles = getStyles(theme);
  const {
    listings: contextListings,
    isReady,
    hasMore: contextHasMore,
    favoritedIds: contextFavIds,
    userId,
    loadMoreListings,
    updateFavoritedId,
    refresh: contextRefresh,
  } = useAppData();

  const [listings, setListings] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [favoritedIds, setFavoritedIds] = useState(() => new Set());
  const [selectedListing, setSelectedListing] = useState(null);
  const [detailsType, setDetailsType] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locatingNearMe, setLocatingNearMe] = useState(false);

  // Seed local state from context once data is ready
  const seededRef = useRef(false);
  useEffect(() => {
    if (isReady && contextListings.length > 0 && !seededRef.current) {
      seededRef.current = true;
      setListings(contextListings);
      setHasMore(contextHasMore);
      setFavoritedIds(new Set(contextFavIds));
    }
  }, [isReady, contextListings, contextHasMore, contextFavIds]);

  // Keep favoritedIds in sync with context changes
  useEffect(() => {
    setFavoritedIds(new Set(contextFavIds));
  }, [contextFavIds]);

  const handleCardPress = useCallback((item) => {
    setSelectedListing(item);
    setDetailsType(item.listing_type);
    onItemClick?.(item);
    if (userId) {
      InteractionService.trackClick(userId, item.id).catch(() => { });
    }
  }, [userId, onItemClick]);

  const handleCloseDetails = useCallback(() => {
    setSelectedListing(null);
    setDetailsType(null);
  }, []);

  const handleInteractionAction = useCallback((actionId, listing) => {
    if (actionId === 'favorite') {
      const next = new Set(favoritedIds);
      const isFav = next.has(listing.id);
      if (isFav) next.delete(listing.id); else next.add(listing.id);
      setFavoritedIds(next);
      updateFavoritedId(listing.id, !isFav);
    }
  }, [favoritedIds, updateFavoritedId]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const next = await loadMoreListings();
      if (next.length === 0) {
        setHasMore(false);
      } else {
        setListings((prev) => [...prev, ...next]);
      }
    } catch (err) {
      console.error('Error loading more:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, loadMoreListings]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    seededRef.current = false;
    await contextRefresh();
    setRefreshing(false);
  }, [contextRefresh]);

  // After refresh, re-seed from context
  useEffect(() => {
    if (!refreshing && isReady && contextListings.length > 0 && !seededRef.current) {
      seededRef.current = true;
      setListings(contextListings);
      setHasMore(contextHasMore);
    }
  }, [refreshing, isReady, contextListings, contextHasMore]);

  const handleScroll = useCallback((event) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    if (distanceFromBottom < LOAD_MORE_THRESHOLD) {
      loadMore();
    }
  }, [loadMore]);

  const sortedListings = useMemo(() => {
    if (!userLocation) return listings;
    const withDistance = listings.map((item) => {
      const loc = item.venues?.locations;
      const distanceKm = loc?.lat != null && loc?.lng != null
        ? getDistanceKm(userLocation.latitude, userLocation.longitude, loc.lat, loc.lng)
        : null;
      return { item, distanceKm };
    });
    // Listings without a known location sort to the end rather than disappearing.
    withDistance.sort((a, b) => {
      if (a.distanceKm == null) return b.distanceKm == null ? 0 : 1;
      if (b.distanceKm == null) return -1;
      return a.distanceKm - b.distanceKm;
    });
    return withDistance.map((x) => x.item);
  }, [listings, userLocation]);

  const columns = useMemo(
    () => distributeIntoColumns(sortedListings, NUM_COLUMNS),
    [sortedListings]
  );

  const handleToggleNearMe = useCallback(async () => {
    if (userLocation) {
      setUserLocation(null);
      return;
    }
    setLocatingNearMe(true);
    const coords = await requestAndGetLocation();
    setLocatingNearMe(false);
    if (coords) setUserLocation(coords);
  }, [userLocation]);

  const renderCard = useCallback((item) => (
    <ExploreCard
      key={item.id}
      item={item}
      aspectRatio={getAspectRatio(item.id)}
      onPress={() => handleCardPress(item)}
      isFavorited={favoritedIds.has(item.id)}
      onInteractionAction={handleInteractionAction}
      userLocation={userLocation}
    />
  ), [favoritedIds, handleCardPress, handleInteractionAction, userLocation]);

  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.masonryRow}>
          <View style={styles.column}>
            <GridCardSkeleton aspectRatio={1.2} />
          </View>
          <View style={styles.column}>
            <GridCardSkeleton aspectRatio={0.85} />
          </View>
        </View>
      );
    }
    if (!hasMore && listings.length > 0) {
      return (
        <View style={styles.footer}>
          <Text style={styles.footerText}>All listings loaded</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={refresh}>
            <Ionicons name="refresh" size={15} color={theme.colors.buttonText} />
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return null;
  };

  if (!isReady || listings.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.masonryRow}>
          <View>
          <Text style={styles.sectionTitle}>Coming Up</Text>
          <Text style={styles.sectionSubtitle}>Events near you</Text>
        </View>
          <View style={styles.column}>
            {SKELETON_RATIOS.filter((_, i) => i % 2 === 0).map((ratio, i) => (
              <GridCardSkeleton key={`l-${i}`} aspectRatio={ratio} />
            ))}
          </View>
          <View style={styles.column}>
            {SKELETON_RATIOS.filter((_, i) => i % 2 === 1).map((ratio, i) => (
              <GridCardSkeleton key={`r-${i}`} aspectRatio={ratio} />
            ))}
          </View>
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={theme.colors.textMuted}
              colors={[theme.colors.textMuted]}
            />
          }
        >
          <TouchableOpacity
            style={[styles.nearMeButton, userLocation && styles.nearMeButtonActive]}
            onPress={handleToggleNearMe}
            disabled={locatingNearMe}
          >
            <Ionicons
              name="navigate"
              size={14}
              color={userLocation ? theme.colors.buttonText : theme.colors.textMuted}
            />
            <Text style={[styles.nearMeButtonText, userLocation && styles.nearMeButtonTextActive]}>
              {locatingNearMe ? 'Finding you…' : userLocation ? 'Sorted by distance' : 'Near me'}
            </Text>
          </TouchableOpacity>
          <View style={styles.masonryRow}>
            {columns.map((column, columnIndex) => (
              <View key={columnIndex} style={styles.column}>
                {column.map(renderCard)}
              </View>
            ))}
          </View>
          {renderFooter()}
        </ScrollView>
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
  gridContent: {
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 80,
  },
  masonryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  column: {
    flex: 1,
  },
  footer: {
    paddingVertical: 24,
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
    backgroundColor: theme.colors.buttonBg,
  },
  refreshButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.buttonText,
  },
  nearMeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 10,
  },
  nearMeButtonActive: {
    backgroundColor: theme.colors.buttonBg,
    borderColor: theme.colors.buttonBg,
  },
  nearMeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  nearMeButtonTextActive: {
    color: theme.colors.buttonText,
  },
  sectionTitle: {
    fontSize: 35,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 18,
    color: theme.colors.textMuted,
  }
});
