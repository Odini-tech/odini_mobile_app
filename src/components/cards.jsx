import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import burgundyTheme, { getListingTypeColor } from "../theme/burgundyTheme";
import EventDetail from "./details/EventDetail";
import OfferingDetail from "./details/OfferingDetail";
import StayDetail from "./details/StayDetail";

const LISTING_TYPE_ICONS = {
  stay: { name: "home", color: getListingTypeColor("stay") },
  event: { name: "calendar", color: getListingTypeColor("event") },
  offering: { name: "briefcase", color: getListingTypeColor("offering") },
};

export default function ListingCard({ item, onPress, onFavoritePress, favoriteLoading, styles: externalStyles }) {
  const styles = externalStyles || localStyles;
  const typeIcon = LISTING_TYPE_ICONS[item.listing_type] || LISTING_TYPE_ICONS.stay;
  const hostName = item.profiles?.firstname || item.profiles?.username || "Host";
  const [showDetails, setShowDetails] = useState(false);

  const handleCloseDetails = () => {
    setShowDetails(false);
  };

  const handleDetails = () => {
    if (onPress) {
      onPress(item);
      return;
    }

    if (item?.listing_type) {
      setShowDetails(true);
    }
  };

  const renderDetailModal = () => {
    if (!showDetails) {
      return null;
    }

    switch (item?.listing_type) {
      case "stay":
        return <StayDetail listing={item} onClose={handleCloseDetails} />;
      case "event":
        return <EventDetail listing={item} onClose={handleCloseDetails} />;
      case "offering":
        return <OfferingDetail listing={item} onClose={handleCloseDetails} />;
      default:
        return null;
    }
  };

  return (
    <>
      <TouchableOpacity style={styles.postContainer} activeOpacity={0.9} onPress={handleDetails}>
        <View style={styles.postHeader}>
          <View style={styles.userInfo}>
            <View style={[styles.avatar, { backgroundColor: typeIcon.color }]}>
              <Ionicons name={typeIcon.name} size={20} color={burgundyTheme.colors.white} />
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.username} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.location} numberOfLines={1}>
                {item.profiles?.location || "Location not specified"}
              </Text>
            </View>
          </View>
          <Ionicons name="ellipsis-horizontal" size={20} color={burgundyTheme.colors.textMuted} />
        </View>

        <TouchableOpacity
          style={styles.imageContainer}
          activeOpacity={0.9}
          onPress={handleDetails}
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

        <View style={styles.interactions}>
          <TouchableOpacity
            style={styles.interactionButton}
            onPress={onFavoritePress}
            disabled={favoriteLoading}
          >
            {favoriteLoading ? (
              <ActivityIndicator size="small" color={burgundyTheme.colors.danger} />
            ) : (
              <Ionicons
                name={item.is_favorited ? "heart" : "heart-outline"}
                size={24}
                color={item.is_favorited ? burgundyTheme.colors.danger : burgundyTheme.colors.text}
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.interactionButton} onPress={handleDetails}>
            <Ionicons name="chatbubble-outline" size={24} color={burgundyTheme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.interactionButton}>
            <Ionicons name="share-social-outline" size={24} color={burgundyTheme.colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.caption}>
          <View style={styles.captionHeader}>
            <Text style={[styles.captionBadge, { backgroundColor: `${typeIcon.color}20`, borderColor: typeIcon.color }]}>
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
          <TouchableOpacity onPress={handleDetails}>
            <Text style={styles.viewMore}>View Details</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
      {renderDetailModal()}
    </>
  );
}

function getListingMetaText(item) {
  switch (item.listing_type) {
    case "stay": {
      const rooms = item.stays?.[0]?.available_rooms || 0;
      const guests = item.stays?.[0]?.max_guests || 0;
      return `${rooms} room${rooms !== 1 ? "s" : ""} - ${guests} guest${guests !== 1 ? "s" : ""}`;
    }
    case "event": {
      const capacity = item.events?.[0]?.capacity || 0;
      const eventType = item.events?.[0]?.event_type || "Event";
      return `${eventType} - ${capacity} capacity`;
    }
    case "offering": {
      const serviceType = item.offering?.[0]?.service_type || "Service";
      const priceRange = item.offering?.[0]?.price_range || "Price TBD";
      return `${serviceType} - ${priceRange}`;
    }
    default:
      return "Listing";
  }
}

const localStyles = StyleSheet.create({
  postContainer: {
    backgroundColor: burgundyTheme.colors.surface,
    marginTop: 16,
    borderWidth: 1,
    borderColor: burgundyTheme.colors.border,
    borderRadius: 0,
    overflow: "hidden",
    marginHorizontal: 0,
    ...burgundyTheme.shadow,
  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: burgundyTheme.colors.border,
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
    color: burgundyTheme.colors.text,
  },
  location: {
    fontSize: 12,
    color: burgundyTheme.colors.textMuted,
    marginTop: 2,
  },
  imageContainer: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: burgundyTheme.colors.surfaceAlt,
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
    borderBottomColor: burgundyTheme.colors.border,
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
    color: burgundyTheme.colors.textSubtle,
  },
  captionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: burgundyTheme.colors.text,
    marginBottom: 4,
  },
  captionText: {
    fontSize: 13,
    color: burgundyTheme.colors.text,
    lineHeight: 18,
    marginBottom: 6,
  },
  viewMore: {
    fontSize: 13,
    color: burgundyTheme.colors.primary,
    fontWeight: "600",
  },
});
