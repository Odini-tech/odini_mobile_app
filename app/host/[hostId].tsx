import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
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
import EventDetail from '../../src/components/details/EventDetail';
import OfferingDetail from '../../src/components/details/OfferingDetail';
import StayDetail from '../../src/components/details/StayDetail';
import { useAppMode } from '../../src/context/AppModeContext';
import { useCurrency } from '../../src/context/CurrencyContext';
import {
  fetchHostDashboard,
  HostDashboardData,
  HostListing,
  HostProfile
} from '../../src/services/hostService';
import { getThemeForMode } from '../../src/theme/appModeTheme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = Math.floor((width - 32 - 12) / 2.2);

export default function HostDashboardScreen() {
  const params = useLocalSearchParams<{ hostId?: string | string[] }>();
  const router = useRouter();
  const { formatPrice } = useCurrency();
  const { theme } = useAppMode();
  const styles = getStyles(theme);
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
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={theme.colors.danger} />
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

  const activeEvents = listings.filter((l) => l.listing_type === 'event' && l.is_active);
  const activeStays = listings.filter((l) => l.listing_type === 'stay' && l.is_active);
  const activeServices = listings.filter((l) => l.listing_type === 'offering' && l.is_active);
  const pastListings = listings.filter((l) => !l.is_active);

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
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Hero */}
        <View style={styles.heroCard}>
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

        </View>

        {/* Events */}
        {activeEvents.length > 0 && (
          <CarouselSection title="Events" subtitle="Active event listings" styles={styles}>
            {activeEvents.map((l) => (
              <ListingCard key={l.id} listing={l} formatPrice={formatPrice} onPress={handleCardPress} theme={theme} styles={styles} />
            ))}
          </CarouselSection>
        )}

        {/* Stays */}
        {activeStays.length > 0 && (
          <CarouselSection title="Stays" subtitle="Active stay listings" styles={styles}>
            {activeStays.map((l) => (
              <ListingCard key={l.id} listing={l} formatPrice={formatPrice} onPress={handleCardPress} theme={theme} styles={styles} />
            ))}
          </CarouselSection>
        )}

        {/* Activities */}
        {activeServices.length > 0 && (
          <CarouselSection title="Activities" subtitle="Active activity listings" styles={styles}>
            {activeServices.map((l) => (
              <ListingCard key={l.id} listing={l} formatPrice={formatPrice} onPress={handleCardPress} theme={theme} styles={styles} />
            ))}
          </CarouselSection>
        )}

        {/* Past Listings */}
        {pastListings.length > 0 && (
          <CarouselSection title="Past Listings" subtitle="Archived and ended listings" styles={styles}>
            {pastListings.map((l) => (
              <ListingCard key={l.id} listing={l} formatPrice={formatPrice} onPress={handleCardPress} isPast theme={theme} styles={styles} />
            ))}
          </CarouselSection>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      {selectedListing && detailType === 'stay' && (
        <StayDetail listing={selectedListing} onClose={handleCloseDetail} onHostPress={() => {}} />
      )}
      {selectedListing && detailType === 'event' && (
        <EventDetail listing={selectedListing} onClose={handleCloseDetail} onHostPress={() => {}} />
      )}
      {selectedListing && detailType === 'offering' && (
        <OfferingDetail listing={selectedListing} onClose={handleCloseDetail} onHostPress={() => {}} />
      )}
    </>
  );
}

function CarouselSection({
  title,
  subtitle,
  children,
  styles,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  styles: ReturnType<typeof getStyles>;
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
  theme,
  styles,
}: {
  listing: HostListing;
  formatPrice: (n: number) => string;
  onPress: (l: HostListing) => void;
  isPast?: boolean;
  theme: ReturnType<typeof getThemeForMode>;
  styles: ReturnType<typeof getStyles>;
}) {
  const accent = theme.listingTypeColors[listing.listing_type] || theme.colors.primary;
  const icon =
    listing.listing_type === 'event'
      ? 'calendar'
      : listing.listing_type === 'offering'
      ? 'compass'
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
        {listing.is_favorited && (
          <View style={styles.heartBadge}>
            <MaterialCommunityIcons name="heart" size={12} color="#E63B6F" />
          </View>
        )}
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={2}>{listing.title}</Text>
        {listing.location_label && listing.location_label !== 'Location pending' ? (
          <Text style={styles.cardLocation} numberOfLines={1}>{listing.location_label}</Text>
        ) : null}
        {listing.price ? (
          <Text style={[styles.cardPrice, { color: accent }]}>{formatPrice(listing.price)}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function StatPill({ label, value, styles }: { label: string; value: string; styles: ReturnType<typeof getStyles> }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statPillValue}>{value}</Text>
      <Text style={styles.statPillLabel}>{label}</Text>
    </View>
  );
}

function MiniChip({ label, styles }: { label: string; styles: ReturnType<typeof getStyles> }) {
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

function getStatusConfig(status: string, theme: ReturnType<typeof getThemeForMode>): { label: string; bg: string; color: string } {
  const s = status?.toLowerCase() || 'pending';
  if (s === 'confirmed') return { label: 'Confirmed', bg: '#E7F7EF', color: theme.colors.success };
  if (s === 'completed') return { label: 'Completed', bg: '#E8F0FF', color: '#2563EB' };
  if (s.startsWith('cancelled')) return { label: 'Cancelled', bg: '#FEE2E2', color: theme.colors.danger };
  if (s === 'rejected') return { label: 'Rejected', bg: '#F3F4F6', color: theme.colors.textMuted };
  return { label: 'Pending', bg: '#FEF3C7', color: '#B45309' };
}

const getStyles = (theme: ReturnType<typeof getThemeForMode>) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
    backgroundColor: theme.colors.background,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  errorButton: {
    marginTop: 8,
    backgroundColor: theme.colors.primary,
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
    backgroundColor: theme.colors.primaryDeep,
    margin: 14,
    borderRadius: 24,
    padding: 14,
    overflow: 'hidden',
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
    gap: 10,
    marginBottom: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
  heroCopy: {
    flex: 1,
    gap: 3,
  },
  heroName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  heroRole: {
    fontSize: 12,
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
    fontSize: 11,
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
    color: theme.colors.text,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  carousel: {
    paddingRight: 14,
    gap: 12,
  },

  // Listing card
  card: {
    width: 220,
    height: 368,
    backgroundColor: 'transparent',
    borderRadius: 5,
    overflow: 'hidden',
    borderWidth: 0,
    elevation: 0,
  },
  cardImageWrap: {
    position: 'relative',
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  cardImage: {
    width: '100%',
    height: 245,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 5,
  },
  cardImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  typePill: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typePillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
  heartBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  bookingBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
  cardInfo: {
    paddingHorizontal: 11,
    paddingTop: 11,
    paddingBottom: 0,
    backgroundColor: 'transparent',
    justifyContent: 'flex-start',
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
  },
  cardPrice: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardLocation: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },

  // Booking card
  bookingCard: {
    width: 200,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: theme.colors.border,
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
    color: theme.colors.textMuted,
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
    color: theme.colors.text,
  },
  bookingListing: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  bookingCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  bookingDate: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  bookingAmount: {
    fontSize: 13,
    fontWeight: '800',
  },
});
