import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { useCurrency } from '../../context/CurrencyContext';
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
import { useAppMode } from '../../context/AppModeContext';

export default function OfferingBookingModal({ listing, offeringDetails, onClose, onConfirm }) {
  const { theme } = useAppMode();
  const OFFERING_ACCENT = theme.listingTypeColors.offering;
  const styles = getStyles(theme, OFFERING_ACCENT);
  const { formatPrice } = useCurrency();
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [serviceTime, setServiceTime] = useState('10:00');
  const [quantity, setQuantity] = useState('1');
  const [specialRequests, setSpecialRequests] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id;
        if (!userId) return;

        if (authData.user.email) setGuestEmail(authData.user.email);

        const { data: profile } = await supabase
          .from('profiles')
          .select('firstname, lastname, phone_number')
          .eq('id', userId)
          .maybeSingle();

        if (profile) {
          const fullName = [profile.firstname, profile.lastname].filter(Boolean).join(' ');
          if (fullName) setGuestName(fullName);
          if (profile.phone_number) setGuestPhone(profile.phone_number);
        }
      } catch (_) {}
    })();
  }, []);

  const estimatedPrice = listing.price || 0;

  const handleConfirm = async () => {
    if (!serviceDate || !serviceTime) {
      alert('Please select date and time');
      return;
    }
    setProcessing(true);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      const userId = userData?.user?.id || null;
      if (userErr || !userId) {
        alert('You must be signed in to request this service.');
        return;
      }

      const nameParts = guestName.trim().split(' ');
      const payload = {
        reservation_time: `${serviceDate}T${serviceTime}:00.000Z`,
        quantity: parseInt(quantity, 10) || 1,
        guest_firstname: nameParts[0] || null,
        guest_lastname: nameParts.slice(1).join(' ') || null,
        guest_email: guestEmail || null,
        guest_phone: guestPhone || null,
        notes: specialRequests || null,
      };

      const res = await bookingService.createBooking({
        userId,
        listingId: listing.id,
        listingType: 'offering',
        priceAtBooking: estimatedPrice,
        payload,
      });

      if (res.error) {
        alert(res.error.message || 'Failed to create booking');
        return;
      }

      onConfirm && onConfirm(res.data);
      onClose && onClose();
    } finally {
      setProcessing(false);
    }
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
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Book Service</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.serviceCard}>
            <View style={styles.serviceBadge}>
              <Ionicons name="briefcase" size={14} color={theme.colors.white} />
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
                  placeholderTextColor={theme.colors.textSubtle}
                />
              </View>
              <View style={styles.timeField}>
                <Text style={styles.label}>Time</Text>
                <TextInput
                  style={styles.input}
                  value={serviceTime}
                  onChangeText={setServiceTime}
                  placeholder="HH:MM"
                  placeholderTextColor={theme.colors.textSubtle}
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
                onPress={() => setQuantity(Math.max(1, parseInt(quantity, 10) - 1).toString())}
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
              placeholderTextColor={theme.colors.textSubtle}
              value={guestName}
              onChangeText={setGuestName}
            />
            <TextInput
              style={[styles.input, styles.spacedInput]}
              placeholder="Email"
              placeholderTextColor={theme.colors.textSubtle}
              keyboardType="email-address"
              value={guestEmail}
              onChangeText={setGuestEmail}
              autoCapitalize="none"
            />
            <TextInput
              style={[styles.input, styles.spacedInput]}
              placeholder="Phone Number"
              placeholderTextColor={theme.colors.textSubtle}
              keyboardType="phone-pad"
              value={guestPhone}
              onChangeText={setGuestPhone}
            />
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
              placeholderTextColor={theme.colors.textSubtle}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pricing</Text>
            <View style={styles.priceBreakdown}>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Estimated Total</Text>
                <Text style={styles.priceValue}>{estimatedPrice ? formatPrice(estimatedPrice) : 'TBD'}</Text>
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
          <TouchableOpacity style={[styles.button, processing && styles.buttonDisabled]} onPress={handleConfirm} disabled={processing}>
            <Text style={styles.buttonText}>{processing ? 'Submitting...' : 'Request Service'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const getStyles = (theme, OFFERING_ACCENT) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
    color: theme.colors.text,
  },
  serviceCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: OFFERING_ACCENT,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow,
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
    color: theme.colors.white,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
  },
  serviceDescription: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginBottom: 12,
    lineHeight: 18,
  },
  serviceProvider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  providerCopy: {
    flex: 1,
  },
  providerName: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
  providerRole: {
    fontSize: 11,
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
    color: theme.colors.textSubtle,
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
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
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingVertical: 16,
    backgroundColor: theme.colors.surface,
  },
  counterValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
  },
  textArea: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.text,
    textAlignVertical: 'top',
    backgroundColor: theme.colors.surface,
  },
  priceBreakdown: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  priceValue: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
  priceNote: {
    fontSize: 11,
    color: theme.colors.textSubtle,
    marginTop: 4,
    fontStyle: 'italic',
  },
  termsContainer: {
    paddingVertical: 12,
  },
  termsText: {
    fontSize: 12,
    color: theme.colors.textSubtle,
    textAlign: 'center',
    lineHeight: 16,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  button: {
    backgroundColor: OFFERING_ACCENT,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.white,
  },
});
