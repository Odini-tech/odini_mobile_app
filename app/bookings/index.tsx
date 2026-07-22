import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAppMode } from '../../src/context/AppModeContext';
import { useCurrency } from '../../src/context/CurrencyContext';
import bookingService from '../../src/services/bookingService';
import { formatEventDateSmart } from '../../src/utils/dateFormat';

const STATUS_GROUPS = [
  { key: 'pending', title: 'Awaiting Approval', statuses: ['pending'] },
  { key: 'confirmed', title: 'Confirmed', statuses: ['confirmed'] },
  { key: 'completed', title: 'Completed', statuses: ['completed'] },
  { key: 'cancelled', title: 'Cancelled / Rejected', statuses: ['cancelled_by_user', 'cancelled_by_host', 'rejected'] },
];

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  confirmed: '#3B82F6',
  completed: '#22C55E',
  cancelled_by_user: '#6B7280',
  cancelled_by_host: '#6B7280',
  rejected: '#EF4444',
};

const TYPE_ICON: Record<string, string> = {
  stay: 'home',
  event: 'calendar',
  offering: 'compass',
};

function getBookingDate(booking: any) {
  return booking.check_in || booking.event_slot || booking.reservation_time || booking.created_at;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function BookingsScreen() {
  const router = useRouter();
  const { theme } = useAppMode();
  const { formatPrice } = useCurrency();
  const styles = getStyles(theme);

  const [userId, setUserId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = useCallback(async (uid: string) => {
    setError(null);
    const { data, error: fetchErr } = await bookingService.listBookingsByUserWithListing(uid);
    if (fetchErr) {
      setError(fetchErr.message || 'Failed to load bookings');
    } else {
      setBookings(data || []);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id || null;
      setUserId(uid);
      if (uid) await load(uid);
      setLoading(false);
    })();
  }, [load]);

  const handleRefresh = async () => {
    if (!userId) return;
    setRefreshing(true);
    await load(userId);
    setRefreshing(false);
  };

  const handleCancel = async (bookingId: string) => {
    if (!userId) return;
    setCancellingId(bookingId);
    const { error: cancelErr } = await bookingService.cancelBooking(bookingId, userId);
    setCancellingId(null);
    if (cancelErr) {
      alert(cancelErr.message || 'Failed to cancel booking');
      return;
    }
    await load(userId);
  };

  const renderBooking = (booking: any) => {
    const listing = booking.listings;
    const listingType = listing?.listing_type || booking.listing_type;
    const statusColor = STATUS_COLORS[booking.status] || '#6B7280';
    const dateStr = listingType === 'event'
      ? formatEventDateSmart(getBookingDate(booking))
      : formatDate(getBookingDate(booking));
    const amount = booking.total_price ?? booking.price_at_booking;
    const qty = booking.quantity || booking.guests;

    return (
      <View key={booking.id} style={styles.row}>
        {listing?.image_url ? (
          <Image source={{ uri: listing.image_url }} style={styles.rowImage} />
        ) : (
          <View style={[styles.rowImage, styles.rowImagePlaceholder]}>
            <MaterialCommunityIcons name={(TYPE_ICON[listingType] || 'home') as any} size={22} color={statusColor} />
          </View>
        )}
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle} numberOfLines={1}>{listing?.title || 'Booking'}</Text>
          <View style={styles.rowMetaLine}>
            {dateStr ? <Text style={styles.rowMeta}>{dateStr}</Text> : null}
            {qty ? <Text style={styles.rowMeta}>{'  •  '}{qty} {listingType === 'stay' ? (qty === 1 ? 'room' : 'rooms') : listingType === 'event' ? 'ticket(s)' : 'x'}</Text> : null}
          </View>
          <View style={styles.rowBottomLine}>
            <View style={[styles.statusPill, { backgroundColor: statusColor + '22' }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>{booking.status.replace(/_/g, ' ')}</Text>
            </View>
            {amount != null ? <Text style={styles.rowPrice}>{formatPrice(amount)}</Text> : null}
          </View>
          <Text style={styles.rowRef}>{booking.booking_ref}</Text>
          {booking.status === 'pending' && (
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => handleCancel(booking.id)}
              disabled={cancellingId === booking.id}
            >
              <Text style={styles.cancelBtnText}>
                {cancellingId === booking.id ? 'Cancelling...' : 'Cancel request'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.textMuted} />
      </View>
    );
  }

  const groups = STATUS_GROUPS.map((group) => ({
    ...group,
    items: bookings.filter((b) => group.statuses.includes(b.status)),
  })).filter((group) => group.items.length > 0);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Bookings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.textMuted} />}
      >
        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : groups.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={40} color={theme.colors.textSubtle} />
            <Text style={styles.emptyText}>No bookings yet</Text>
          </View>
        ) : (
          groups.map((group) => (
            <View key={group.key} style={styles.section}>
              <Text style={styles.sectionTitle}>{group.title}</Text>
              {group.items.map(renderBooking)}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  headerSpacer: {
    width: 30,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rowImage: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceAlt,
  },
  rowImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowBody: {
    flex: 1,
    gap: 3,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  rowMetaLine: {
    flexDirection: 'row',
  },
  rowMeta: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  rowBottomLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  rowPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  rowRef: {
    fontSize: 10,
    color: theme.colors.textSubtle,
    marginTop: 2,
  },
  cancelBtn: {
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.danger || '#EF4444',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  errorText: {
    fontSize: 14,
    color: theme.colors.danger || '#EF4444',
    textAlign: 'center',
    marginTop: 40,
  },
});
