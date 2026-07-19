import { Ionicons } from '@expo/vector-icons';
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

export default function EventBookingModal({ listing, eventDetails, onClose, onConfirm }) {
  const { theme } = useAppMode();
  const router = useRouter();
  const EVENT_ACCENT = theme.listingTypeColors.event;
  const styles = getStyles(theme, EVENT_ACCENT);
  const { formatPrice } = useCurrency();
  const [ticketCount, setTicketCount] = useState('1');
  const [specialRequests, setSpecialRequests] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [processing, setProcessing] = useState(false);
  const [submittedBooking, setSubmittedBooking] = useState(null);
  const [remainingTickets, setRemainingTickets] = useState(null);

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
        }
      } catch (_) {}
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await bookingService.checkEventAvailability({ listingId: listing.id, quantity: 0 });
      if (!cancelled) setRemainingTickets(Number.isFinite(res.remaining) ? res.remaining : null);
    })();
    return () => {
      cancelled = true;
    };
  }, [listing.id]);

  const pricePerTicket = listing.price || 0;
  const tickets = parseInt(ticketCount, 10) || 1;
  const subtotal = tickets * pricePerTicket;
  const serviceFee = Math.round(subtotal * 0.1);
  const total = subtotal + serviceFee;
  const maxTickets = remainingTickets == null ? (eventDetails.capacity || 1000) : Math.min(eventDetails.capacity || 1000, remainingTickets);
  const soldOut = remainingTickets != null && remainingTickets <= 0;

  const handleConfirm = async () => {
    if (!ticketCount) {
      alert('Please select number of tickets');
      return;
    }
    setProcessing(true);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      const userId = userData?.user?.id || null;
      if (userErr || !userId) {
        alert('You must be signed in to book.');
        return;
      }

      const nameParts = guestName.trim().split(' ');
      const payload = {
        quantity: parseInt(ticketCount, 10) || 1,
        event_slot: eventDetails.event_time || null,
        reservation_time: new Date().toISOString(),
        guests: 1,
        guest_firstname: nameParts[0] || null,
        guest_lastname: nameParts.slice(1).join(' ') || null,
        guest_email: guestEmail || null,
        notes: specialRequests || null,
      };

      const res = await bookingService.createBooking({
        userId,
        listingId: listing.id,
        listingType: 'event',
        priceAtBooking: listing.price || 0,
        totalPrice: total,
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
            <View style={[styles.successIcon, { backgroundColor: EVENT_ACCENT + '22' }]}>
              <Ionicons name="checkmark-circle" size={56} color={EVENT_ACCENT} />
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
    <Modal visible transparent animationType="slide">
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Get Event Tickets</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.eventCard}>
            <View style={styles.eventBadge}>
              <Ionicons name="calendar" size={14} color={theme.colors.white} />
              <Text style={styles.badgeText}>
                {eventDetails.event_type?.toUpperCase() || 'EVENT'}
              </Text>
            </View>
            <Text style={styles.eventTitle}>{listing.title}</Text>
            <View style={styles.eventInfo}>
              <View style={styles.eventInfoRow}>
                <Ionicons name="time" size={16} color={EVENT_ACCENT} />
                <Text style={styles.eventInfoText}>{formatEventTime(eventDetails.event_time)}</Text>
              </View>
              <View style={styles.eventInfoRow}>
                <Ionicons name="people" size={16} color={EVENT_ACCENT} />
                <Text style={styles.eventInfoText}>
                  Capacity: {eventDetails.capacity || 'Unlimited'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Number of Tickets</Text>
            <View style={styles.counter}>
              <TouchableOpacity
                onPress={() => setTicketCount(Math.max(1, parseInt(ticketCount, 10) - 1).toString())}
              >
                <Ionicons name="remove" size={24} color={EVENT_ACCENT} />
              </TouchableOpacity>
              <Text style={styles.counterValue}>{ticketCount}</Text>
              <TouchableOpacity
                onPress={() => setTicketCount(Math.min(maxTickets, parseInt(ticketCount, 10) + 1).toString())}
                disabled={parseInt(ticketCount, 10) >= maxTickets}
              >
                <Ionicons name="add" size={24} color={EVENT_ACCENT} />
              </TouchableOpacity>
            </View>
            {remainingTickets != null && (
              <Text style={soldOut ? styles.soldOutText : styles.availabilityText}>
                {soldOut ? 'This event is sold out' : `${remainingTickets} ticket${remainingTickets === 1 ? '' : 's'} left`}
              </Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Attendee Information</Text>
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
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Special Requirements</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Any special requirements or questions?"
              value={specialRequests}
              onChangeText={setSpecialRequests}
              multiline
              numberOfLines={4}
              placeholderTextColor={theme.colors.textSubtle}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Price Summary</Text>
            <View style={styles.priceBreakdown}>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>
                  {formatPrice(pricePerTicket)} x {tickets} ticket{tickets !== 1 ? 's' : ''}
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

          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              By booking, you agree to the event&apos;s terms and conditions.
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
              {soldOut ? 'Sold Out' : processing ? 'Sending Request...' : `Request Tickets — ${formatPrice(total)}`}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const getStyles = (theme, EVENT_ACCENT) => StyleSheet.create({
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
  eventCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: EVENT_ACCENT,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow,
  },
  eventBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: EVENT_ACCENT,
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
  eventTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
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
    color: theme.colors.textMuted,
    flex: 1,
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
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    paddingVertical: 16,
    backgroundColor: theme.colors.surface,
  },
  counterValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
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
    color: EVENT_ACCENT,
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
    backgroundColor: EVENT_ACCENT,
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
