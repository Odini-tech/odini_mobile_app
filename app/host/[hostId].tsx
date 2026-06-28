import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useRef, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useCurrency } from '../../src/context/CurrencyContext';
import {
  fetchHostDashboard,
  HostBooking,
  HostDashboardData,
  HostListing,
  HostProfile,
} from '../../src/services/hostService';
import EventDetail from '../../src/components/details/EventDetail';
import OfferingDetail from '../../src/components/details/OfferingDetail';
import StayDetail from '../../src/components/details/StayDetail';
import burgundyTheme, { getListingTypeColor } from '../../src/theme/burgundyTheme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = Math.floor((width - 32 - 12) / 2.2);

const REVENUE_STATUSES = new Set(['confirmed', 'completed']);

export default function HostDashboardScreen() {
  const params = useLocalSearchParams<{ hostId?: string | string[] }>();
  const router = useRouter();
  const { formatPrice } = useCurrency();
  const hostId = Array.isArray(params.hostId) ? params.hostId[0] : params.hostId;

  const [dashboard, setDashboard] = useState<HostDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedListing, setSelectedListing] = useState<any | null>(null);
  const [detailType, setDetailType] = useState<string | null>(null);
  const detailRef = useRef<string | null>(null);

  const loadDashboard = async () => {
    if (!hostId) {
      setError('Host profile not found.');
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const data = await fetchHostDashboard(hostId);
      setDashboard(data);
    } catch (err) {
      console.error('Failed to load host dashboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to load host dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [hostId]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const handleCardPress = (listing: HostListing) => {
    detailRef.current = listing.id;
    setDetailType(listing.listing_type);
    setSelectedListing({
      ...listing,
      image_url: listing.preview_image_url || null,
    });
  };

  const handleCloseDetail = () => {
    detailRef.current = null;
    setSelectedListing(null);
    setDetailType(null);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={burgundyTheme.colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={burgundyTheme.colors.danger} />
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.errorButton} onPress={() => router.back()}>
          <Text style={styles.errorButtonText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const profile = dashboard?.profile ?? null;
  const listings = dashboard?.listings ?? [];
  const bookings = dashboard?.bookings ?? [];

  const activeListings = listings.filter((l) => l.is_active);
  const upcomingEvents = listings
    .filter((l) => l.listing_type === 'event' && l.is_active && isFuture(l.events?.[0]?.event_time))
    .sort((a, b) => new Date(a.events?.[0]?.event_time || 0).getTime() - new Date(b.events?.[0]?.event_time || 0).getTime());
  const currentStays = listings.filter((l) => l.listing_type === 'stay' && l.is_active);
  const currentServices = listings.filter((l) => l.listing_type === 'offering' && l.is_active);
  const pastListings = listings.filter((l) => !l.is_active || (l.listing_type === 'event' && isPast(l.events?.[0]?.event_time)));
  const allActive = listings.filter((l) => l.is_active);

  const totalEarnings = bookings.reduce((sum, b) => {
    if (!REVENUE_STATUSES.has(b.status)) return sum;
    return sum + Number(b.total_price ?? b.price_at_booking ?? 0);
  }, 0);

  const displayName = getDisplayName(profile);
  const initials = getInitials(profile);

  return (
    <>
      <ScrollView
        style={styles.screen}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={burgundyTheme.colors.primary}
          />
        }
      >
        {/* Hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroGlow1} />
          <View style={styles.heroGlow2} />

          <View style={styles.heroTopRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>Host dashboard</Text>
            </View>
          </View>

          <View style={styles.heroBody}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroName}>{displayName}</Text>
              <Text style={styles.heroRole}>{profile?.role || 'Host'}</Text>
              {profile?.location ? (
                <View style={styles.heroLocationRow}>
                  <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.heroLocation}>{profile.location}</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.heroStats}>
            <StatPill label="Active" value={String(activeListings.length)} />
            <StatPill label="Bookings" value={String(bookings.length)} />
            <StatPill label="Earnings" value={formatPrice(totalEarnings)} />
          </View>

          <View style={styles.heroChips}>
            <MiniChip label={`${upcomingEvents.length} Events`} />
            <MiniChip label={`${currentStays.length} Stays`} />
            <MiniChip label={`${currentServices.length} Services`} />
            {pastListings.length > 0 && <MiniChip label={`${pastListings.length} Past`} />}
          </View>
        </View>

        {/* All Active */}
        {allActive.length > 0 && (
          <CarouselSection title="All Listings" subtitle="Everything currently live">
            {allActive.map((l) => (
              <ListingCard key={l.id} listing={l} formatPrice={formatPrice} onPress={handleCardPress} />
            ))}
          </CarouselSection>
        )}

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <CarouselSection title="Upcoming Events" subtitle="Next on the calendar">
            {upcomingEvents.map((l) => (
              <ListingCard key={l.id} listing={l} formatPrice={formatPrice} onPress={handleCardPress} />
            ))}
          </CarouselSection>
        )}

        {/* Current Stays */}
        {currentStays.length > 0 && (
          <CarouselSection title="My Stays" subtitle="Active accommodation listings">
            {currentStays.map((l) => (
              <ListingCard key={l.id} listing={l} formatPrice={formatPrice} onPress={handleCardPress} />
            ))}
          </CarouselSection>
        )}

        {/* Current Services */}
        {currentServices.length > 0 && (
          <CarouselSection title="My Services" subtitle="Open offerings">
            {currentServices.map((l) => (
              <ListingCard key={l.id} listing={l} formatPrice={formatPrice} onPress={handleCardPress} />
            ))}
          </CarouselSection>
        )}

        {/* Recent Bookings */}
        {bookings.length > 0 && (
          <CarouselSection title="Recent Bookings" subtitle="Latest guest activity">
            {bookings.slice(0, 10).map((b) => (
              <BookingCard key={b.id} booking={b} formatPrice={formatPrice} />
            ))}
          </CarouselSection>
        )}

        {/* Past Listings */}
        {pastListings.length > 0 && (
          <CarouselSection title="Past Listings" subtitle="Archived and ended">
            {pastListings.map((l) => (
              <ListingCard key={l.id} listing={l} formatPrice={formatPrice} onPress={handleCardPress} isPast />
            ))}
          </CarouselSection>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      {selectedListing && detailType === 'stay' && (
        <StayDetail listing={selectedListing} onClose={handleCloseDetail} />
      )}
      {selectedListing && detailType === 'event' && (
        <EventDetail listing={selectedListing} onClose={handleCloseDetail} />
      )}
      {selectedListing && detailType === 'offering' && (
        <OfferingDetail listing={selectedListing} onClose={handleCloseDetail} />
      )}
    </>
  );
}

function CarouselSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carousel}
      >
        {children}
      </ScrollView>
    </View>
  );
}

function ListingCard({
  listing,
  formatPrice,
  onPress,
  isPast = false,
}: {
  listing: HostListing;
  formatPrice: (n: number) => string;
  onPress: (l: HostListing) => void;
  isPast?: boolean;
}) {
  const accent = getListingTypeColor(listing.listing_type);
  const icon =
    listing.listing_type === 'event'
      ? 'calendar'
      : listing.listing_type === 'offering'
      ? 'briefcase'
      : 'home';

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.78}
      onPress={() => onPress(listing)}
    >
      <View style={styles.cardImageWrap}>
        {listing.preview_image_url ? (
          <Image source={{ uri: listing.preview_image_url }} style={styles.cardImage} />
        ) : (
          <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
            <MaterialCommunityIcons name={icon} size={28} color={accent} />
          </View>
        )}
        <View style={[styles.typePill, { backgroundColor: accent }]}>
          <Text style={styles.typePillText}>{listing.listing_type.toUpperCase()}</Text>
        </View>
        {isPast ? (
          <View style={styles.archivedBadge}>
            <Text style={styles.archivedBadgeText}>PAST</Text>
          </View>
        ) : listing.booking_count > 0 ? (
          <View style={styles.bookingBadge}>
            <MaterialCommunityIcons name="calendar-check" size={10} color="#fff" />
            <Text style={styles.bookingBadgeText}>{listing.booking_count}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>{listing.title}</Text>
        {listing.price ? (
          <Text style={[styles.cardPrice, { color: accent }]}>{formatPrice(listing.price)}</Text>
        ) : null}
        {listing.location_label && listing.location_label !== 'Location pending' ? (
          <Text style={styles.cardLocation} numberOfLines={1}>{listing.location_label}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function BookingCard({
  booking,
  formatPrice,
}: {
  booking: HostBooking;
  formatPrice: (n: number) => string;
}) {
  const statusConfig = getStatusConfig(booking.status);
  const dateStr = booking.check_in || booking.event_slot || booking.reservation_time || booking.created_at;
  const displayDate = dateStr
    ? new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : null;
  const guestName =
    [booking.guest_firstname, booking.guest_lastname].filter(Boolean).join(' ').trim() ||
    booking.guest_email ||
    booking.booking_ref;
  const accent =
    booking.listing_type === 'event'
      ? getListingTypeColor('event')
      : booking.listing_type === 'offering'
      ? getListingTypeColor('offering')
      : getListingTypeColor('stay');

  return (
    <View style={styles.bookingCard}>
      <View style={[styles.bookingAccentBar, { backgroundColor: accent }]} />
      <View style={styles.bookingCardInner}>
        <View style={styles.bookingCardTop}>
          <Text style={styles.bookingRef}>{booking.booking_ref}</Text>
          <View style={[styles.statusPill, { backgroundColor: statusConfig.bg }]}>
            <Text style={[styles.statusPillText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>
        <Text style={styles.bookingGuest} numberOfLines={1}>{guestName}</Text>
        {booking.listing_title ? (
          <Text style={styles.bookingListing} numberOfLines={1}>{booking.listing_title}</Text>
        ) : null}
        <View style={styles.bookingCardBottom}>
          {displayDate ? <Text style={styles.bookingDate}>{displayDate}</Text> : null}
          <Text style={[styles.bookingAmount, { color: accent }]}>
            {formatPrice(Number(booking.total_price ?? booking.price_at_booking ?? 0))}
          </Text>
        </View>
      </View>
    </View>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statPillValue}>{value}</Text>
      <Text style={styles.statPillLabel}>{label}</Text>
    </View>
  );
}

function MiniChip({ label }: { label: string }) {
  return (
    <View style={styles.miniChip}>
      <Text style={styles.miniChipText}>{label}</Text>
    </View>
  );
}

function getDisplayName(profile: HostProfile | null): string {
  if (!profile) return 'Host dashboard';
  const full = [profile.firstname, profile.lastname].filter(Boolean).join(' ').trim();
  return full || profile.username || 'Host dashboard';
}

function getInitials(profile: HostProfile | null): string {
  if (!profile) return 'H';
  if (profile.firstname && profile.lastname) return `${profile.firstname[0]}${profile.lastname[0]}`.toUpperCase();
  if (profile.firstname) return profile.firstname[0].toUpperCase();
  if (profile.username) return profile.username[0].toUpperCase();
  return 'H';
}

function isFuture(value?: string | null): boolean {
  if (!value) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime()) && d.getTime() >= Date.now();
}

function isPast(value?: string | null): boolean {
  if (!value) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime()) && d.getTime() < Date.now();
}

function getStatusConfig(status: string): { label: string; bg: string; color: string } {
  const s = status?.toLowerCase() || 'pending';
  if (s === 'confirmed') return { label: 'Confirmed', bg: '#E7F7EF', color: burgundyTheme.colors.success };
  if (s === 'completed') return { label: 'Completed', bg: '#E8F0FF', color: '#2563EB' };
  if (s.startsWith('cancelled')) return { label: 'Cancelled', bg: '#FEE2E2', color: burgundyTheme.colors.danger };
  if (s === 'rejected') return { label: 'Rejected', bg: '#F3F4F6', color: burgundyTheme.colors.textMuted };
  return { label: 'Pending', bg: '#FEF3C7', color: '#B45309' };
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: burgundyTheme.colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
    backgroundColor: burgundyTheme.colors.background,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: burgundyTheme.colors.text,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: burgundyTheme.colors.textMuted,
    textAlign: 'center',
  },
  errorButton: {
    marginTop: 8,
    backgroundColor: burgundyTheme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  errorButtonText: {
    color: '#fff',
    fontWeight: '700',
  },

  // Hero
  heroCard: {
    backgroundColor: burgundyTheme.colors.primaryDeep,
    margin: 14,
    borderRadius: 24,
    padding: 18,
    overflow: 'hidden',
  },
  heroGlow1: {
    position: 'absolute',
    right: -40,
    top: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  heroGlow2: {
    position: 'absolute',
    left: -30,
    bottom: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  heroBadge: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  heroBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  heroBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 18,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
  },
  heroCopy: {
    flex: 1,
    gap: 3,
  },
  heroName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
  },
  heroRole: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  heroLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  heroLocation: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
  },
  heroStats: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  statPill: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
  },
  statPillValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  statPillLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginTop: 2,
  },
  heroChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  miniChip: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
  },
  miniChipText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },

  // Sections
  section: {
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: burgundyTheme.colors.text,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: burgundyTheme.colors.textMuted,
  },
  carousel: {
    paddingRight: 14,
    gap: 12,
  },

  // Listing card
  card: {
    width: CARD_WIDTH,
    backgroundColor: burgundyTheme.colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: burgundyTheme.colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  cardImageWrap: {
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: 120,
    backgroundColor: burgundyTheme.colors.surfaceAlt,
  },
  cardImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  typePill: {
    position: 'absolute',
    bottom: 7,
    left: 7,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typePillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
  archivedBadge: {
    position: 'absolute',
    top: 7,
    right: 7,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  archivedBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
  bookingBadge: {
    position: 'absolute',
    top: 7,
    right: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: burgundyTheme.colors.primary,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  bookingBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
  cardBody: {
    padding: 9,
    gap: 3,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: burgundyTheme.colors.text,
  },
  cardPrice: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardLocation: {
    fontSize: 11,
    color: burgundyTheme.colors.textMuted,
  },

  // Booking card
  bookingCard: {
    width: 200,
    backgroundColor: burgundyTheme.colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: burgundyTheme.colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    flexDirection: 'row',
  },
  bookingAccentBar: {
    width: 4,
  },
  bookingCardInner: {
    flex: 1,
    padding: 11,
    gap: 4,
  },
  bookingCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
  },
  bookingRef: {
    fontSize: 10,
    color: burgundyTheme.colors.textMuted,
    flex: 1,
  },
  statusPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '700',
  },
  bookingGuest: {
    fontSize: 13,
    fontWeight: '700',
    color: burgundyTheme.colors.text,
  },
  bookingListing: {
    fontSize: 11,
    color: burgundyTheme.colors.textMuted,
  },
  bookingCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  bookingDate: {
    fontSize: 11,
    color: burgundyTheme.colors.textMuted,
  },
  bookingAmount: {
    fontSize: 13,
    fontWeight: '800',
  },
});
