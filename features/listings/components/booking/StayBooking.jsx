import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useCurrency } from '@/store/CurrencyContext';
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
import { supabase } from '@/services/supabase/client';
import bookingService from '@/services/bookingService';
import { useAppMode } from '@/store/AppModeContext';
import { formatCount } from '@/utils/formatCount';

const toDateOnlyString = (date) => date.toISOString().split('T')[0];

const addDays = (dateStr, days) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return toDateOnlyString(d);
};

export default function StayBookingModal({ listing, stayDetails, onClose, onConfirm }) {
  const { theme } = useAppMode();
  const router = useRouter();
  const STAY_ACCENT = theme.listingTypeColors.stay;
  const styles = getStyles(theme, STAY_ACCENT);
  const { formatPrice } = useCurrency();
  const [checkInDate, setCheckInDate] = useState(() => toDateOnlyString(new Date()));
  const [checkOutDate, setCheckOutDate] = useState(() => addDays(toDateOnlyString(new Date()), 1));
  const [showCheckInPicker, setShowCheckInPicker] = useState(false);
  const [showCheckOutPicker, setShowCheckOutPicker] = useState(false);
  const [guestCount, setGuestCount] = useState('1');
  const [rooms, setRooms] = useState('1');
  const [specialRequests, setSpecialRequests] = useState('');
  const [processing, setProcessing] = useState(false);
  const [submittedBooking, setSubmittedBooking] = useState(null);
  const [remainingRooms, setRemainingRooms] = useState(null);
  const [hasBookedBefore, setHasBookedBefore] = useState(false);

  const today = toDateOnlyString(new Date());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      if (!userId) return;
      const booked = await bookingService.hasUserBookedListing(userId, listing.id);
      if (!cancelled) setHasBookedBefore(booked);
    })();
    return () => {
      cancelled = true;
    };
  }, [listing.id]);

  const handleCheckInChange = (event, selectedDate) => {
    setShowCheckInPicker(false);
    if (event.type === 'dismissed' || !selectedDate) return;
    const iso = toDateOnlyString(selectedDate);
    setCheckInDate(iso);
    if (checkOutDate <= iso) setCheckOutDate(addDays(iso, 1));
  };

  const handleCheckOutChange = (event, selectedDate) => {
    setShowCheckOutPicker(false);
    if (event.type === 'dismissed' || !selectedDate) return;
    setCheckOutDate(toDateOnlyString(selectedDate));
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await bookingService.checkStayAvailability({
        listingId: listing.id,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        guests: 1,
        rooms: 0,
      });
      if (!cancelled) setRemainingRooms(Number.isFinite(res.remaining) ? res.remaining : null);
    })();
    return () => {
      cancelled = true;
    };
  }, [listing.id, checkInDate, checkOutDate]);

  const calculateNights = () => {
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    return Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
  };

  const nights = calculateNights();
  const pricePerNight = listing.price || 0;
  const subtotal = nights * pricePerNight;
  const serviceFee = Math.round(subtotal * 0.1);
  const total = subtotal + serviceFee;
  const maxRooms = remainingRooms == null ? (stayDetails.available_rooms || 10) : Math.min(stayDetails.available_rooms || 10, remainingRooms);
  const soldOut = remainingRooms != null && remainingRooms <= 0;
  // max_guests is a per-room cap, so the effective ceiling scales with how many rooms are selected.
  const maxGuests = (stayDetails.max_guests || 10) * Math.max(1, parseInt(rooms, 10) || 1);
  const clampedGuestCount = Math.min(parseInt(guestCount, 10) || 1, maxGuests);

  const handleConfirm = () => {
    if (!checkInDate || !checkOutDate || !guestCount) {
      alert('Please fill in all required fields');
      return;
    }
    setProcessing(true);
    (async () => {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      const userId = userData?.user?.id || null;
      if (userErr || !userId) {
        alert('You must be signed in to book.');
        setProcessing(false);
        return;
      }

      const payload = {
        check_in: checkInDate,
        check_out: checkOutDate,
        guests: clampedGuestCount,
        quantity: parseInt(rooms, 10) || 1,
        reservation_time: new Date().toISOString(),
      };

      const res = await bookingService.createBooking({
        userId,
        listingId: listing.id,
        listingType: 'stay',
        priceAtBooking: listing.price || 0,
        payload,
      });

      if (res.error) {
        alert(res.error.message || 'Failed to create booking');
        setProcessing(false);
        return;
      }

      setProcessing(false);
      setSubmittedBooking(res.data);
    })();
  };

  const handleViewStatus = () => {
    router.push('/bookings');
    onClose && onClose();
  };

  const handleDone = () => {
    onConfirm && onConfirm(submittedBooking);
    onClose && onClose();
  };

  if (submittedBooking) {
    return (
      <Modal visible transparent animationType="slide" onRequestClose={onClose}>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.successContainer}>
            <View style={[styles.successIcon, { backgroundColor: theme.colors.success + '22' }]}>
              <Ionicons name="checkmark-circle" size={56} color={theme.colors.success} />
            </View>
            <Text style={styles.successTitle}>Request Sent</Text>
            <Text style={styles.successBody}>
              Your request has been sent to the host. You&apos;ll be notified once it&apos;s approved.
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
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Book Your Stay</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dates</Text>
            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <Text style={styles.label}>Check-in</Text>
                <TouchableOpacity style={styles.input} onPress={() => setShowCheckInPicker(true)}>
                  <Text style={{ color: theme.colors.text }}>{checkInDate}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.dateField}>
                <Text style={styles.label}>Check-out</Text>
                <TouchableOpacity style={styles.input} onPress={() => setShowCheckOutPicker(true)}>
                  <Text style={{ color: theme.colors.text }}>{checkOutDate}</Text>
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.nightsInfo}>{nights} night{nights !== 1 ? 's' : ''}</Text>
            {showCheckInPicker && (
              <DateTimePicker
                value={new Date(checkInDate)}
                mode="date"
                minimumDate={new Date(today)}
                onChange={handleCheckInChange}
              />
            )}
            {showCheckOutPicker && (
              <DateTimePicker
                value={new Date(checkOutDate)}
                mode="date"
                minimumDate={new Date(addDays(checkInDate, 1))}
                onChange={handleCheckOutChange}
              />
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Guests & Rooms</Text>
            <View style={styles.counterRow}>
              <View style={styles.counterField}>
                <Text style={styles.label}>Guests</Text>
                <View style={styles.counter}>
                  <TouchableOpacity
                    onPress={() => setGuestCount(Math.max(1, clampedGuestCount - 1).toString())}
                  >
                    <Ionicons name="remove" size={20} color={theme.colors.text} />
                  </TouchableOpacity>
                  <Text style={styles.counterValue}>{clampedGuestCount}</Text>
                  <TouchableOpacity
                    onPress={() => setGuestCount(Math.min(maxGuests, clampedGuestCount + 1).toString())}
                    disabled={clampedGuestCount >= maxGuests}
                  >
                    <Ionicons name="add" size={20} color={theme.colors.text} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.counterField}>
                <Text style={styles.label}>Rooms</Text>
                <View style={styles.counter}>
                  <TouchableOpacity
                    onPress={() => setRooms(Math.max(1, parseInt(rooms, 10) - 1).toString())}
                  >
                    <Ionicons name="remove" size={20} color={theme.colors.text} />
                  </TouchableOpacity>
                  <Text style={styles.counterValue}>{rooms}</Text>
                  <TouchableOpacity
                    onPress={() => setRooms(Math.min(maxRooms, parseInt(rooms, 10) + 1).toString())}
                    disabled={parseInt(rooms, 10) >= maxRooms}
                  >
                    <Ionicons name="add" size={20} color={theme.colors.text} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            {remainingRooms != null && (
              <Text style={soldOut ? styles.soldOutText : styles.availabilityText}>
                {soldOut ? 'No rooms left for these dates' : `${formatCount(remainingRooms)} room${remainingRooms === 1 ? '' : 's'} left for these dates`}
              </Text>
            )}
            <Text style={styles.availabilityText}>
              Up to {maxGuests} guest{maxGuests === 1 ? '' : 's'} across {rooms} room{parseInt(rooms, 10) === 1 ? '' : 's'}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Special Requests</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Add any special requests..."
              value={specialRequests}
              onChangeText={setSpecialRequests}
              multiline
              numberOfLines={4}
              placeholderTextColor={theme.colors.textSubtle}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Price Breakdown</Text>
            <View style={styles.priceBreakdown}>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>
                  {formatPrice(pricePerNight)} x {nights} night{nights !== 1 ? 's' : ''}
                </Text>
                <Text style={styles.priceValue}>{formatPrice(subtotal)}</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Service fee (10%)</Text>
                <Text style={styles.priceValue}>{formatPrice(serviceFee)}</Text>
              </View>
              <View style={[styles.priceRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{formatPrice(total)}</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, (processing || soldOut) && styles.buttonDisabled]}
            onPress={handleConfirm}
            disabled={processing || soldOut}
          >
            <Text style={styles.buttonText}>
              {soldOut
                ? 'No Rooms Available'
                : processing
                ? 'Sending Request...'
                : `${hasBookedBefore ? 'Book Again' : 'Request to Book'} — ${formatPrice(total)}`}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const getStyles = (theme, STAY_ACCENT) => StyleSheet.create({
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 12,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateField: {
    flex: 1,
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
  nightsInfo: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 8,
    fontWeight: '600',
  },
  counterRow: {
    flexDirection: 'row',
    gap: 12,
  },
  counterField: {
    flex: 1,
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingVertical: 10,
    backgroundColor: theme.colors.surface,
  },
  counterValue: {
    fontSize: 16,
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
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 12,
    marginTop: 12,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  button: {
    backgroundColor: theme.colors.buttonBg,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.buttonText,
  },
  buttonDisabled: {
    opacity: 0.6,
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
