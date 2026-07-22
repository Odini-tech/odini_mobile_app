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
import { oneOf } from '../../utils/relations';
import { resolveAmenityIcon } from '../../utils/reactIconsMap';
import StayBookingModal from '../booking/StayBooking';
import ImageCarousel from '../shared/ImageCarousel';
import ListingMap from '../shared/ListingMap';
import SuggestionCarousel from '../SuggestionCarousel';
import DetailSuggestionCarousel from './DetailSuggestionCarousel';

export default function StayDetail({ listing, onClose, onHostPress }) {
  const { theme } = useAppMode();
  const [showBooking, setShowBooking] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const router = useRouter();
  const { formatPrice } = useCurrency();
  const STAY_ACCENT = theme.listingTypeColors.stay;
  const styles = getStyles(theme, STAY_ACCENT);

  const stayDetails = oneOf(listing.stays);
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

  return (
    <Modal visible animationType="slide">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="chevron-back" size={28} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Stay Details</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <ImageCarousel
            images={listing.images}
            containerStyle={styles.imagesContainer}
            imageStyle={styles.image}
            placeholder={
              <View style={[styles.image, styles.imagePlaceholder]}>
                <Ionicons name="home" size={60} color={theme.colors.textSubtle} />
              </View>
            }
          />

          <View style={styles.content}>
            <Text style={styles.title}>{listing.title}</Text>
            <View style={styles.ratingRow}>
              <View style={styles.ratingStars}>
                <Ionicons name="star" size={16} color="#FFB800" />
                <Text style={styles.rating}>{listing.average_rating?.toFixed(1) || 'N/A'}</Text>
              </View>
              <Text style={styles.reviews}>({listing.review_count || 0} reviews)</Text>
            </View>

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
                    <Text style={styles.hostRole}>Verified Host</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.contactButton}>
                <Ionicons name="chatbubble-outline" size={20} color={theme.colors.buttonText} />
              </TouchableOpacity>
            </View>

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
                style={styles.map}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Accommodation Details</Text>
              <View style={styles.detailsGrid}>
                <View style={styles.detailCard}>
                  <Ionicons name="door-open" size={24} color={theme.colors.textMuted} />
                  <Text style={styles.detailValue}>{stayDetails.available_rooms || 0}</Text>
                  <Text style={styles.detailLabel}>Rooms</Text>
                </View>
                <View style={styles.detailCard}>
                  <Ionicons name="people" size={24} color={theme.colors.textMuted} />
                  <Text style={styles.detailValue}>{stayDetails.max_guests || 0}</Text>
                  <Text style={styles.detailLabel}>Guests</Text>
                </View>
                <View style={styles.detailCard}>
                  <Ionicons name="moon" size={24} color={theme.colors.textMuted} />
                  <Text style={styles.detailValue}>{stayDetails.durations_nights || 0}</Text>
                  <Text style={styles.detailLabel}>Nights Min</Text>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About this place</Text>
              <Text style={styles.description}>{listing.description}</Text>
            </View>

            {listing.amenities && listing.amenities.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Amenities</Text>
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
                <Text style={styles.priceLabel}>Price per night</Text>
                <Text style={styles.price}>{formatPrice(listing.price || 0)}</Text>
              </View>
              <TouchableOpacity style={styles.bookButton} onPress={() => setShowBooking(true)}>
                <Text style={styles.bookButtonText}>Book Now</Text>
              </TouchableOpacity>
            </View>

            <DetailSuggestionCarousel listing={listing} />
          </View>
        </ScrollView>

        {showBooking && (
          <StayBookingModal
            listing={listing}
            stayDetails={stayDetails}
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
          bookedListingType="stay"
        />
      </SafeAreaView>
    </Modal>
  );
}

const getStyles = (theme, STAY_ACCENT) => StyleSheet.create({
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
  headerSpacer: {
    width: 28,
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
  contactButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.buttonBg,
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
  map: {
    borderRadius: 12,
    overflow: 'hidden',
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
    padding: 12,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  detailValue: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
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
    backgroundColor: theme.colors.buttonBg,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.buttonText,
  },
});
