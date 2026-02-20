import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Image,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import OfferingBookingModal from '../booking/OfferingBooking';

export default function OfferingDetail({ listing, onClose }) {
  const [showBooking, setShowBooking] = useState(false);

  const offeringDetails = listing.offering?.[0] || {};

  const handleBook = () => {
    setShowBooking(true);
  };

  const parseHours = (hoursString) => {
    if (!hoursString) return [];
    return hoursString.split(',').map(h => h.trim());
  };

  return (
    <Modal visible animationType="slide">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="chevron-back" size={28} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Service Details</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Images */}
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.imagesContainer}
          >
            {listing.images?.length > 0 ? (
              listing.images.map((image, idx) => (
                <Image
                  key={idx}
                  source={{ uri: image }}
                  style={styles.image}
                />
              ))
            ) : (
              <View style={[styles.image, styles.imagePlaceholder]}>
                <Ionicons name="briefcase" size={60} color="#2ECC71" />
              </View>
            )}
          </ScrollView>

          {/* Title and Rating */}
          <View style={styles.content}>
            <Text style={styles.title}>{listing.title}</Text>
            
            {/* Service Badge */}
            <View style={styles.badgeRow}>
              <View style={styles.serviceBadge}>
                <Ionicons name="briefcase" size={14} color="#FFF" />
                <Text style={styles.badgeText}>
                  {offeringDetails.service_type?.toUpperCase() || 'SERVICE'}
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

            {/* Host Info */}
            <View style={styles.hostSection}>
              <View style={styles.hostInfo}>
                <View style={styles.hostAvatar}>
                  <Ionicons name="person" size={24} color="#FFF" />
                </View>
                <View>
                  <Text style={styles.hostName}>
                    {listing.profiles?.firstname || 'Service Provider'}
                  </Text>
                  <Text style={styles.hostRole}>Professional</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.contactButton}>
                <Ionicons name="chatbubble-outline" size={20} color="#2ECC71" />
              </TouchableOpacity>
            </View>

            {/* Location */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Location</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location" size={16} color="#666" />
                <Text style={styles.locationText}>
                  {listing.address_city}, {listing.address_country}
                </Text>
              </View>
            </View>

            {/* Service Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Service Information</Text>
              <View style={styles.detailsGrid}>
                <View style={styles.detailCard}>
                  <Ionicons name="briefcase" size={24} color="#2ECC71" />
                  <Text style={styles.detailLabel}>Service Type</Text>
                  <Text style={styles.detailValue}>
                    {offeringDetails.service_type || 'Service'}
                  </Text>
                </View>
                <View style={styles.detailCard}>
                  <Ionicons name="pricetag" size={24} color="#2ECC71" />
                  <Text style={styles.detailLabel}>Price Range</Text>
                  <Text style={styles.detailValue}>
                    {offeringDetails.price_range || 'Contact for price'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Operating Hours */}
            {offeringDetails.opening_hours && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Operating Hours</Text>
                {parseHours(offeringDetails.opening_hours).map((hour, idx) => (
                  <View key={idx} style={styles.hourRow}>
                    <Ionicons name="time" size={14} color="#666" />
                    <Text style={styles.hourText}>{hour}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Description */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About this service</Text>
              <Text style={styles.description}>{listing.description}</Text>
            </View>

            {/* Amenities */}
            {listing.amenities && listing.amenities.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>What's Included</Text>
                <View style={styles.amenitiesGrid}>
                  {listing.amenities.map((amenity, idx) => (
                    <View key={idx} style={styles.amenityTag}>
                      <Ionicons name="checkmark-circle" size={12} color="#2ECC71" />
                      <Text style={styles.amenityText}>{amenity}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Price and Book Button */}
            <View style={styles.bookingSection}>
              <View>
                <Text style={styles.priceLabel}>Starting from</Text>
                <Text style={styles.price}>{offeringDetails.price_range || '$0'}</Text>
              </View>
              <TouchableOpacity
                style={styles.bookButton}
                onPress={handleBook}
              >
                <Text style={styles.bookButtonText}>Book Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {showBooking && (
          <OfferingBookingModal
            listing={listing}
            offeringDetails={offeringDetails}
            onClose={() => setShowBooking(false)}
            onConfirm={() => {
              setShowBooking(false);
              // Handle booking confirmation
            }}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  imagesContainer: {
    height: 300,
    backgroundColor: '#F0FFF6',
  },
  image: {
    width: '100%',
    height: 300,
    aspectRatio: 1,
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
    color: '#1A1A1A',
    marginBottom: 12,
  },
  badgeRow: {
    marginBottom: 12,
  },
  serviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2ECC71',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
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
    color: '#1A1A1A',
  },
  reviews: {
    fontSize: 12,
    color: '#999',
  },
  hostSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F0F0F0',
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
    backgroundColor: '#2ECC71',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hostName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  hostRole: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  contactButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0FFF6',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailCard: {
    flex: 1,
    backgroundColor: '#F0FFF6',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 8,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: '#999',
  },
  hourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  hourText: {
    fontSize: 13,
    color: '#666',
  },
  amenitiesGrid: {
    gap: 8,
  },
  amenityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FFF6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  amenityText: {
    fontSize: 13,
    color: '#2ECC71',
    fontWeight: '500',
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  bookingSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    marginBottom: 20,
  },
  priceLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  price: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  bookButton: {
    backgroundColor: '#2ECC71',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
});
