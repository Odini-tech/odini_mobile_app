import React, { useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../../lib/supabase';
import {
  enrichRecommendationListings,
  getShuffledListingIds,
  getListingsByIds,
} from '../../../services/listings.service';
import { RecommendationService } from '../../services/recommendationService';
import { getRecommendationModeStatus } from '../../services/recommendationGateway';
import burgundyTheme from '../../theme/burgundyTheme';
import ExploreCard from '../ExploreCard';
import { GridCardSkeleton } from '../shared/CardSkeleton';

const PAGE_SIZE = 6;
const NUM_COLUMNS = 2;

export default function Explore({ onItemClick }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);

  const shuffledIdsRef = useRef([]);
  const loadedCountRef = useRef(0);
  const allRecListingsRef = useRef([]);

  useEffect(() => {
    initialLoad();
  }, []);

  const initialLoad = async () => {
    try {
      setLoading(true);
      setError(null);

      const { mode } = getRecommendationModeStatus();

      if (mode === 'rec_eng') {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id;
        if (userId) {
          const recListings = await RecommendationService.getExplore(userId);
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
      }

      // Basic: shuffled IDs, first page
      const ids = await getShuffledListingIds();
      shuffledIdsRef.current = ids;
      const firstBatch = ids.slice(0, PAGE_SIZE);
      const data = await getListingsByIds(firstBatch);
      loadedCountRef.current = firstBatch.length;
      setListings(data);
      setHasMore(ids.length > PAGE_SIZE);
    } catch (err) {
      console.error('Error loading explore:', err);
      setError(err instanceof Error ? err.message : 'Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      if (allRecListingsRef.current.length > 0) {
        const start = loadedCountRef.current;
        const next = allRecListingsRef.current.slice(start, start + PAGE_SIZE);
        if (next.length === 0) { setHasMore(false); return; }
        loadedCountRef.current = start + next.length;
        setListings((prev) => [...prev, ...next]);
        setHasMore(loadedCountRef.current < allRecListingsRef.current.length);
        return;
      }

      const start = loadedCountRef.current;
      const nextIds = shuffledIdsRef.current.slice(start, start + PAGE_SIZE);
      if (nextIds.length === 0) { setHasMore(false); return; }
      const data = await getListingsByIds(nextIds);
      loadedCountRef.current = start + nextIds.length;
      setListings((prev) => [...prev, ...data]);
      setHasMore(loadedCountRef.current < shuffledIdsRef.current.length);
    } catch (err) {
      console.error('Error loading more explore:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.gridItem}>
      <ExploreCard item={item} onPress={() => onItemClick?.(item)} />
    </View>
  );

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
    <View style={styles.container}>
      <FlatList
        data={listings}
        keyExtractor={(item) => String(item?.id)}
        renderItem={renderItem}
        numColumns={NUM_COLUMNS}
        columnWrapperStyle={styles.row}
        ListFooterComponent={renderFooter}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.gridContent}
      />
    </View>
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
  },
  footerText: {
    fontSize: 13,
    color: burgundyTheme.colors.textSubtle,
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
