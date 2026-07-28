import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
import EventDetail from '../../src/components/details/EventDetail';
import OfferingDetail from '../../src/components/details/OfferingDetail';
import StayDetail from '../../src/components/details/StayDetail';
import VenueCard from '../../src/components/shared/VenueCard';
import { useAppMode } from '../../src/context/AppModeContext';
import { useCurrency } from '../../src/context/CurrencyContext';
import { fetchSimilarVenues, fetchVenueListings, VenueSummary } from '../../src/services/venueService';
import { getThemeForMode } from '../../src/theme/appModeTheme';

export default function VenueScreen() {
  const params = useLocalSearchParams<{ venueId?: string | string[] }>();
  const router = useRouter();
  const { formatPrice } = useCurrency();
  const { theme } = useAppMode();
  const styles = getStyles(theme);
  const venueId = Array.isArray(params.venueId) ? params.venueId[0] : params.venueId;

  const [venue, setVenue] = useState<VenueSummary | null>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [similarVenues, setSimilarVenues] = useState<VenueSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedListing, setSelectedListing] = useState<any | null>(null);
  const [detailType, setDetailType] = useState<string | null>(null);

  const load = async () => {
    if (!venueId) {
      setError('Venue not found.');
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const [venueResult, similar] = await Promise.all([
        fetchVenueListings(venueId),
        fetchSimilarVenues(venueId, 8),
      ]);
      if (!venueResult.venue) {
        setError('This venue could not be found.');
      } else {
        setVenue(venueResult.venue);
        setListings(venueResult.items);
      }
      setSimilarVenues(similar);
    } catch (err) {
      console.error('Failed to load venue:', err);
      setError(err instanceof Error ? err.message : 'Failed to load venue');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId]);

  const handleRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleCardPress = (listing: any) => {
    setDetailType(listing.listing_type);
    setSelectedListing(listing);
  };

  const handleCloseDetail = () => {
    setSelectedListing(null);
    setDetailType(null);
  };

  const handleSimilarVenuePress = (id: string) => {
    router.push(`/venue/${id}` as any);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.textMuted} />
      </View>
    );
  }

  if (error || !venue) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={theme.colors.danger} />
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorText}>{error || 'Venue not found.'}</Text>
        <TouchableOpacity style={styles.errorButton} onPress={() => router.back()}>
          <Text style={styles.errorButtonText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const locationLabel = [venue.location?.city, venue.location?.country].filter(Boolean).join(', ');

  return (
    <>
      <ScrollView
        style={styles.screen}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.textMuted} />
        }
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>Venue</Text>
            </View>
          </View>

          <View style={styles.heroBody}>
            <View style={styles.avatar}>
              <Ionicons name="business" size={26} color="#fff" />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroName}>{venue.name}</Text>
              {locationLabel ? (
                <View style={styles.heroLocationRow}>
                  <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.heroLocation}>{locationLabel}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {venue.description ? <Text style={styles.heroDescription}>{venue.description}</Text> : null}
        </View>

        {listings.length > 0 ? (
          <CarouselSection title="Listings" subtitle={`${listings.length} at this venue`} styles={styles}>
            {listings.map((l) => (
              <ListingCard key={l.id} listing={l} formatPrice={formatPrice} onPress={handleCardPress} theme={theme} styles={styles} />
            ))}
          </CarouselSection>
        ) : (
          <View style={styles.emptyListings}>
            <Ionicons name="file-tray-outline" size={32} color={theme.colors.textMuted} />
            <Text style={styles.emptyListingsText}>No active listings at this venue yet.</Text>
          </View>
        )}

        {similarVenues.length > 0 && (
          <CarouselSection title="Similar venues" subtitle="You might also like" styles={styles}>
            {similarVenues.map((v) => (
              <VenueCard key={v.id} venue={v} onPress={() => handleSimilarVenuePress(v.id)} />
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
        {children}
      </ScrollView>
    </View>
  );
}

function ListingCard({
  listing,
  formatPrice,
  onPress,
  theme,
  styles,
}: {
  listing: any;
  formatPrice: (n: number) => string;
  onPress: (l: any) => void;
  theme: ReturnType<typeof getThemeForMode>;
  styles: ReturnType<typeof getStyles>;
}) {
  const accent = theme.listingTypeColors[listing.listing_type as keyof typeof theme.listingTypeColors] || theme.colors.primary;
  const icon = listing.listing_type === 'event' ? 'calendar' : listing.listing_type === 'offering' ? 'compass' : 'home';

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.78} onPress={() => onPress(listing)}>
      <View style={styles.cardImageWrap}>
        {listing.image_url ? (
          <Image source={{ uri: listing.image_url }} style={styles.cardImage} />
        ) : (
          <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
            <MaterialCommunityIcons name={icon as any} size={28} color={accent} />
          </View>
        )}
        <View style={[styles.typePill, { backgroundColor: accent }]}>
          <Text style={styles.typePillText}>{listing.listing_type.toUpperCase()}</Text>
        </View>
      </View>
      <View style={styles.cardInfo}>
        <View style={styles.cardTitleRow}>
          <Text style={[styles.cardTitle, styles.cardTitleFlex]} numberOfLines={1}>{listing.title}</Text>
          <Text style={[styles.cardPrice, { color: theme.colors.text }]}>{formatPrice(listing.price)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
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
    backgroundColor: theme.colors.buttonBg,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  errorButtonText: {
    color: theme.colors.buttonText,
    fontWeight: '700',
  },
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
    marginBottom: 10,
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
  heroCopy: {
    flex: 1,
    gap: 3,
  },
  heroName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
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
  heroDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
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
  emptyListings: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  emptyListingsText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },

  // Listing card
  card: {
    width: 220,
    height: 300,
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
  cardInfo: {
    paddingHorizontal: 11,
    paddingTop: 11,
    paddingBottom: 0,
    backgroundColor: 'transparent',
    justifyContent: 'flex-start',
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
  },
  cardTitleFlex: {
    flex: 1,
    marginRight: 8,
  },
  cardPrice: {
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 0,
  },
  cardLocation: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
});
