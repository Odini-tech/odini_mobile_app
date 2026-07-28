import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAppMode } from '../../context/AppModeContext';
import { useCurrency } from '../../context/CurrencyContext';
import { formatEventTimeSmart } from '../../utils/dateFormat';
import { resolveAmenityIcon } from '../../utils/reactIconsMap';
import { oneOf } from '../../utils/relations';
import EventBookingModal from '../booking/EventBooking';
import FavoriteToggleButton from '../shared/FavoriteToggleButton';
import ImageCarousel from '../shared/ImageCarousel';
import ListingMap from '../shared/ListingMap';
import SuggestionCarousel from '../SuggestionCarousel';
import DetailSuggestionCarousel from './DetailSuggestionCarousel';

export default function EventDetail({ listing, onClose, onHostPress }) {
  const { theme } = useAppMode();
  const [showBooking, setShowBooking] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const router = useRouter();
  const { formatPrice } = useCurrency();
  const EVENT_ACCENT = theme.listingTypeColors.event;
  const styles = getStyles(theme, EVENT_ACCENT);

  const eventDetails = oneOf(listing.events);
  const hostId = listing.host_id || listing.profiles?.id;
  const hostName = [listing.profiles?.firstname, listing.profiles?.lastname].filter(Boolean).join(' ').trim()
    || listing.profiles?.username
    || 'Host';

  const handleHostPress = () => {
    if (!hostId) return;

    if (onHostPress) {
      onHostPress(hostId);
      return;
    }

    onClose?.();
    setTimeout(() => {
      router.push(`/host/${hostId}`);
    }, 0);
  };

  const handleVenuePress = () => {
    if (!listing.venueId) return;
    onClose?.();
    setTimeout(() => {
      router.push(`/venue/${listing.venueId}`);
    }, 0);
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="chevron-back" size={28} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Event Details</Text>
          <FavoriteToggleButton listingId={listing.id} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <ImageCarousel
            images={listing.images}
            containerStyle={styles.imagesContainer}
            imageStyle={styles.image}
            placeholder={
              <View style={[styles.image, styles.imagePlaceholder]}>
                <Ionicons name="calendar" size={60} color={theme.colors.textSubtle} />
              </View>
            }
          />

          <View style={styles.content}>
            <Text style={styles.title}>{listing.title}</Text>

            <View style={styles.badgeRow}>
              <View style={styles.eventBadge}>
                <Ionicons name="calendar" size={14} color={theme.colors.white} />
                <Text style={styles.badgeText}>
                  {eventDetails.event_type?.toUpperCase() || 'EVENT'}
                </Text>
              </View>
            </View>

            {listing.review_count ? (
              <View style={styles.ratingRow}>
                <View style={styles.ratingStars}>
                  <Ionicons name="star" size={16} color="#FFB800" />
                  <Text style={styles.rating}>{listing.average_rating?.toFixed(1) || 'N/A'}</Text>
                </View>
                <Text style={styles.reviews}>({listing.review_count} reviews)</Text>
              </View>
            ) : (
              <Text style={styles.noReviews}>No reviews yet</Text>
            )}

            <View style={styles.hostSection}>
              <TouchableOpacity
                style={[styles.hostInfoButton, !hostId && styles.hostInfoButtonDisabled]}
                onPress={handleHostPress}
                disabled={!hostId}
                activeOpacity={0.85}
              >
                <View style={styles.hostInfo}>
                  <View style={styles.hostAvatar}>
                    <Ionicons name="person" size={24} color={theme.colors.white} />
                  </View>
                  <View>
                    <Text style={styles.hostName}>{hostName}</Text>
                    <Text style={styles.hostRole}>Event Organizer</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {listing.venueId && (
              <View style={styles.hostSection}>
                <TouchableOpacity
                  style={styles.hostInfoButton}
                  onPress={handleVenuePress}
                  activeOpacity={0.85}
                >
                  <View style={styles.hostInfo}>
                    <View style={styles.hostAvatar}>
                      <Ionicons name="business" size={24} color={theme.colors.white} />
                    </View>
                    <View>
                      <Text style={styles.hostName}>{listing.venueName}</Text>
                      <Text style={styles.hostRole}>Venue</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Location</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location" size={16} color={theme.colors.textMuted} />
                <Text style={styles.locationText}>
                  {listing.address_city}, {listing.address_country}
                </Text>
              </View>
              <ListingMap
                listing_id={listing.id}
                height={200}
                markerTitle={listing.title}
                markerDescription={[listing.address_city, listing.address_country].filter(Boolean).join(', ')}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Event Information</Text>
              <View style={styles.detailsGrid}>
                <View style={styles.detailCard}>
                  <Ionicons name="time" size={24} color={theme.colors.textMuted} />
                  <Text style={styles.detailLabel}>Date & Time</Text>
                  <Text style={styles.detailValue} numberOfLines={2}>
                    {formatEventTimeSmart(eventDetails.event_time)}
                  </Text>
                </View>
                <View style={styles.detailCard}>
                  <Ionicons name="people" size={24} color={theme.colors.textMuted} />
                  <Text style={styles.detailLabel}>Capacity</Text>
                  <Text style={styles.detailValue}>{eventDetails.capacity || 0}</Text>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About this event</Text>
              <Text style={styles.description}>{listing.description}</Text>
            </View>

            {listing.amenities && listing.amenities.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>What&apos;s Included</Text>
                <View style={styles.amenitiesGrid}>
                  {listing.amenities.map((amenity) => {
                    const { Component: AmenityIcon, name: amenityIconName } = resolveAmenityIcon(amenity.icon_name);
                    return (
                      <View key={amenity.id} style={styles.amenityItem}>
                        <View style={styles.amenityIconWrap}>
                          <AmenityIcon name={amenityIconName} size={22} color={theme.colors.text} />
                        </View>
                        <Text style={styles.amenityName} numberOfLines={2}>{amenity.name}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={styles.bookingSection}>
              <View>
                <Text style={styles.priceLabel}>Price per ticket</Text>
                <Text style={styles.price}>{formatPrice(listing.price || 0)}</Text>
              </View>
              <TouchableOpacity style={styles.bookButton} onPress={() => setShowBooking(true)}>
                <Text style={styles.bookButtonText}> | Get Tickets →</Text>
              </TouchableOpacity>
            </View>

            <DetailSuggestionCarousel listing={listing} />
          </View>
        </ScrollView>

        {showBooking && (
          <EventBookingModal
            listing={listing}
            eventDetails={eventDetails}
            onClose={() => setShowBooking(false)}
            onConfirm={() => {
              setShowBooking(false);
              setShowSuggestions(true);
            }}
          />
        )}

        <SuggestionCarousel
          visible={showSuggestions}
          onClose={() => { setShowSuggestions(false); onClose(); }}
          excludeListingId={listing.id}
          bookedListingType="event"
        />
      </SafeAreaView>
    </Modal>
  );
}

const getStyles = (theme, EVENT_ACCENT) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  imagesContainer: {
    height: 300,
    backgroundColor: theme.colors.surfaceAlt,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 12,
  },
  badgeRow: {
    marginBottom: 12,
  },
  eventBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: EVENT_ACCENT,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.white,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  ratingStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  reviews: {
    fontSize: 12,
    color: theme.colors.textSubtle,
  },
  noReviews: {
    fontSize: 13,
    color: theme.colors.textSubtle,
    marginBottom: 16,
  },
  hostSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    ...theme.shadow,
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hostInfoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingRight: 10,
  },
  hostInfoButtonDisabled: {
    opacity: 0.7,
  },
  hostAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hostName: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  hostRole: {
    fontSize: 12,
    color: theme.colors.textSubtle,
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 10,
  },
  locationText: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: theme.colors.textSubtle,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  amenityItem: {
    width: '20%',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 6,
  },
  amenityIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  amenityName: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  bookingSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    marginBottom: 20,
  },
  priceLabel: {
    fontSize: 12,
    color: theme.colors.textSubtle,
    marginBottom: 4,
  },
  price: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
  },
  bookButton: {
  
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 12,
  },
  bookButtonText: {
    fontSize: 30,
    fontWeight: '600',
    color: theme.colors.text,
  },
});
