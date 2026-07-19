import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
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

const toDateOnlyString = (date) => date.toISOString().split('T')[0];
const pad2 = (n) => n.toString().padStart(2, '0');
const toTimeString = (date) => `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;

export default function OfferingBookingModal({ listing, offeringDetails, onClose, onConfirm }) {
  const { theme } = useAppMode();
  const router = useRouter();
  const OFFERING_ACCENT = theme.listingTypeColors.offering;
  const styles = getStyles(theme, OFFERING_ACCENT);
  const { formatPrice } = useCurrency();
  const [serviceDate, setServiceDate] = useState(() => toDateOnlyString(new Date()));
  const [serviceTimeObj, setServiceTimeObj] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 30, 0, 0);
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [quantity, setQuantity] = useState('1');
  const [specialRequests, setSpecialRequests] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [processing, setProcessing] = useState(false);
  const [submittedBooking, setSubmittedBooking] = useState(null);
  const [remainingSlots, setRemainingSlots] = useState(null);

  const serviceTime = toTimeString(serviceTimeObj);
  const today = toDateOnlyString(new Date());
  const isToday = serviceDate === today;

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (event.type === 'dismissed' || !selectedDate) return;
    const iso = toDateOnlyString(selectedDate);
    setServiceDate(iso);
    // If moving to today and the current time selection has already passed, push it forward.
    const now = new Date();
    if (iso === toDateOnlyString(now) && serviceTimeObj <= now) {
      const bumped = new Date(now);
      bumped.setMinutes(bumped.getMinutes() + 30, 0, 0);
      setServiceTimeObj(bumped);
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (event.type === 'dismissed' || !selectedTime) return;
    if (isToday && selectedTime <= new Date()) {
      // Can't pick a time that's already passed today — silently clamp to the earliest valid time.
      const bumped = new Date();
      bumped.setMinutes(bumped.getMinutes() + 30, 0, 0);
      setServiceTimeObj(bumped);
      return;
    }
    setServiceTimeObj(selectedTime);
  };

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!serviceDate || !serviceTime) return;
      const res = await bookingService.checkOfferingAvailability({
        listingId: listing.id,
        quantity: 0,
        reservationTime: `${serviceDate}T${serviceTime}:00.000Z`,
      });
      if (!cancelled) setRemainingSlots(Number.isFinite(res.remaining) ? res.remaining : null);
    })();
    return () => {
      cancelled = true;
    };
  }, [listing.id, serviceDate, serviceTime]);

  const estimatedPrice = listing.price || 0;
  const maxQuantity = remainingSlots == null ? 99 : Math.max(0, remainingSlots);
  const soldOut = remainingSlots != null && remainingSlots <= 0;

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
        alert('You must be signed in to request this activity.');
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

      setSubmittedBooking(res.data);
    } finally {
      setProcessing(false);
    }
  };

  const handleViewStatus = () => {
    router.push('/bookings');
    onClose && onClose();
  };

  const handleDone = () => {
    onConfirm && onConfirm(submittedBooking);
    onClose && onClose();
  };

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

  if (submittedBooking) {
    return (
      <Modal visible transparent animationType="slide">
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.successContainer}>
            <View style={[styles.successIcon, { backgroundColor: OFFERING_ACCENT + '22' }]}>
              <Ionicons name="checkmark-circle" size={56} color={OFFERING_ACCENT} />
            </View>
            <Text style={styles.successTitle}>Request Sent</Text>
            <Text style={styles.successBody}>
              Your request has been sent to the provider. You&apos;ll be notified once it&apos;s approved.
            </Text>
            <Text style={styles.successRef}>{submittedBooking.booking_ref}</Text>
          </View>
          <View style={styles.footer}>
            <TouchableOpacity style={styles.button} onPress={handleViewStatus}>
              <Text style={styles.buttonText}>View Status</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleDone}>
              <Text style={styles.secondaryButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal visible transparent animationType="slide">
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Book Activity</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.serviceCard}>
            <View style={styles.serviceBadge}>
              <Ionicons name="compass" size={14} color={theme.colors.white} />
              <Text style={styles.badgeText}>
                {offeringDetails.service_type?.toUpperCase() || 'ACTIVITY'}
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
                  {listing.profiles?.firstname || 'Activity Host'}
                </Text>
                <Text style={styles.providerRole}>Professional Activity Host</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Schedule Activity</Text>
            <View style={styles.dateTimeRow}>
              <View style={styles.dateField}>
                <Text style={styles.label}>Date</Text>
                <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
                  <Text style={{ color: theme.colors.text }}>{serviceDate}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.timeField}>
                <Text style={styles.label}>Time</Text>
                <TouchableOpacity style={styles.input} onPress={() => setShowTimePicker(true)}>
                  <Text style={{ color: theme.colors.text }}>{serviceTime}</Text>
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.dateInfo}>
              {formatDate(serviceDate)} at {serviceTime}
            </Text>
            {showDatePicker && (
              <DateTimePicker
                value={new Date(serviceDate)}
                mode="date"
                minimumDate={new Date(today)}
                onChange={handleDateChange}
              />
            )}
            {showTimePicker && (
              <DateTimePicker
                value={serviceTimeObj}
                mode="time"
                minimumDate={isToday ? new Date() : undefined}
                onChange={handleTimeChange}
              />
            )}
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
              <TouchableOpacity
                onPress={() => setQuantity(Math.min(maxQuantity, parseInt(quantity, 10) + 1).toString())}
                disabled={parseInt(quantity, 10) >= maxQuantity}
              >
                <Ionicons name="add" size={24} color={OFFERING_ACCENT} />
              </TouchableOpacity>
            </View>
            {remainingSlots != null && (
              <Text style={soldOut ? styles.soldOutText : styles.availabilityText}>
                {soldOut ? 'This time slot is fully booked' : `${remainingSlots} slot${remainingSlots === 1 ? '' : 's'} left at this time`}
              </Text>
            )}
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
                Final price will be confirmed by the activity host
              </Text>
            </View>
          </View>

          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              By requesting this activity, you agree to the activity host&apos;s terms and
              conditions.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, (processing || soldOut) && styles.buttonDisabled]}
            onPress={handleConfirm}
            disabled={processing || soldOut}
          >
            <Text style={styles.buttonText}>
              {soldOut ? 'Fully Booked' : processing ? 'Submitting...' : 'Request Activity'}
            </Text>
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
  secondaryButton: {
    marginTop: 10,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  availabilityText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 8,
  },
  soldOutText: {
    fontSize: 12,
    color: theme.colors.error || '#EF4444',
    marginTop: 8,
    fontWeight: '600',
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 10,
  },
  successBody: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  successRef: {
    fontSize: 12,
    color: theme.colors.textSubtle,
    fontWeight: '600',
  },
});
