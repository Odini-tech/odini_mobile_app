import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Image, Share, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { supabase } from "../../lib/supabase";
import { useAppMode } from "../context/AppModeContext";
import { useCurrency } from "../context/CurrencyContext";
import bookingService from "../services/bookingService";
import { InteractionService } from "../services/interactionService";
import { formatEventDateSmart } from "../utils/dateFormat";
import { formatCount } from "../utils/formatCount";
import { oneOf } from "../utils/relations";
import EventBookingModal from "./booking/EventBooking";
import OfferingBookingModal from "./booking/OfferingBooking";
import StayBookingModal from "./booking/StayBooking";
import EventDetail from "./details/EventDetail";
import OfferingDetail from "./details/OfferingDetail";
import StayDetail from "./details/StayDetail";
import CardInteractionMenu from "./shared/CardInteractionMenu";

const ListingCard = React.memo(function ListingCard({ item, onPress, onFavoritePress, favoriteLoading, onInteractionAction, isFavorited: propIsFavorited, styles: externalStyles }) {
  const { theme } = useAppMode();
  const listingTypeIcons = {
    stay: { name: "home", color: theme.listingTypeColors.stay },
    event: { name: "calendar", color: theme.listingTypeColors.event },
    offering: { name: "compass", color: theme.listingTypeColors.offering },
  };
  const styles = externalStyles || getStyles(theme);
  const { formatPrice } = useCurrency();
  const typeIcon = listingTypeIcons[item.listing_type] || listingTypeIcons.stay;
  const hostName = item.profiles?.firstname || item.profiles?.username || "Host";
  const [showDetails, setShowDetails] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [isFavorited, setIsFavorited] = useState(propIsFavorited ?? item.is_favorited ?? false);
  const [remainingTickets, setRemainingTickets] = useState(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const imageGlowAnim = useRef(new Animated.Value(0)).current;
  const hasPropRef = useRef(propIsFavorited !== undefined);

  // Periodic soft light-up pulse on the image, every 4s: hold, then fade in
  // and back out. Kept subtle (low peak opacity) so it reads as ambient
  // motion rather than a flash.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(2600),
        Animated.timing(imageGlowAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(imageGlowAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [imageGlowAnim]);

  const imageGlowOpacity = imageGlowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.18],
  });

  useEffect(() => {
    if (!hasPropRef.current) checkIfFavorited();
  }, [item.id]);

  useEffect(() => {
    if (item.listing_type !== 'event') return;
    const capacity = oneOf(item.events).capacity;
    if (!capacity) return;
    let cancelled = false;
    bookingService.checkEventAvailability({ listingId: item.id, quantity: 0 }).then((res) => {
      if (!cancelled && Number.isFinite(res.remaining)) setRemainingTickets(res.remaining);
    });
    return () => { cancelled = true; };
  }, [item.id, item.listing_type, item.events]);

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
              <View style={styles.avatar}>
                <Ionicons name= "person" size={20} color={theme.colors.white} />
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
              <Ionicons name="ellipsis-horizontal" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.imageContainer} activeOpacity={0.9} onPress={handleDetails}>
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} style={styles.image} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name={typeIcon.name} size={60} color={theme.colors.textSubtle} />
              </View>
            )}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.imageGlow,
                { backgroundColor: typeIcon.color, opacity: imageGlowOpacity },
              ]}
            />
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
                  <ActivityIndicator size="small" color={theme.colors.danger} />
                ) : (
                  <Ionicons
                    name={isFavorited ? "heart" : "heart-outline"}
                    size={24}
                    color={isFavorited ? theme.colors.danger : theme.colors.text}
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
                <Ionicons name="share-social-outline" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.interactionButton, styles.bookButton]}
              onPress={handleBooking}
            >
              <Ionicons name="calendar" size={18} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.caption}>
            <View style={styles.captionHeader}>
              <Text style={styles.captionBadge}>
                <Text style={{ color: typeIcon.color }}>{getBadgeLabel(item)}</Text>
              </Text>
              <Text style={styles.captionMeta}>@ {hostName}</Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text style={styles.captionTitle}>{getListingMetaText(item, remainingTickets)}</Text>
              <Text style={[styles.captionTitle, { color: theme.colors.text, fontWeight: '700' }]}>
                {formatPrice(item.price)}
              </Text>
            </View>

            {item.description && (
              <Text style={styles.captionText} numberOfLines={2}>
                {item.description}
              </Text>
            )}
            <TouchableOpacity onPress={handleDetails}>
              <Text style={styles.viewMore}>Check out...</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Animated.View>

      {renderDetailModal()}
      {showBooking && item?.listing_type === 'event' && (
        <EventBookingModal listing={item} eventDetails={oneOf(item.events)} onClose={handleCloseBooking} onConfirm={() => setShowBooking(false)} />
      )}
      {showBooking && item?.listing_type === 'offering' && (
        <OfferingBookingModal listing={item} offeringDetails={oneOf(item.offering)} onClose={handleCloseBooking} onConfirm={() => setShowBooking(false)} />
      )}
      {showBooking && item?.listing_type === 'stay' && (
        <StayBookingModal listing={item} stayDetails={oneOf(item.stays)} onClose={handleCloseBooking} onConfirm={() => setShowBooking(false)} />
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

function getBadgeLabel(item) {
  switch (item.listing_type) {
    case "event": {
      const eventType = oneOf(item.events).event_type;
      return (eventType || "Event").toString().toUpperCase();
    }
    case "offering": {
      const serviceType = oneOf(item.offering).service_type;
      return (serviceType || "Activity").toString().replace(/_/g, " ").toUpperCase();
    }
    default:
      return item.listing_type.toUpperCase();
  }
}

// Hosts enter opening_hours as free text, sometimes with several comma-separated
// day groups (e.g. "Mon - Fri: 8am - 10pm, Sat: 10am - 2pm"). Dumping the whole
// string on the compact card row reads as clutter, so only show the first group.
function formatSchedule(hoursString) {
  if (!hoursString) return null;
  return hoursString.split(",")[0]?.trim() || null;
}

function getListingMetaText(item, remainingTickets) {
  switch (item.listing_type) {
    case "stay": {
      const stay = oneOf(item.stays);
      const rooms = stay.available_rooms ?? 0;
      const guests = stay.max_guests ?? 0;
      return `${formatCount(rooms)} room${rooms !== 1 ? "s" : ""} available`;
    }
    case "event": {
      const event = oneOf(item.events);
      const dateStr = formatEventDateSmart(event.event_time);
      if (event.capacity && remainingTickets != null) {
        return `${dateStr} - ${formatCount(remainingTickets)} ticket${remainingTickets === 1 ? "" : "s"} left`;
      }
      return dateStr;
    }
    case "offering": {
      const offering = oneOf(item.offering);
      return formatSchedule(offering.opening_hours) || "Schedule varies";
    }
    default:
      return "Listing";
  }
}

const getStyles = (theme) => StyleSheet.create({
  postContainer: {
    backgroundColor: theme.colors.surface,
    marginTop: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 0,
    overflow: "hidden",
    marginHorizontal: 0,
    ...theme.shadow,
  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
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
    backgroundColor: "#2929295a",
    justifyContent: "center",
    alignItems: "center",
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  location: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  imageContainer: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: theme.colors.surfaceAlt,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageGlow: {
    ...StyleSheet.absoluteFillObject,
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
    borderBottomColor: theme.colors.border,
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
    backgroundColor: "#47464607",
    borderRadius: 999,
    padding: 3,
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
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
  },
  captionMeta: {
    fontSize: 12,
    color: theme.colors.textSubtle,
  },
  captionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 4,
  },
  captionText: {
    fontWeight: "400",
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 18,
    marginBottom: 6,
  },
  viewMore: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: "900",
  },
});
