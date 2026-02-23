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

export default function StayBookingModal({ listing, stayDetails, onClose, onConfirm }) {
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
              <Ionicons name="close" size={24} color="#1A1A1A" />
            </TouchableOpacity>
            <Text style={styles.title}>Book Your Stay</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Check-in & Check-out */}
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
                />
              </View>
              <View style={styles.dateField}>
                <Text style={styles.label}>Check-out</Text>
                <TextInput
                  style={styles.input}
                  value={checkOutDate}
                  onChangeText={setCheckOutDate}
                  placeholder="YYYY-MM-DD"
                />
              </View>
            </View>
            <Text style={styles.nightsInfo}>{nights} night{nights !== 1 ? 's' : ''}</Text>
          </View>

          {/* Guests & Rooms */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Guests & Rooms</Text>
            <View style={styles.counterRow}>
              <View style={styles.counterField}>
                <Text style={styles.label}>Guests</Text>
                <View style={styles.counter}>
                  <TouchableOpacity onPress={() => setGuestCount(Math.max('1', (parseInt(guestCount) - 1).toString()))}>
                    <Ionicons name="remove" size={20} color="#4A90E2" />
                  </TouchableOpacity>
                  <Text style={styles.counterValue}>{guestCount}</Text>
                  <TouchableOpacity 
                    onPress={() => setGuestCount((parseInt(guestCount) + 1).toString())}
                    disabled={parseInt(guestCount) >= (stayDetails.max_guests || 10)}
                  >
                    <Ionicons name="add" size={20} color="#4A90E2" />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.counterField}>
                <Text style={styles.label}>Rooms</Text>
                <View style={styles.counter}>
                  <TouchableOpacity onPress={() => setRooms(Math.max('1', (parseInt(rooms) - 1).toString()))}>
                    <Ionicons name="remove" size={20} color="#4A90E2" />
                  </TouchableOpacity>
                  <Text style={styles.counterValue}>{rooms}</Text>
                  <TouchableOpacity 
                    onPress={() => setRooms((parseInt(rooms) + 1).toString())}
                    disabled={parseInt(rooms) >= (stayDetails.available_rooms || 10)}
                  >
                    <Ionicons name="add" size={20} color="#4A90E2" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* Special Requests */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Special Requests</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Add any special requests..."
              value={specialRequests}
              onChangeText={setSpecialRequests}
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Price Breakdown */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Price Breakdown</Text>
            <View style={styles.priceBreakdown}>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>${pricePerNight} × {nights} night{nights !== 1 ? 's' : ''}</Text>
                <Text style={styles.priceValue}>${subtotal}</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Service fee</Text>
                <Text style={styles.priceValue}>${serviceFee}</Text>
              </View>
              <View style={[styles.priceRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>${total}</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Book Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.button}
            onPress={handleConfirm}
          >
            <Text style={styles.buttonText}>Book Now - ${total}</Text>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
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
  nightsInfo: {
    fontSize: 12,
    color: '#4A90E2',
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
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingVertical: 10,
  },
  counterValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
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
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingTopY: 12,
    marginTop: 12,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4A90E2',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  button: {
    backgroundColor: '#4A90E2',
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
