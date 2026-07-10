import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Image, Share, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { supabase } from "../../lib/supabase";
import { useCurrency } from "../context/CurrencyContext";
import { InteractionService } from "../services/interactionService";
import burgundyTheme, { getListingTypeColor } from "../theme/burgundyTheme";
import EventBookingModal from "./booking/EventBooking";
import OfferingBookingModal from "./booking/OfferingBooking";
import StayBookingModal from "./booking/StayBooking";
import EventDetail from "./details/EventDetail";
import OfferingDetail from "./details/OfferingDetail";
import StayDetail from "./details/StayDetail";
import CardInteractionMenu from "./shared/CardInteractionMenu";

const LISTING_TYPE_ICONS = {
  stay: { name: "home", color: getListingTypeColor("stay") },
  event: { name: "calendar", color: getListingTypeColor("event") },
  offering: { name: "briefcase", color: getListingTypeColor("offering") },
};

const ListingCard = React.memo(function ListingCard({ item, onPress, onFavoritePress, favoriteLoading, onInteractionAction, isFavorited: propIsFavorited, styles: externalStyles }) {
  const styles = externalStyles || localStyles;
  const { formatPrice } = useCurrency();
  const typeIcon = LISTING_TYPE_ICONS[item.listing_type] || LISTING_TYPE_ICONS.stay;
  const hostName = item.profiles?.firstname || item.profiles?.username || "Host";
  const [showDetails, setShowDetails] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [isFavorited, setIsFavorited] = useState(propIsFavorited ?? item.is_favorited ?? false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const hasPropRef = useRef(propIsFavorited !== undefined);

  useEffect(() => {
    if (!hasPropRef.current) checkIfFavorited();
  }, [item.id]);

  const checkIfFavorited = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      if (!userId) return;
      const { data } = await supabase
        .from('interactions')
        .select('id')
        .eq('user_id', userId)
        .eq('listing_id', item.id)
        .gte('score', 5)
        .maybeSingle();
      setIsFavorited(!!data);
    } catch (_) {}
  };

  const handleCloseDetails = () => setShowDetails(false);
  const handleCloseBooking = () => setShowBooking(false);

  const handleDetails = () => {
    if (onPress) {
      onPress(item);
      return;
    }
    if (item?.listing_type) setShowDetails(true);
  };

  const handleBooking = () => {
    setShowBooking(true);
  };

  const handleLongPress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.98, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    setMenuVisible(true);
  };

  const handleInteractionAction = async (actionId, listing) => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      if (!userId) return;

      if (actionId === 'favorite') {
        if (isFavorited) {
          await supabase
            .from('interactions')
            .delete()
            .eq('user_id', userId)
            .eq('listing_id', listing.id)
            .gte('score', 5);
          setIsFavorited(false);
        } else {
          await InteractionService.trackSave(userId, listing.id);
          setIsFavorited(true);
        }
        onFavoritePress?.(listing.id);
      } else if (actionId === 'dislike') {
        await InteractionService.trackSwipe(userId, listing.id, 'left');
      } else if (actionId === 'hide') {
        await supabase.from('interactions').insert({
          user_id: userId,
          listing_id: listing.id,
          score: -1,
          last_action: JSON.stringify({ action: 'hide' }),
        });
      }

      onInteractionAction?.(actionId, listing);
    } catch (err) {
      console.error('Interaction action error:', err);
    }
  };

  const renderDetailModal = () => {
    if (!showDetails) return null;
    switch (item?.listing_type) {
      case "stay": return <StayDetail listing={item} onClose={handleCloseDetails} />;
      case "event": return <EventDetail listing={item} onClose={handleCloseDetails} />;
      case "offering": return <OfferingDetail listing={item} onClose={handleCloseDetails} />;
      default: return null;
    }
  };

  return (
    <>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          style={styles.postContainer}
          activeOpacity={0.9}
          onPress={handleDetails}
          onLongPress={handleLongPress}
          delayLongPress={350}
        >
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
            <TouchableOpacity
              onPress={() => setMenuVisible(true)}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              activeOpacity={0.6}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color={burgundyTheme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.imageContainer} activeOpacity={0.9} onPress={handleDetails}>
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} style={styles.image} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name={typeIcon.name} size={60} color={typeIcon.color} />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.interactions}>
            <View style={styles.interactionsLeft}>
              <TouchableOpacity
                style={styles.interactionButton}
                onPress={async () => {
                  const { data: authData } = await supabase.auth.getUser();
                  const userId = authData?.user?.id;
                  if (!userId) return;
                  if (isFavorited) {
                    await supabase
                      .from('interactions')
                      .delete()
                      .eq('user_id', userId)
                      .eq('listing_id', item.id)
                      .gte('score', 5);
                    setIsFavorited(false);
                  } else {
                    await InteractionService.trackSave(userId, item.id);
                    setIsFavorited(true);
                  }
                  onFavoritePress?.(item.id);
                }}
                disabled={favoriteLoading}
              >
                {favoriteLoading ? (
                  <ActivityIndicator size="small" color={burgundyTheme.colors.danger} />
                ) : (
                  <Ionicons
                    name={isFavorited ? "heart" : "heart-outline"}
                    size={24}
                    color={isFavorited ? burgundyTheme.colors.danger : burgundyTheme.colors.text}
                  />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.interactionButton}
                onPress={async () => {
                  try {
                    await Share.share({
                      title: item.title,
                      message: `Check out "${item.title}" on Odini!\\n\\n${item.description || ''}\\n\\nPrice: ${item.price ? item.price : 'See listing for details'}`.trim(),
                    });
                  } catch (_) {}
                }}
              >
                <Ionicons name="share-social-outline" size={24} color={burgundyTheme.colors.text} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.interactionButton, styles.bookButton]}
              onPress={handleBooking}
            >
              <Ionicons name="calendar" size={15} color={burgundyTheme.colors.white} />
            </TouchableOpacity>
          </View>

          <View style={styles.caption}>
            <View style={styles.captionHeader}>
              <Text style={[styles.captionBadge, { backgroundColor: `${typeIcon.color}20`, borderColor: typeIcon.color }]}>
                <Text style={{ color: typeIcon.color }}>{item.listing_type.toUpperCase()}</Text>
              </Text>
              <Text style={styles.captionMeta}>by {hostName}</Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text style={styles.captionTitle}>{getListingMetaText(item)}</Text>
              {item.price ? (
                <Text style={[styles.captionTitle, { color: typeIcon.color, fontWeight: '700' }]}>
                  {formatPrice(item.price)}
                </Text>
              ) : null}
            </View>

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
      </Animated.View>

      {renderDetailModal()}
      {showBooking && item?.listing_type === 'event' && (
        <EventBookingModal listing={item} eventDetails={item.events?.[0] || {}} onClose={handleCloseBooking} onConfirm={() => setShowBooking(false)} />
      )}
      {showBooking && item?.listing_type === 'offering' && (
        <OfferingBookingModal listing={item} offeringDetails={item.offering?.[0] || {}} onClose={handleCloseBooking} onConfirm={() => setShowBooking(false)} />
      )}
      {showBooking && item?.listing_type === 'stay' && (
        <StayBookingModal listing={item} stayDetails={item.stays?.[0] || {}} onClose={handleCloseBooking} onConfirm={() => setShowBooking(false)} />
      )}

      <CardInteractionMenu
        visible={menuVisible}
        listing={item}
        onAction={handleInteractionAction}
        onClose={() => setMenuVisible(false)}
      />
    </>
  );
});

export default ListingCard;

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
      return `${serviceType}`;
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
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: burgundyTheme.colors.border,
  },

  interactionsLeft: {
    flexDirection: "row",
    gap: 12,
  },
  interactionsRight: {
    flexDirection: "row",
    gap: 1,
  },
  interactionButton: {
    padding: 5,
    marginLeft: -8,
  },
  bookButton: {
    backgroundColor: "#000",
    borderRadius: 999,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
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
