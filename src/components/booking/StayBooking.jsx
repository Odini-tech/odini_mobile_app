import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
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

export default function StayBookingModal({ listing, stayDetails, onClose, onConfirm }) {
  const { theme } = useAppMode();
  const STAY_ACCENT = theme.listingTypeColors.stay;
  const styles = getStyles(theme, STAY_ACCENT);
  const { formatPrice } = useCurrency();
  const [checkInDate, setCheckInDate] = useState(new Date().toISOString().split('T')[0]);
  const [checkOutDate, setCheckOutDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [guestCount, setGuestCount] = useState('1');
  const [rooms, setRooms] = useState('1');
  const [specialRequests, setSpecialRequests] = useState('');

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

  const handleConfirm = () => {
    if (!checkInDate || !checkOutDate || !guestCount) {
      alert('Please fill in all required fields');
      return;
    }
    (async () => {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      const userId = userData?.user?.id || null;
      if (userErr || !userId) {
        alert('You must be signed in to book.');
        return;
      }

      const payload = {
        check_in: checkInDate,
        check_out: checkOutDate,
        guests: parseInt(guestCount, 10) || 1,
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
        return;
      }

      onConfirm && onConfirm(res.data);
      onClose && onClose();
    })();
  };

  return (
    <Modal visible transparent animationType="slide">
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
                <TextInput
                  style={styles.input}
                  value={checkInDate}
                  onChangeText={setCheckInDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.colors.textSubtle}
                />
              </View>
              <View style={styles.dateField}>
                <Text style={styles.label}>Check-out</Text>
                <TextInput
                  style={styles.input}
                  value={checkOutDate}
                  onChangeText={setCheckOutDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.colors.textSubtle}
                />
              </View>
            </View>
            <Text style={styles.nightsInfo}>{nights} night{nights !== 1 ? 's' : ''}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Guests & Rooms</Text>
            <View style={styles.counterRow}>
              <View style={styles.counterField}>
                <Text style={styles.label}>Guests</Text>
                <View style={styles.counter}>
                  <TouchableOpacity
                    onPress={() =>
                      setGuestCount(Math.max(1, parseInt(guestCount, 10) - 1).toString())
                    }
                  >
                    <Ionicons name="remove" size={20} color={STAY_ACCENT} />
                  </TouchableOpacity>
                  <Text style={styles.counterValue}>{guestCount}</Text>
                  <TouchableOpacity
                    onPress={() => setGuestCount((parseInt(guestCount, 10) + 1).toString())}
                    disabled={parseInt(guestCount, 10) >= (stayDetails.max_guests || 10)}
                  >
                    <Ionicons name="add" size={20} color={STAY_ACCENT} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.counterField}>
                <Text style={styles.label}>Rooms</Text>
                <View style={styles.counter}>
                  <TouchableOpacity
                    onPress={() => setRooms(Math.max(1, parseInt(rooms, 10) - 1).toString())}
                  >
                    <Ionicons name="remove" size={20} color={STAY_ACCENT} />
                  </TouchableOpacity>
                  <Text style={styles.counterValue}>{rooms}</Text>
                  <TouchableOpacity
                    onPress={() => setRooms((parseInt(rooms, 10) + 1).toString())}
                    disabled={parseInt(rooms, 10) >= (stayDetails.available_rooms || 10)}
                  >
                    <Ionicons name="add" size={20} color={STAY_ACCENT} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
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
          <TouchableOpacity style={styles.button} onPress={handleConfirm}>
            <Text style={styles.buttonText}>Book Now — {formatPrice(total)}</Text>
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
    color: STAY_ACCENT,
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
    color: STAY_ACCENT,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  button: {
    backgroundColor: STAY_ACCENT,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.white,
  },
});
