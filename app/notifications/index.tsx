import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { getListingById } from '../../services/listings.service';
import { useAppMode } from '../../src/context/AppModeContext';
import EventDetail from '../../src/components/details/EventDetail';
import OfferingDetail from '../../src/components/details/OfferingDetail';
import StayDetail from '../../src/components/details/StayDetail';
import notificationService from '../../src/services/notificationService';

const TYPE_ICON: Record<string, string> = {
  booking_status: 'calendar-outline',
  listing_match: 'sparkles-outline',
};

function timeAgo(dateStr: string | null) {
  if (!dateStr) return '';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { theme } = useAppMode();
  const styles = getStyles(theme);
  const params = useLocalSearchParams<{ openId?: string | string[] }>();
  const openId = Array.isArray(params.openId) ? params.openId[0] : params.openId;

  const [userId, setUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [detailsType, setDetailsType] = useState<string | null>(null);
  const channelRef = useRef<any>(null);
  const autoOpenedRef = useRef<string | null>(null);

  const load = useCallback(async (uid: string) => {
    const { data } = await notificationService.listNotifications(uid);
    setNotifications(data);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id || null;
      setUserId(uid);
      if (uid) {
        await load(uid);
        channelRef.current = notificationService.subscribeToNotifications(uid, (row) => {
          setNotifications((prev) => (prev.some((n) => n.id === row.id) ? prev : [row, ...prev]));
        });
      }
      setLoading(false);
    })();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [load]);

  const handleRefresh = async () => {
    if (!userId) return;
    setRefreshing(true);
    await load(userId);
    setRefreshing(false);
  };

  const markRead = (notificationId: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)));
    notificationService.markAsRead(notificationId).catch(() => undefined);
  };

  const handlePress = async (notification: any) => {
    if (!notification.is_read) markRead(notification.id);

    if (notification.type === 'booking_status') {
      router.push('/bookings' as any);
      return;
    }

    if (notification.type === 'listing_match') {
      // App-seeded rows use `listing_id`; rows written by the recommendation
      // engine's daily match job use camelCase `listingId`/`venueId`.
      const listingId = notification.data?.listingId ?? notification.data?.listing_id;
      const venueId = notification.data?.venueId;

      if (!listingId) {
        if (venueId) router.push(`/venue/${venueId}` as any);
        return;
      }

      setOpeningId(notification.id);
      try {
        const listing = await getListingById(listingId);
        setDetailsType(listing.listing_type);
        setSelectedListing(listing);
      } catch (err) {
        console.error('Failed to open listing from notification:', err);
      } finally {
        setOpeningId(null);
      }
    }
  };

  // Deep-link from a push tap: /notifications?openId=<row id> auto-opens that
  // row's detail once the list has loaded, same as tapping it in the list.
  useEffect(() => {
    if (!openId || autoOpenedRef.current === openId || !notifications.length) return;
    const target = notifications.find((n) => n.id === openId);
    if (!target) return;
    autoOpenedRef.current = openId;
    handlePress(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, notifications]);

  const handleCloseDetails = () => {
    setSelectedListing(null);
    setDetailsType(null);
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.row, !item.is_read && styles.rowUnread]}
      onPress={() => handlePress(item)}
      disabled={openingId === item.id}
      activeOpacity={0.7}
    >
      <View style={[styles.iconWrap, !item.is_read && styles.iconWrapUnread]}>
        {openingId === item.id ? (
          <ActivityIndicator size="small" color={theme.colors.textMuted} />
        ) : (
          <Ionicons
            name={(TYPE_ICON[item.type] || 'notifications-outline') as any}
            size={20}
            color={theme.colors.text}
          />
        )}
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, !item.is_read && styles.rowTitleUnread]} numberOfLines={2}>
          {item.title}
        </Text>
        {item.body ? (
          <Text style={styles.rowText} numberOfLines={2}>{item.body}</Text>
        ) : null}
        <Text style={styles.rowTime}>{timeAgo(item.created_at)}</Text>
      </View>
      {!item.is_read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.textMuted} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerSpacer} />
      </View>

      <TouchableOpacity
        style={styles.bookingsBtn}
        onPress={() => router.push('/bookings' as any)}
        activeOpacity={0.8}
      >
        <Ionicons name="calendar-outline" size={18} color={theme.colors.buttonText} />
        <Text style={styles.bookingsBtnText}>View Bookings</Text>
      </TouchableOpacity>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.textMuted} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="notifications-outline" size={40} color={theme.colors.textSubtle} />
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        }
      />

      {selectedListing && detailsType === 'stay' && (
        <StayDetail listing={selectedListing} onClose={handleCloseDetails} />
      )}
      {selectedListing && detailsType === 'event' && (
        <EventDetail listing={selectedListing} onClose={handleCloseDetails} />
      )}
      {selectedListing && detailsType === 'offering' && (
        <OfferingDetail listing={selectedListing} onClose={handleCloseDetails} />
      )}
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
  bookingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.buttonBg,
    marginHorizontal: 16,
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  bookingsBtnText: {
    color: theme.colors.buttonText,
    fontWeight: '700',
    fontSize: 14,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rowUnread: {
    borderColor: theme.colors.text,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapUnread: {
    backgroundColor: theme.colors.surfaceStrong,
  },
  rowBody: {
    flex: 1,
    gap: 3,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  rowTitleUnread: {
    fontWeight: '800',
  },
  rowText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  rowTime: {
    fontSize: 11,
    color: theme.colors.textSubtle,
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.text,
    marginTop: 4,
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
});
