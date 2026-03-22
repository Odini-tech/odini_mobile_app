import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { getListings } from "../../../services/listings.service";
import { useBottomNavScroll } from "../../context/BottomNavVisibilityContext";
import burgundyTheme from "../../theme/burgundyTheme";
import ListingCard from "../cards";

export function ForYouPage({ onEventClick }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [favoriteLoading, setFavoriteLoading] = useState({});
  const bottomNavScroll = useBottomNavScroll();

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
    console.log("Toggle favorite for:", listingId);
  };

  const handleCardPress = (listing) => {
    onEventClick?.(listing);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={burgundyTheme.colors.primary} />
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
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          listings.length > 0 ? (
            <View style={styles.footer}>
              <Text style={styles.footerText}>No more listings</Text>
            </View>
          ) : null
        }
        {...bottomNavScroll}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: burgundyTheme.colors.background,
  },
  header: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    backgroundColor: burgundyTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: burgundyTheme.colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: burgundyTheme.colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: burgundyTheme.colors.textMuted,
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
    color: burgundyTheme.colors.textMuted,
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
    color: burgundyTheme.colors.text,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: burgundyTheme.colors.textMuted,
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: burgundyTheme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: burgundyTheme.colors.white,
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
    color: burgundyTheme.colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: burgundyTheme.colors.textMuted,
    textAlign: "center",
  },
  footer: {
    paddingVertical: 32,
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    color: burgundyTheme.colors.textSubtle,
  },
});
