import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getListingById } from '../../../services/listings.service';
import { distributeIntoColumns } from '../../utils/masonryLayout';
import { useBottomNavScroll } from '../../context/BottomNavVisibilityContext';
import ExploreCard from '../ExploreCard';
import EventDetail from '../details/EventDetail';
import OfferingDetail from '../details/OfferingDetail';
import StayDetail from '../details/StayDetail';
import { useAppMode } from '../../context/AppModeContext';

const NUM_COLUMNS = 2;

export default function ListingGridWithDetails({
  listings = [],
  loading = false,
  error = null,
  emptyMessage = 'No listings found',
  contentContainerStyle,
  onListingSelected,
}) {
  const { theme } = useAppMode();
  const styles = getStyles(theme);
  const [selectedListing, setSelectedListing] = useState(null);
  const [detailsType, setDetailsType] = useState(null);
  const detailRequestRef = useRef(null);
  const bottomNavScroll = useBottomNavScroll();

  const columns = useMemo(() => distributeIntoColumns(listings, NUM_COLUMNS), [listings]);

  const handleCardPress = async (listing) => {
    detailRequestRef.current = listing.id;
    setDetailsType(listing.listing_type);
    setSelectedListing(listing);
    onListingSelected?.(listing);
    try {
      const detailed = await getListingById(listing.id);
      if (detailRequestRef.current !== listing.id) return;
      if (detailed) {
        setSelectedListing(detailed);
        onListingSelected?.(detailed);
      }
    } catch (err) {
      console.error('Error loading listing details:', err);
    }
  };

  const handleCloseDetails = () => {
    detailRequestRef.current = null;
    setSelectedListing(null);
    setDetailsType(null);
  };

  let body;
  if (loading) {
    body = (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.textMuted} />
      </View>
    );
  } else if (error) {
    body = <Text style={styles.messageText}>{error}</Text>;
  } else if (!listings.length) {
    body = <Text style={styles.messageText}>{emptyMessage}</Text>;
  } else {
    body = (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={contentContainerStyle || styles.gridContent}
        {...bottomNavScroll}
      >
        <View style={styles.masonryRow}>
          {columns.map((column, columnIndex) => (
            <View key={columnIndex} style={styles.column}>
              {column.map((item) => (
                <ExploreCard key={item.id} item={item} onPress={() => handleCardPress(item)} />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.wrapper}>
      {body}
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

const getStyles = (theme) => StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  centerContainer: {
    paddingTop: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridContent: {
    paddingHorizontal: 6,
    paddingBottom: 16,
  },
  masonryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  column: {
    flex: 1,
  },
  messageText: {
    fontSize: 16,
    color: theme.colors.textMuted,
    marginTop: 20,
    paddingHorizontal: 16,
    alignSelf: 'center',
  },
});
