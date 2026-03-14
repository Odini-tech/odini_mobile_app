import { useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { getListingById } from '../../../services/listings.service';
import ExploreCard from '../ExploreCard';
import EventDetail from '../details/EventDetail';
import OfferingDetail from '../details/OfferingDetail';
import StayDetail from '../details/StayDetail';

export default function ListingGridWithDetails({
  listings = [],
  loading = false,
  error = null,
  emptyMessage = 'No listings found',
  contentContainerStyle,
  onListingSelected,
}) {
  const [selectedListing, setSelectedListing] = useState(null);
  const [detailsType, setDetailsType] = useState(null);
  const detailRequestRef = useRef(null);

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
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  } else if (error) {
    body = <Text style={styles.messageText}>{error}</Text>;
  } else if (!listings.length) {
    body = <Text style={styles.messageText}>{emptyMessage}</Text>;
  } else {
    body = (
      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ExploreCard item={item} onPress={() => handleCardPress(item)} />
        )}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={contentContainerStyle || styles.gridContent}
      />
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

const styles = StyleSheet.create({
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
  messageText: {
    fontSize: 16,
    color: '#666',
    marginTop: 20,
    paddingHorizontal: 16,
    alignSelf: 'center',
  },
});
