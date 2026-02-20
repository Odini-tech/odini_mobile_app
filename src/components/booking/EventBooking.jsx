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

export default function EventBookingModal({ listing, eventDetails, onClose, onConfirm }) {
  const [ticketCount, setTicketCount] = useState('1');
  const [specialRequests, setSpecialRequests] = useState('');

  const pricePerTicket = listing.price_per_night || 0;
  const tickets = parseInt(ticketCount) || 1;
  const subtotal = tickets * pricePerTicket;
  const serviceFee = Math.round(subtotal * 0.1);
  const total = subtotal + serviceFee;

  const handleConfirm = () => {
    if (!ticketCount) {
      alert('Please select number of tickets');
      return;
    }
    (async () => {
      try {
        setProcessing?.(true);
      } catch (e) {}
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      const userId = userData?.user?.id || null;
      if (userErr || !userId) {
        alert('You must be signed in to book.');
        return;
      }

      const payload = {
        quantity: parseInt(ticketCount, 10) || 1,
        event_slot: eventDetails.event_time || null,
        reservation_time: new Date().toISOString(),
        guests: 1,
      };

      const res = await bookingService.createBooking({
        userId,
        listingId: listing.id,
        listingType: 'event',
        priceAtBooking: listing.price_per_night || 0,
        payload,
      });

      if (res.error) {
        alert(res.error.message || 'Failed to create booking');
        return;
      }

      // notify parent and close
      onConfirm && onConfirm(res.data);
      onClose && onClose();
    })();
  };

  const formatEventTime = (timestamp) => {
    if (!timestamp) return 'TBD';
    return new Date(timestamp).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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
            <Text style={styles.title}>Get Event Tickets</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Event Info Card */}
          <View style={styles.eventCard}>
            <View style={styles.eventBadge}>
              <Ionicons name="calendar" size={14} color="#FFF" />
              <Text style={styles.badgeText}>
                {eventDetails.event_type?.toUpperCase() || 'EVENT'}
              </Text>
            </View>
            <Text style={styles.eventTitle}>{listing.title}</Text>
            <View style={styles.eventInfo}>
              <View style={styles.eventInfoRow}>
                <Ionicons name="time" size={16} color="#FF6B6B" />
                <Text style={styles.eventInfoText}>
                  {formatEventTime(eventDetails.event_time)}
                </Text>
              </View>
              <View style={styles.eventInfoRow}>
                <Ionicons name="location" size={16} color="#FF6B6B" />
                <Text style={styles.eventInfoText}>
                  {listing.address_city}, {listing.address_country}
                </Text>
              </View>
              <View style={styles.eventInfoRow}>
                <Ionicons name="people" size={16} color="#FF6B6B" />
                <Text style={styles.eventInfoText}>
                  Capacity: {eventDetails.capacity || 'Unlimited'}
                </Text>
              </View>
            </View>
          </View>

          {/* Ticket Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Number of Tickets</Text>
            <View style={styles.counter}>
              <TouchableOpacity onPress={() => setTicketCount(Math.max('1', (parseInt(ticketCount) - 1).toString()))}>
                <Ionicons name="remove" size={24} color="#FF6B6B" />
              </TouchableOpacity>
              <Text style={styles.counterValue}>{ticketCount}</Text>
              <TouchableOpacity 
                onPress={() => setTicketCount((parseInt(ticketCount) + 1).toString())}
                disabled={parseInt(ticketCount) >= (eventDetails.capacity || 1000)}
              >
                <Ionicons name="add" size={24} color="#FF6B6B" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Attendee Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Attendee Information</Text>
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
          </View>

          {/* Special Requests */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Special Requirements</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Any special requirements or questions?"
              value={specialRequests}
              onChangeText={setSpecialRequests}
              multiline
              numberOfLines={4}
              placeholderTextColor="#999"
            />
          </View>

          {/* Price Breakdown */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Price Summary</Text>
            <View style={styles.priceBreakdown}>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>${pricePerTicket} × {tickets} ticket{tickets !== 1 ? 's' : ''}</Text>
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

          {/* Terms */}
          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              By booking, you agree to the event's terms and conditions.
            </Text>
          </View>
        </ScrollView>

        {/* Book Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.button}
            onPress={handleConfirm}
          >
            <Text style={styles.buttonText}>Get Tickets - ${total}</Text>
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
  eventCard: {
    backgroundColor: '#FFF0F0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
  },
  eventBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FF6B6B',
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
  eventTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  eventInfo: {
    gap: 8,
  },
  eventInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  eventInfoText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
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
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: '#FFD9D9',
    borderRadius: 8,
    paddingVertical: 16,
  },
  counterValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
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
    color: '#FF6B6B',
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
    backgroundColor: '#FF6B6B',
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
