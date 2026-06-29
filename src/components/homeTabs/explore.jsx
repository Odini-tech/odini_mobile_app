import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppData } from '../../context/AppDataContext';
import { InteractionService } from '../../services/interactionService';
import burgundyTheme from '../../theme/burgundyTheme';
import ExploreCard from '../ExploreCard';
import { GridCardSkeleton } from '../shared/CardSkeleton';
import StayDetail from '../details/StayDetail';
import EventDetail from '../details/EventDetail';
import OfferingDetail from '../details/OfferingDetail';

const NUM_COLUMNS = 2;

export default function Explore({ onItemClick }) {
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
      InteractionService.trackClick(userId, item.id).catch(() => {});
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

  if (!isReady || listings.length === 0) {
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
});
