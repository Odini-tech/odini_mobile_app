import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const LISTING_TYPE_ICONS = {
  stay: { name: "home", color: "#4A90E2" },
  event: { name: "calendar", color: "#FF6B6B" },
  offering: { name: "briefcase", color: "#2ECC71" },
};

export default function ListingCard({ item, onPress, onFavoritePress, favoriteLoading, styles: externalStyles }) {
  const styles = externalStyles || localStyles;
  const typeIcon = LISTING_TYPE_ICONS[item.listing_type] || LISTING_TYPE_ICONS.stay;
  const hostName = item.profiles?.firstname || item.profiles?.username || "Host";

  return (
    <View style={styles.postContainer}>
      {/* Header */}
      <View style={styles.postHeader}>
        <View style={styles.userInfo}>
          <View style={[styles.avatar, { backgroundColor: typeIcon.color }]}>
            <Ionicons name={typeIcon.name} size={20} color="#FFF" />
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.username} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.location} numberOfLines={1}>
              {item.profiles?.location || "Location not specified"}
            </Text>
          </View>
        </View>
        <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
      </View>

      {/* Image */}
      <TouchableOpacity 
        style={styles.imageContainer}
        activeOpacity={0.9}
        onPress={onPress}
      >
        {item.image_url ? (
          <Image
            source={{ uri: item.image_url }}
            style={styles.image}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name={typeIcon.name} size={60} color={typeIcon.color} />
          </View>
        )}
      </TouchableOpacity>

      {/* Interactions */}
      <View style={styles.interactions}>
        <TouchableOpacity 
          style={styles.interactionButton}
          onPress={onFavoritePress}
          disabled={favoriteLoading}
        >
          {favoriteLoading ? (
            <ActivityIndicator size="small" color="#FF3B30" />
          ) : (
            <Ionicons
              name={item.is_favorited ? "heart" : "heart-outline"}
              size={24}
              color={item.is_favorited ? "#FF3B30" : "#1A1A1A"}
            />
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.interactionButton} onPress={onPress}>
          <Ionicons name="chatbubble-outline" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.interactionButton}>
          <Ionicons name="share-social-outline" size={24} color="#1A1A1A" />
        </TouchableOpacity>
      </View>

      {/* Caption */}
      <View style={styles.caption}>
        <View style={styles.captionHeader}>
          <Text style={[styles.captionBadge, { backgroundColor: typeIcon.color + "20", borderColor: typeIcon.color }]}>
            <Text style={{ color: typeIcon.color }}>{item.listing_type.toUpperCase()}</Text>
          </Text>
          <Text style={styles.captionMeta}>by {hostName}</Text>
        </View>

        <Text style={styles.captionTitle}>
          {getListingMetaText(item)}
        </Text>

        {item.description && (
          <Text style={styles.captionText} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        <TouchableOpacity onPress={onPress}>
          <Text style={styles.viewMore}>View Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/**
 * Get listing-type specific metadata text
 */
function getListingMetaText(item) {
  switch (item.listing_type) {
    case "stay":
      const rooms = item.stays?.[0]?.available_rooms || 0;
      const guests = item.stays?.[0]?.max_guests || 0;
      return `${rooms} room${rooms !== 1 ? "s" : ""} • ${guests} guest${guests !== 1 ? "s" : ""}`;
    case "event":
      const capacity = item.events?.[0]?.capacity || 0;
      const eventType = item.events?.[0]?.event_type || "Event";
      return `${eventType} • ${capacity} capacity`;
    case "offering":
      const serviceType = item.offering?.[0]?.service_type || "Service";
      const priceRange = item.offering?.[0]?.price_range || "Price TBD";
      return `${serviceType} • ${priceRange}`;
    default:
      return "Listing";
  }
}

const localStyles = StyleSheet.create({
  postContainer: {
    backgroundColor: "#FFF",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  location: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  imageContainer: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#F0F7FF",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  interactions: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  interactionButton: {
    padding: 8,
    marginLeft: -8,
  },
  caption: {
    padding: 12,
  },
  captionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  captionBadge: {
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  captionMeta: {
    fontSize: 12,
    color: "#999",
  },
  captionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  captionText: {
    fontSize: 13,
    color: "#1A1A1A",
    lineHeight: 18,
    marginBottom: 6,
  },
  viewMore: {
    fontSize: 13,
    color: "#4A90E2",
    fontWeight: "500",
  },
});
