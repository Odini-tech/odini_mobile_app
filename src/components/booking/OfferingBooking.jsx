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
import burgundyTheme, { getListingTypeColor } from '../../theme/burgundyTheme';

const OFFERING_ACCENT = getListingTypeColor('offering');

export default function OfferingBookingModal({ listing, offeringDetails, onClose, onConfirm }) {
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [serviceTime, setServiceTime] = useState('10:00');
  const [quantity, setQuantity] = useState('1');
  const [specialRequests, setSpecialRequests] = useState('');

  const priceRange = offeringDetails.price_range || 'Contact for price';
  const estimatedPrice = 100;

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

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

  return (
    <Modal visible transparent animationType="slide">
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={burgundyTheme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Book Service</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.serviceCard}>
            <View style={styles.serviceBadge}>
              <Ionicons name="briefcase" size={14} color={burgundyTheme.colors.white} />
              <Text style={styles.badgeText}>
                {offeringDetails.service_type?.toUpperCase() || 'SERVICE'}
              </Text>
            </View>
            <Text style={styles.serviceTitle}>{listing.title}</Text>
            <Text style={styles.serviceDescription} numberOfLines={2}>
              {listing.description}
            </Text>
            <View style={styles.serviceProvider}>
              <Ionicons name="person-circle" size={36} color={OFFERING_ACCENT} />
              <View style={styles.providerCopy}>
                <Text style={styles.providerName}>
                  {listing.profiles?.firstname || 'Service Provider'}
                </Text>
                <Text style={styles.providerRole}>Professional Service Provider</Text>
              </View>
            </View>
          </View>

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
                  placeholderTextColor={burgundyTheme.colors.textSubtle}
                />
              </View>
              <View style={styles.timeField}>
                <Text style={styles.label}>Time</Text>
                <TextInput
                  style={styles.input}
                  value={serviceTime}
                  onChangeText={setServiceTime}
                  placeholder="HH:MM"
                  placeholderTextColor={burgundyTheme.colors.textSubtle}
                />
              </View>
            </View>
            <Text style={styles.dateInfo}>
              {formatDate(serviceDate)} at {serviceTime}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quantity/Duration</Text>
            <View style={styles.counter}>
              <TouchableOpacity
                onPress={() => setQuantity(Math.max('1', (parseInt(quantity, 10) - 1).toString()))}
              >
                <Ionicons name="remove" size={24} color={OFFERING_ACCENT} />
              </TouchableOpacity>
              <Text style={styles.counterValue}>{quantity}</Text>
              <TouchableOpacity onPress={() => setQuantity((parseInt(quantity, 10) + 1).toString())}>
                <Ionicons name="add" size={24} color={OFFERING_ACCENT} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Information</Text>
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor={burgundyTheme.colors.textSubtle}
            />
            <TextInput
              style={[styles.input, styles.spacedInput]}
              placeholder="Email"
              placeholderTextColor={burgundyTheme.colors.textSubtle}
              keyboardType="email-address"
            />
            <TextInput
              style={[styles.input, styles.spacedInput]}
              placeholder="Phone Number"
              placeholderTextColor={burgundyTheme.colors.textSubtle}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Service Location</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location" size={16} color={burgundyTheme.colors.primary} />
              <Text style={styles.locationText}>
                {listing.address_city}, {listing.address_country}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Special Requests</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Any special requests or requirements?"
              value={specialRequests}
              onChangeText={setSpecialRequests}
              multiline
              numberOfLines={4}
              placeholderTextColor={burgundyTheme.colors.textSubtle}
            />
          </View>

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

          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              By requesting this service, you agree to the service provider&apos;s terms and
              conditions.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.button} onPress={handleConfirm}>
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
    backgroundColor: burgundyTheme.colors.background,
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
  headerSpacer: {
    width: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: burgundyTheme.colors.text,
  },
  serviceCard: {
    backgroundColor: burgundyTheme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: OFFERING_ACCENT,
    borderWidth: 1,
    borderColor: burgundyTheme.colors.border,
    ...burgundyTheme.shadow,
  },
  serviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: OFFERING_ACCENT,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: burgundyTheme.colors.white,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: burgundyTheme.colors.text,
    marginBottom: 8,
  },
  serviceDescription: {
    fontSize: 13,
    color: burgundyTheme.colors.textMuted,
    marginBottom: 12,
    lineHeight: 18,
  },
  serviceProvider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: burgundyTheme.colors.border,
  },
  providerCopy: {
    flex: 1,
  },
  providerName: {
    fontSize: 13,
    fontWeight: '600',
    color: burgundyTheme.colors.text,
  },
  providerRole: {
    fontSize: 11,
    color: burgundyTheme.colors.textSubtle,
    marginTop: 2,
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
    color: burgundyTheme.colors.textSubtle,
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: burgundyTheme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: burgundyTheme.colors.text,
    backgroundColor: burgundyTheme.colors.surface,
  },
  spacedInput: {
    marginTop: 10,
  },
  dateInfo: {
    fontSize: 12,
    color: OFFERING_ACCENT,
    marginTop: 8,
    fontWeight: '600',
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: burgundyTheme.colors.border,
    borderRadius: 12,
    paddingVertical: 16,
    backgroundColor: burgundyTheme.colors.surface,
  },
  counterValue: {
    fontSize: 24,
    fontWeight: '700',
    color: burgundyTheme.colors.text,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: burgundyTheme.colors.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: burgundyTheme.colors.border,
  },
  locationText: {
    fontSize: 13,
    color: burgundyTheme.colors.textMuted,
  },
  textArea: {
    borderWidth: 1,
    borderColor: burgundyTheme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: burgundyTheme.colors.text,
    textAlignVertical: 'top',
    backgroundColor: burgundyTheme.colors.surface,
  },
  priceBreakdown: {
    backgroundColor: burgundyTheme.colors.surfaceAlt,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: burgundyTheme.colors.border,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 13,
    color: burgundyTheme.colors.textMuted,
  },
  priceValue: {
    fontSize: 13,
    fontWeight: '600',
    color: burgundyTheme.colors.text,
  },
  priceNote: {
    fontSize: 11,
    color: burgundyTheme.colors.textSubtle,
    marginTop: 8,
    fontStyle: 'italic',
  },
  termsContainer: {
    paddingVertical: 12,
  },
  termsText: {
    fontSize: 12,
    color: burgundyTheme.colors.textSubtle,
    textAlign: 'center',
    lineHeight: 16,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: burgundyTheme.colors.border,
    backgroundColor: burgundyTheme.colors.surface,
  },
  button: {
    backgroundColor: OFFERING_ACCENT,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: burgundyTheme.colors.white,
  },
});
