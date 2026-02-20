import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../../lib/supabase';
import bookingService from '../../../src/services/bookingService';

export default function OfferingBookingModal({ listing, offeringDetails, onClose, onConfirm }) {
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [serviceTime, setServiceTime] = useState('10:00');
  const [quantity, setQuantity] = useState('1');
  const [specialRequests, setSpecialRequests] = useState('');

  const priceRange = offeringDetails.price_range || 'Contact for price';
  const estimatedPrice = 100; // Default estimate

  const handleConfirm = () => {
    if (!serviceDate || !serviceTime) {
      alert('Please select date and time');
      return;
    }
    (async () => {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      const userId = userData?.user?.id || null;
      if (userErr || !userId) {
        alert('You must be signed in to request this service.');
        return;
      }

      const payload = {
        reservation_time: `${serviceDate}T${serviceTime}:00.000Z`,
        quantity: parseInt(quantity, 10) || 1,
      };

      const res = await bookingService.createBooking({
        userId,
        listingId: listing.id,
        listingType: 'offering',
        priceAtBooking: 0,
        payload,
      });

      if (res.error) {
        alert(res.error.message || 'Failed to create booking');
        return;
      }

      onConfirm && onConfirm(res.data);
      onClose && onClose();
    })();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Modal visible transparent animationType="slide">
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#1A1A1A" />
            </TouchableOpacity>
            <Text style={styles.title}>Book Service</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Service Info Card */}
          <View style={styles.serviceCard}>
            <View style={styles.serviceBadge}>
              <Ionicons name="briefcase" size={14} color="#FFF" />
              <Text style={styles.badgeText}>
                {offeringDetails.service_type?.toUpperCase() || 'SERVICE'}
              </Text>
            </View>
            <Text style={styles.serviceTitle}>{listing.title}</Text>
            <Text style={styles.serviceDescription} numberOfLines={2}>
              {listing.description}
            </Text>
            <View style={styles.serviceProvider}>
              <Ionicons name="person-circle" size={36} color="#2ECC71" />
              <View style={{ flex: 1 }}>
                <Text style={styles.providerName}>
                  {listing.profiles?.firstname || 'Service Provider'}
                </Text>
                <Text style={styles.providerRole}>Professional Service Provider</Text>
              </View>
            </View>
          </View>

          {/* Service Date & Time */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Schedule Service</Text>
            <View style={styles.dateTimeRow}>
              <View style={styles.dateField}>
                <Text style={styles.label}>Date</Text>
                <TextInput
                  style={styles.input}
                  value={serviceDate}
                  onChangeText={setServiceDate}
                  placeholder="YYYY-MM-DD"
                />
              </View>
              <View style={styles.timeField}>
                <Text style={styles.label}>Time</Text>
                <TextInput
                  style={styles.input}
                  value={serviceTime}
                  onChangeText={setServiceTime}
                  placeholder="HH:MM"
                />
              </View>
            </View>
            <Text style={styles.dateInfo}>
              {formatDate(serviceDate)} at {serviceTime}
            </Text>
          </View>

          {/* Quantity */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quantity/Duration</Text>
            <View style={styles.counter}>
              <TouchableOpacity onPress={() => setQuantity(Math.max('1', (parseInt(quantity) - 1).toString()))}>
                <Ionicons name="remove" size={24} color="#2ECC71" />
              </TouchableOpacity>
              <Text style={styles.counterValue}>{quantity}</Text>
              <TouchableOpacity 
                onPress={() => setQuantity((parseInt(quantity) + 1).toString())}
              >
                <Ionicons name="add" size={24} color="#2ECC71" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Client Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Information</Text>
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor="#999"
            />
            <TextInput
              style={[styles.input, { marginTop: 10 }]}
              placeholder="Email"
              placeholderTextColor="#999"
              keyboardType="email-address"
            />
            <TextInput
              style={[styles.input, { marginTop: 10 }]}
              placeholder="Phone Number"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
            />
          </View>

          {/* Location */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Service Location</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location" size={16} color="#666" />
              <Text style={styles.locationText}>
                {listing.address_city}, {listing.address_country}
              </Text>
            </View>
          </View>

          {/* Special Requests */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Special Requests</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Any special requests or requirements?"
              value={specialRequests}
              onChangeText={setSpecialRequests}
              multiline
              numberOfLines={4}
              placeholderTextColor="#999"
            />
          </View>

          {/* Price Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pricing</Text>
            <View style={styles.priceBreakdown}>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Service Price Range</Text>
                <Text style={styles.priceValue}>{priceRange}</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Estimated Total</Text>
                <Text style={styles.priceValue}>${estimatedPrice}</Text>
              </View>
              <Text style={styles.priceNote}>
                Final price will be confirmed by the service provider
              </Text>
            </View>
          </View>

          {/* Terms */}
          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              By requesting this service, you agree to the service provider's terms and conditions.
            </Text>
          </View>
        </ScrollView>

        {/* Book Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.button}
            onPress={handleConfirm}
          >
            <Text style={styles.buttonText}>Request Service</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  serviceCard: {
    backgroundColor: '#F0FFF6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#2ECC71',
  },
  serviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2ECC71',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  serviceDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
    lineHeight: 18,
  },
  serviceProvider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTopY: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0F5E9',
  },
  providerName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  providerRole: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
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
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateField: {
    flex: 1,
  },
  timeField: {
    width: 100,
  },
  label: {
    fontSize: 12,
    color: '#999',
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1A1A1A',
  },
  dateInfo: {
    fontSize: 12,
    color: '#2ECC71',
    marginTop: 8,
    fontWeight: '600',
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: '#D0F0E0',
    borderRadius: 8,
    paddingVertical: 16,
  },
  counterValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
  },
  locationText: {
    fontSize: 13,
    color: '#666',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1A1A1A',
    textAlignVertical: 'top',
  },
  priceBreakdown: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 13,
    color: '#666',
  },
  priceValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  priceNote: {
    fontSize: 11,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
  termsContainer: {
    paddingVertical: 12,
  },
  termsText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 16,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  button: {
    backgroundColor: '#2ECC71',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
});
