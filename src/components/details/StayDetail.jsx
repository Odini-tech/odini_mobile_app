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
  View
} from 'react-native';
import StayBookingModal from '../booking/StayBooking';
import ImageCarousel from '../shared/ImageCarousel';

export default function StayDetail({ listing, onClose }) {
  const [showBooking, setShowBooking] = useState(false);
  const [loading, setLoading] = useState(false);

  const stayDetails = listing.stays?.[0] || {};

  const handleBook = () => {
    setShowBooking(true);
  };

  return (
    <Modal visible animationType="slide">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="chevron-back" size={28} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Stay Details</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Images */}
        <ImageCarousel
          images={listing.images}
          containerStyle={styles.imagesContainer}
          imageStyle={styles.image}
          placeholder={
            <View style={[styles.image, styles.imagePlaceholder]}>
              <Ionicons name="home" size={60} color="#4A90E2" />
            </View>
          }
        />

          {/* Title and Rating */}
          <View style={styles.content}>
            <Text style={styles.title}>{listing.title}</Text>
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
                    {listing.profiles?.firstname || 'Host'}
                  </Text>
                  <Text style={styles.hostRole}>Verified Host</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.contactButton}>
                <Ionicons name="chatbubble-outline" size={20} color="#4A90E2" />
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

            {/* Stay Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Accommodation Details</Text>
              <View style={styles.detailsGrid}>
                <View style={styles.detailCard}>
                  <Ionicons name="door-open" size={24} color="#4A90E2" />
                  <Text style={styles.detailValue}>{stayDetails.available_rooms || 0}</Text>
                  <Text style={styles.detailLabel}>Rooms</Text>
                </View>
                <View style={styles.detailCard}>
                  <Ionicons name="people" size={24} color="#4A90E2" />
                  <Text style={styles.detailValue}>{stayDetails.max_guests || 0}</Text>
                  <Text style={styles.detailLabel}>Guests</Text>
                </View>
                <View style={styles.detailCard}>
                  <Ionicons name="moon" size={24} color="#4A90E2" />
                  <Text style={styles.detailValue}>{stayDetails.durations_nights || 0}</Text>
                  <Text style={styles.detailLabel}>Nights Min</Text>
                </View>
              </View>
            </View>

            {/* Amenities */}
            {listing.amenities && listing.amenities.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Amenities</Text>
                <View style={styles.amenitiesGrid}>
                  {listing.amenities.map((amenity, idx) => (
                    <View key={idx} style={styles.amenityTag}>
                      <Text style={styles.amenityText}>{amenity}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Description */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About this place</Text>
              <Text style={styles.description}>{listing.description}</Text>
            </View>

            {/* Price and Book Button */}
            <View style={styles.bookingSection}>
              <View>
                <Text style={styles.priceLabel}>Price per night</Text>
                <Text style={styles.price}>${listing.price|| 0}</Text>
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
          <StayBookingModal
            listing={listing}
            stayDetails={stayDetails}
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
    backgroundColor: '#F0F7FF',
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
    color: '#1A1A1A',
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
    backgroundColor: '#4A90E2',
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
    backgroundColor: '#F0F7FF',
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
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 8,
  },
  detailValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  detailLabel: {
    fontSize: 12,
    color: '#999',
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityTag: {
    backgroundColor: '#F0F7FF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  amenityText: {
    fontSize: 12,
    color: '#4A90E2',
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
    backgroundColor: '#4A90E2',
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
