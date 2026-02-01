import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function ListingCard({ item, onPress, onFavoritePress, favoriteLoading, styles: externalStyles }) {
  const styles = externalStyles || localStyles;

  return (
    <View style={styles.listingCard}>
      <TouchableOpacity
        style={styles.listingImageContainer}
        activeOpacity={0.9}
        onPress={onPress}
      >
        <View style={styles.listingImagePlaceholder}>
          <Ionicons name="home-outline" size={40} color="#4A90E2" />
        </View>

        <View style={styles.listingBadges}>
          {item.is_active && (
            <View style={styles.activeBadge}>
              <Ionicons name="checkmark-circle" size={12} color="#FFF" />
              <Text style={styles.activeBadgeText}>Active</Text>
            </View>
          )}
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>
              {item.type ? item.type.charAt(0).toUpperCase() + item.type.slice(1) : ""}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={onFavoritePress}
          disabled={favoriteLoading}
        >
          {favoriteLoading ? (
            <ActivityIndicator size="small" color="#FF3B30" />
          ) : (
            <Ionicons
              name={item.is_favorited ? "heart" : "heart-outline"}
              size={24}
              color={item.is_favorited ? "#FF3B30" : "#FFF"}
            />
          )}
        </TouchableOpacity>
      </TouchableOpacity>

      <View style={styles.listingInfo}>
        <Text style={styles.listingTitle} numberOfLines={2}>
          {item.title}
        </Text>

        <View style={styles.locationContainer}>
          <Ionicons name="location-outline" size={14} color="#666" />
          <Text style={styles.listingLocation} numberOfLines={1}>
            {item.city}, {item.country}
          </Text>
        </View>

        {item.description && (
          <Text style={styles.listingDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <View style={styles.listingMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="bed-outline" size={16} color="#666" />
            <Text style={styles.metaText}>
              {item.available_rooms} room{item.available_rooms !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Ionicons name="star-outline" size={16} color="#666" />
            <Text style={styles.metaText}>4.8</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.viewDetailsButton} onPress={onPress}>
          <Text style={styles.viewDetailsText}>View Details</Text>
          <Ionicons name="arrow-forward" size={16} color="#4A90E2" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const localStyles = StyleSheet.create({
  listingCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    overflow: "hidden",
  },
  listingImageContainer: {
    position: "relative",
    height: 140,
    backgroundColor: "#F0F7FF",
    justifyContent: "center",
    alignItems: "center",
  },
  listingImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  listingBadges: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    gap: 6,
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2ECC71",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#ffffffad",
  },
  typeBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#4A90E2",
  },
  favoriteButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  listingInfo: {
    padding: 12,
  },
  listingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 6,
    lineHeight: 20,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  listingLocation: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
    flex: 1,
  },
  listingDescription: {
    fontSize: 12,
    color: "#999",
    lineHeight: 16,
    marginBottom: 12,
  },
  listingMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: "#666",
  },
  metaDivider: {
    width: 1,
    height: 12,
    backgroundColor: "#E1E5E9",
    marginHorizontal: 8,
  },
  viewDetailsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4A90E2",
  },
});
