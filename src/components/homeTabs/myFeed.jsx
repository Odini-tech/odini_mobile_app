import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { getListings } from "../../../services/listings.service";
import ListingCard from "../cards";
import EventDetail from "../details/EventDetail";
import OfferingDetail from "../details/OfferingDetail";
import StayDetail from "../details/StayDetail";

export function ForYouPage({ onEventClick }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [favoriteLoading, setFavoriteLoading] = useState({});
  const [selectedListing, setSelectedListing] = useState(null);
  const [detailsType, setDetailsType] = useState(null);

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getListings();
      setListings(data || []);
    } catch (err) {
      console.error("Error fetching listings:", err);
      setError(err.message || "Failed to load listings");
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFavorite = async (listingId) => {
    // TODO: Implement favorite toggling when auth context is available
    console.log("Toggle favorite for:", listingId);
  };

  const handleCardPress = (listing) => {
    setSelectedListing(listing);
    setDetailsType(listing.listing_type);
    onEventClick?.(listing);
  };

  const handleCloseDetails = () => {
    setSelectedListing(null);
    setDetailsType(null);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Loading listings...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Oops!</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={fetchListings}
          >
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!listings || listings.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No listings yet</Text>
          <Text style={styles.emptyText}>
            Check back soon for new stays, events, and offerings
          </Text>
        </View>
      </View>
    );
  }

  const handleCardFavorite = (listingId) => {
    setFavoriteLoading((prev) => ({
      ...prev,
      [listingId]: !prev[listingId],
    }));
    handleFavorite(listingId);
    setTimeout(() => {
      setFavoriteLoading((prev) => ({
        ...prev,
        [listingId]: false,
      }));
    }, 500);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover</Text>
        <Text style={styles.headerSubtitle}>Stays, Events & Services</Text>
      </View>

      <FlatList
        data={listings}
        keyExtractor={(item) => String(item?.id)}
        renderItem={({ item }) => (
          <ListingCard
            item={item}
            onPress={() => handleCardPress(item)}
            onFavoritePress={() => handleCardFavorite(item.id)}
            favoriteLoading={favoriteLoading[item.id] || false}
          />
        )}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 80 }}
        ListFooterComponent={
          listings.length > 0 ? (
            <View style={styles.footer}>
              <Text style={styles.footerText}>No more listings</Text>
            </View>
          ) : null
        }
      />

      {selectedListing && detailsType === "stay" && (
        <StayDetail listing={selectedListing} onClose={handleCloseDetails} />
      )}
      {selectedListing && detailsType === "event" && (
        <EventDetail listing={selectedListing} onClose={handleCloseDetails} />
      )}
      {selectedListing && detailsType === "offering" && (
        <OfferingDetail listing={selectedListing} onClose={handleCloseDetails} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  header: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: "#4A90E2",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  footer: {
    paddingVertical: 32,
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    color: "#999",
  },
});
