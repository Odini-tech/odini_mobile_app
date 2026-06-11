import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useCurrency } from '../../context/CurrencyContext';
import EventBookingModal from '../booking/EventBooking';
import SuggestionCarousel from '../SuggestionCarousel';
import ImageCarousel from '../shared/ImageCarousel';
import burgundyTheme, { getListingTypeColor } from '../../theme/burgundyTheme';

const EVENT_ACCENT = getListingTypeColor('event');

export default function EventDetail({ listing, onClose }) {
  const [showBooking, setShowBooking] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { formatPrice } = useCurrency();

  const eventDetails = listing.events?.[0] || {};

  const formatEventTime = (timestamp) => {
    if (!timestamp) return 'TBD';
    return new Date(timestamp).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Modal visible animationType="slide">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="chevron-back" size={28} color={burgundyTheme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Event Details</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <ImageCarousel
            images={listing.images}
            containerStyle={styles.imagesContainer}
            imageStyle={styles.image}
            placeholder={
              <View style={[styles.image, styles.imagePlaceholder]}>
                <Ionicons name="calendar" size={60} color={EVENT_ACCENT} />
              </View>
            }
          />

          <View style={styles.content}>
            <Text style={styles.title}>{listing.title}</Text>

            <View style={styles.badgeRow}>
              <View style={styles.eventBadge}>
                <Ionicons name="calendar" size={14} color={burgundyTheme.colors.white} />
                <Text style={styles.badgeText}>
                  {eventDetails.event_type?.toUpperCase() || 'EVENT'}
                </Text>
              </View>
            </View>

            <View style={styles.ratingRow}>
              <View style={styles.ratingStars}>
                <Ionicons name="star" size={16} color="#FFB800" />
                <Text style={styles.rating}>{listing.average_rating?.toFixed(1) || 'N/A'}</Text>
              </View>
              <Text style={styles.reviews}>({listing.review_count || 0} reviews)</Text>
            </View>

            <View style={styles.hostSection}>
              <View style={styles.hostInfo}>
                <View style={styles.hostAvatar}>
                  <Ionicons name="person" size={24} color={burgundyTheme.colors.white} />
                </View>
                <View>
                  <Text style={styles.hostName}>{listing.profiles?.firstname || 'Host'}</Text>
                  <Text style={styles.hostRole}>Event Organizer</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.contactButton}>
                <Ionicons name="chatbubble-outline" size={20} color={EVENT_ACCENT} />
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Location</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location" size={16} color={burgundyTheme.colors.primary} />
                <Text style={styles.locationText}>
                  {listing.address_city}, {listing.address_country}
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Event Information</Text>
              <View style={styles.detailsGrid}>
                <View style={styles.detailCard}>
                  <Ionicons name="time" size={24} color={EVENT_ACCENT} />
                  <Text style={styles.detailLabel}>Date & Time</Text>
                  <Text style={styles.detailValue} numberOfLines={2}>
                    {formatEventTime(eventDetails.event_time)}
                  </Text>
                </View>
                <View style={styles.detailCard}>
                  <Ionicons name="people" size={24} color={EVENT_ACCENT} />
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
                  {listing.amenities.map((amenity, idx) => (
                    <View key={idx} style={styles.amenityTag}>
                      <Ionicons name="checkmark-circle" size={12} color={EVENT_ACCENT} />
                      <Text style={styles.amenityText}>{amenity}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.bookingSection}>
              <View>
                <Text style={styles.priceLabel}>Price per ticket</Text>
                <Text style={styles.price}>{formatPrice(listing.price || 0)}</Text>
              </View>
              <TouchableOpacity style={styles.bookButton} onPress={() => setShowBooking(true)}>
                <Text style={styles.bookButtonText}>Get Tickets</Text>
              </TouchableOpacity>
            </View>
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
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: burgundyTheme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: burgundyTheme.colors.border,
    backgroundColor: burgundyTheme.colors.surface,
  },
  headerSpacer: {
    width: 28,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: burgundyTheme.colors.text,
  },
  imagesContainer: {
    height: 300,
    backgroundColor: burgundyTheme.colors.surfaceAlt,
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
    color: burgundyTheme.colors.text,
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
    color: burgundyTheme.colors.white,
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
    color: burgundyTheme.colors.text,
  },
  reviews: {
    fontSize: 12,
    color: burgundyTheme.colors.textSubtle,
  },
  hostSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: burgundyTheme.colors.border,
    borderRadius: 16,
    backgroundColor: burgundyTheme.colors.surface,
    ...burgundyTheme.shadow,
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hostAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: EVENT_ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hostName: {
    fontSize: 14,
    fontWeight: '600',
    color: burgundyTheme.colors.text,
  },
  hostRole: {
    fontSize: 12,
    color: burgundyTheme.colors.textSubtle,
    marginTop: 2,
  },
  contactButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: burgundyTheme.colors.surfaceAlt,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: burgundyTheme.colors.text,
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: burgundyTheme.colors.surface,
    borderWidth: 1,
    borderColor: burgundyTheme.colors.border,
  },
  locationText: {
    fontSize: 14,
    color: burgundyTheme.colors.textMuted,
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailCard: {
    flex: 1,
    backgroundColor: burgundyTheme.colors.surface,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: burgundyTheme.colors.border,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: burgundyTheme.colors.text,
    textAlign: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: burgundyTheme.colors.textSubtle,
  },
  amenitiesGrid: {
    gap: 8,
  },
  amenityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: burgundyTheme.colors.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: burgundyTheme.colors.border,
  },
  amenityText: {
    fontSize: 13,
    color: burgundyTheme.colors.textMuted,
    fontWeight: '500',
  },
  description: {
    fontSize: 14,
    color: burgundyTheme.colors.textMuted,
    lineHeight: 20,
  },
  bookingSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: burgundyTheme.colors.border,
    marginBottom: 20,
  },
  priceLabel: {
    fontSize: 12,
    color: burgundyTheme.colors.textSubtle,
    marginBottom: 4,
  },
  price: {
    fontSize: 24,
    fontWeight: '700',
    color: burgundyTheme.colors.text,
  },
  bookButton: {
    backgroundColor: EVENT_ACCENT,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: burgundyTheme.colors.white,
  },
});
