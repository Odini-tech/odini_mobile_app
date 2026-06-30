import { MaterialCommunityIcons } from '@expo/vector-icons';
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
  View
} from 'react-native';

import { supabase } from '../../../lib/supabase';
import { useCurrency } from '../../context/CurrencyContext';
import { useAppData } from '../../context/AppDataContext';
import { InteractionService } from '../../services/interactionService';
import CurrencyPicker from '../settings/CurrencyPicker';
import burgundyTheme from '../../theme/burgundyTheme';
import CardInteractionMenu from '../shared/CardInteractionMenu';
import EventDetail from '../details/EventDetail';
import OfferingDetail from '../details/OfferingDetail';
import StayDetail from '../details/StayDetail';

const { width } = Dimensions.get('window');

interface Listing {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  listing_type: string;
  price: number | null;
  is_favorited?: boolean;
  // Supabase returns profiles as object; enriched listings may return array form
  profiles?: { firstname?: string; username?: string; location?: string } | any;
  stays?: any[];
  events?: any[];
  offering?: any[];
}

export default function Dash({ onItemClick }: { onItemClick?: (listing: Listing) => void }) {
  const { formatPrice, selectedCurrency } = useCurrency();
  const {
    isReady,
    upcomingEvents: ctxEvents,
    favoritePlaces: ctxFavorites,
    recentlyViewed: ctxRecent,
    madeForYou: ctxMadeForYou,
    pastBookings: ctxBookings,
    collections: ctxCollections,
    userName: ctxUserName,
    userId: ctxUserId,
    refresh: ctxRefresh,
    updateFavoritedId,
  } = useAppData();

  const [currencyPickerVisible, setCurrencyPickerVisible] = useState(false);
  const [collections, setCollections] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Listing[]>([]);
  const [favoritePlaces, setFavoritePlaces] = useState<Listing[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<Listing[]>([]);
  const [madeForYou, setMadeForYou] = useState<Listing[]>([]);
  const [pastBookings, setPastBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('there');
  const [userId, setUserId] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const [menuListing, setMenuListing] = useState<Listing | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [detailsType, setDetailsType] = useState<string | null>(null);
  const detailRequestRef = useRef<string | null>(null);

  // Seed from context once data is ready
  const seededRef = useRef(false);
  useEffect(() => {
    if (isReady && !seededRef.current) {
      seededRef.current = true;
      setUpcomingEvents((ctxEvents as Listing[]) || []);
      setFavoritePlaces((ctxFavorites as Listing[]) || []);
      setRecentlyViewed((ctxRecent as Listing[]) || []);
      setMadeForYou((ctxMadeForYou as Listing[]) || []);
      setPastBookings(ctxBookings || []);
      setCollections(ctxCollections.length ? ctxCollections : getDefaultCollections());
      setUserName(ctxUserName);
      setUserId(ctxUserId);
      setLoading(false);
    }
  }, [isReady, ctxEvents, ctxFavorites, ctxRecent, ctxMadeForYou, ctxBookings, ctxCollections, ctxUserName, ctxUserId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    seededRef.current = false;
    await ctxRefresh();
    setRefreshing(false);
  };

  const handleCardPress = async (listing: Listing) => {
    detailRequestRef.current = listing.id;
    setDetailsType(listing.listing_type);
    setSelectedListing(listing);
    onItemClick?.(listing);

    if (userId) {
      InteractionService.trackClick(userId, listing.id).catch(() => {});
    }
  };

  const handleCloseDetails = () => {
    detailRequestRef.current = null;
    setSelectedListing(null);
    setDetailsType(null);
  };

  const handleLongPress = (listing: Listing) => {
    setMenuListing(listing);
    setMenuVisible(true);
  };

  const handleInteractionAction = async (actionId: string, listing: Listing) => {
    if (!userId) return;
    try {
      if (actionId === 'favorite') {
        await InteractionService.trackSave(userId, listing.id);
        const isFav = favoritePlaces.some((l) => l.id === listing.id);
        if (!isFav) {
          setFavoritePlaces((prev) => [listing, ...prev]);
          updateFavoritedId(listing.id, true);
        }
      } else if (actionId === 'dislike') {
        await InteractionService.trackSwipe(userId, listing.id, 'left');
        setMadeForYou((prev) => prev.filter((l) => l.id !== listing.id));
        setUpcomingEvents((prev) => prev.filter((l) => l.id !== listing.id));
      } else if (actionId === 'hide') {
        await supabase.from('interactions').insert({
          user_id: userId,
          listing_id: listing.id,
          score: -1,
          last_action: JSON.stringify({ action: 'hide' }),
        });
        setMadeForYou((prev) => prev.filter((l) => l.id !== listing.id));
        setUpcomingEvents((prev) => prev.filter((l) => l.id !== listing.id));
        setRecentlyViewed((prev) => prev.filter((l) => l.id !== listing.id));
        setFavoritePlaces((prev) => prev.filter((l) => l.id !== listing.id));
      }
    } catch (err) {
      console.error('Dash interaction error:', err);
    }
  };

  const handleShowAll = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  const getDisplayItems = (items: Listing[], sectionId: string) => {
    return expandedSection === sectionId ? items : items.slice(0, 4);
  };

  const renderBookingCard = (booking: any) => {
    const listing = booking.listings;
    const statusColors: Record<string, string> = {
      completed: '#22C55E',
      confirmed: '#3B82F6',
      pending: '#F59E0B',
      cancelled_by_user: '#6B7280',
      cancelled_by_host: '#6B7280',
      rejected: '#EF4444',
    };
    const statusColor = statusColors[booking.status] || '#6B7280';
    const dateStr = booking.check_in || booking.event_slot || booking.reservation_time || booking.created_at;
    const displayDate = dateStr
      ? new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
      : null;
    const typeColor =
      (listing?.listing_type || booking.listing_type) === 'event'
        ? '#A63456'
        : (listing?.listing_type || booking.listing_type) === 'offering'
        ? '#8B4B61'
        : '#7A1E3A';

    return (
      <View key={booking.id} style={styles.bookingCard}>
        {listing?.image_url ? (
          <Image source={{ uri: listing.image_url }} style={styles.bookingCardImage} />
        ) : (
          <View style={[styles.bookingCardImage, styles.bookingCardImagePlaceholder]}>
            <MaterialCommunityIcons
              name={
                (listing?.listing_type || booking.listing_type) === 'event'
                  ? 'calendar'
                  : (listing?.listing_type || booking.listing_type) === 'offering'
                  ? 'briefcase'
                  : 'home'
              }
              size={24}
              color={typeColor}
            />
          </View>
        )}
        <View style={styles.bookingCardBody}>
          <Text style={styles.bookingCardTitle} numberOfLines={2}>
            {listing?.title || 'Booking'}
          </Text>
          {displayDate && (
            <Text style={styles.bookingCardDate}>{displayDate}</Text>
          )}
          <View style={[styles.bookingStatusPill, { backgroundColor: statusColor + '22' }]}>
            <View style={[styles.bookingStatusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.bookingStatusText, { color: statusColor }]}>
              {booking.status.replace(/_/g, ' ')}
            </Text>
          </View>
          <Text style={styles.bookingRef}>{booking.booking_ref}</Text>
        </View>
      </View>
    );
  };

  const renderCollectionCard = (collection: { id: number; title: string; description: string; count: number; image: string | null }) => {
    const imageSource = collection.image
      ? (typeof collection.image === 'string' ? { uri: collection.image } : collection.image)
      : null;

    return (
      <TouchableOpacity key={collection.id} style={styles.collectionCard} activeOpacity={0.8}>
        {imageSource && <Image source={imageSource} style={styles.collectionImage} />}
        <View style={[styles.collectionOverlay, !imageSource && { backgroundColor: burgundyTheme.colors.primary }]} />
        <View style={styles.collectionContent}>
          <Text style={styles.collectionTitle}>{collection.title}</Text>
          <Text style={styles.collectionDesc}>{collection.description}</Text>
          <Text style={styles.collectionCount}>{collection.count} places</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderListingCard = (listing: Listing, size: 'small' | 'medium' = 'medium') => {
    const cardStyle = size === 'small' ? styles.smallCard : styles.mediumCard;
    const imageStyle = size === 'small' ? styles.smallCardImage : styles.mediumCardImage;
    const accent = listing.listing_type === 'event'
      ? '#A63456'
      : listing.listing_type === 'offering'
      ? '#8B4B61'
      : '#7A1E3A';

    return (
      <TouchableOpacity
        key={listing.id}
        style={cardStyle}
        onPress={() => handleCardPress(listing)}
        onLongPress={() => handleLongPress(listing)}
        delayLongPress={350}
        activeOpacity={0.75}
      >
        <View style={styles.cardImageWrapper}>
          {listing.image_url ? (
            <Image source={{ uri: listing.image_url }} style={imageStyle} />
          ) : (
            <View style={[imageStyle, styles.cardImagePlaceholder]}>
              <MaterialCommunityIcons
                name={listing.listing_type === 'event' ? 'calendar' : listing.listing_type === 'offering' ? 'briefcase' : 'home'}
                size={size === 'small' ? 24 : 32}
                color={accent}
              />
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
          {listing.price ? (
            <Text style={[styles.cardPrice, { color: accent }]}>{formatPrice(listing.price)}</Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={burgundyTheme.colors.primary} />
      </View>
    );
  }

  const greeting = getGreeting();

  return (
    <>
      <ScrollView
        style={styles.container}
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
        <View style={styles.heroSection}>
          <View style={styles.heroRow}>
            <View style={styles.heroContent}>
              <Text style={styles.heroSubtitle}>{greeting}</Text>
              <Text style={styles.heroTitle}>
                {userName.charAt(0).toUpperCase() + userName.slice(1)}
              </Text>
              {userId && favoritePlaces.length > 0 && (
                <View style={styles.heroMeta}>
                  <MaterialCommunityIcons name="heart" size={14} color={burgundyTheme.colors.danger} />
                  <Text style={styles.heroMetaText}>
                    {favoritePlaces.length} saved place{favoritePlaces.length !== 1 ? 's' : ''}
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={styles.currencyButton}
              onPress={() => setCurrencyPickerVisible(true)}
              activeOpacity={0.75}
            >
              <Text style={styles.currencyFlag}>{selectedCurrency.flag}</Text>
              <Text style={styles.currencyCode}>{selectedCurrency.code}</Text>
              <MaterialCommunityIcons name="chevron-down" size={14} color={burgundyTheme.colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Collections */}
        {collections.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Collections</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.collectionsContainer}
            >
              {collections.map(renderCollectionCard)}
            </ScrollView>
          </View>
        )}

        {/* Your Favorites */}
        {favoritePlaces.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Your Favorites</Text>
                <Text style={styles.sectionSubtitle}>Places you&apos;ve saved</Text>
              </View>
              {favoritePlaces.length > 4 && (
                <TouchableOpacity onPress={() => handleShowAll('favorites')}>
                  <Text style={styles.showAllText}>
                    {expandedSection === 'favorites' ? 'Show less' : 'See all'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <ScrollView
              horizontal={expandedSection !== 'favorites'}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={
                expandedSection !== 'favorites'
                  ? styles.horizontalScroll
                  : styles.wrappedGrid
              }
            >
              {getDisplayItems(favoritePlaces, 'favorites').map((l) => renderListingCard(l, 'medium'))}
            </ScrollView>
          </View>
        )}

        {/* Recently Viewed */}
        {recentlyViewed.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recently Viewed</Text>
              {recentlyViewed.length > 4 && (
                <TouchableOpacity onPress={() => handleShowAll('recent')}>
                  <Text style={styles.showAllText}>
                    {expandedSection === 'recent' ? 'Show less' : 'Show all'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {recentlyViewed.map((l) => renderListingCard(l, 'small'))}
            </ScrollView>
          </View>
        )}

        {/* Coming Up (Events) */}
        {upcomingEvents.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Coming Up</Text>
                <Text style={styles.sectionSubtitle}>Events near you</Text>
              </View>
              {upcomingEvents.length > 4 && (
                <TouchableOpacity onPress={() => handleShowAll('events')}>
                  <Text style={styles.showAllText}>
                    {expandedSection === 'events' ? 'Show less' : 'View all'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {getDisplayItems(upcomingEvents, 'events').map((l) => renderListingCard(l, 'medium'))}
            </ScrollView>
          </View>
        )}

        {/* Made For You */}
        {madeForYou.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Made For You</Text>
                <Text style={styles.sectionSubtitle}>
                  {userId ? 'Based on your activity' : 'Personalized recommendations'}
                </Text>
              </View>
              {madeForYou.length > 4 && (
                <TouchableOpacity onPress={() => handleShowAll('foryou')}>
                  <Text style={styles.showAllText}>
                    {expandedSection === 'foryou' ? 'Show less' : 'See more'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.twoColGrid}>
              {getDisplayItems(madeForYou, 'foryou').map((l) => renderListingCard(l, 'medium'))}
            </View>
          </View>
        )}

        {/* Your Trips */}
        {pastBookings.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Your Trips</Text>
                <Text style={styles.sectionSubtitle}>Recent bookings</Text>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {pastBookings.map(renderBookingCard)}
            </ScrollView>
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      {selectedListing && detailsType === 'stay' && (
        <StayDetail listing={selectedListing} onClose={handleCloseDetails} />
      )}
      {selectedListing && detailsType === 'event' && (
        <EventDetail listing={selectedListing} onClose={handleCloseDetails} />
      )}
      {selectedListing && detailsType === 'offering' && (
        <OfferingDetail listing={selectedListing} onClose={handleCloseDetails} />
      )}

      <CardInteractionMenu
        visible={menuVisible}
        listing={menuListing}
        onAction={handleInteractionAction}
        onClose={() => {
          setMenuVisible(false);
          setMenuListing(null);
        }}
      />

      <CurrencyPicker
        visible={currencyPickerVisible}
        onClose={() => setCurrencyPickerVisible(false)}
      />
    </>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getDefaultCollections() {
  return [
    { id: 1, title: 'LSK Nightlife', description: 'After-dark spots', count: 12, image: null },
    { id: 2, title: 'Nshima Spots', description: 'Delicious discoveries', count: 18, image: null },
    { id: 3, title: 'Weekend Escapes', description: 'Perfect getaways', count: 8, image: null },
    { id: 4, title: 'Arts & Culture', description: 'Creative experiences', count: 15, image: null },
  ];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: burgundyTheme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: burgundyTheme.colors.background,
  },
  heroSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: burgundyTheme.colors.border,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroContent: {
    gap: 2,
    flex: 1,
  },
  currencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: burgundyTheme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: burgundyTheme.colors.border,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 4,
  },
  currencyFlag: {
    fontSize: 14,
  },
  currencyCode: {
    fontSize: 12,
    fontWeight: '600',
    color: burgundyTheme.colors.text,
  },
  heroSubtitle: {
    fontSize: 13,
    color: burgundyTheme.colors.textMuted,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: burgundyTheme.colors.text,
    letterSpacing: -0.5,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  heroMetaText: {
    fontSize: 12,
    color: burgundyTheme.colors.textMuted,
  },
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
  showAllText: {
    fontSize: 13,
    color: burgundyTheme.colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  collectionsContainer: {
    paddingRight: 14,
    gap: 12,
  },
  collectionCard: {
    width: 220,
    height: 130,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: burgundyTheme.colors.surface,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  collectionImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  collectionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  collectionContent: {
    flex: 1,
    padding: 14,
    justifyContent: 'space-between',
  },
  collectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  collectionDesc: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
  },
  collectionCount: {
    fontSize: 11,
    color: '#fff',
  },
  horizontalScroll: {
    paddingRight: 14,
    gap: 12,
  },
  wrappedGrid: {
    flexWrap: 'wrap',
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 8,
  },
  twoColGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  smallCard: {
    width: 130,
    backgroundColor: burgundyTheme.colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: burgundyTheme.colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  mediumCard: {
    width: (width - 28 - 12) / 2,
    backgroundColor: burgundyTheme.colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: burgundyTheme.colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  cardImageWrapper: {
    position: 'relative',
  },
  smallCardImage: {
    width: '100%',
    height: 90,
    backgroundColor: burgundyTheme.colors.surfaceAlt,
  },
  mediumCardImage: {
    width: '100%',
    height: 120,
    backgroundColor: burgundyTheme.colors.surfaceAlt,
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
  cardInfo: {
    padding: 8,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: burgundyTheme.colors.text,
    marginBottom: 2,
  },
  cardPrice: {
    fontSize: 12,
    fontWeight: '700',
  },
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
  },
  bookingCardImage: {
    width: '100%',
    height: 100,
    backgroundColor: burgundyTheme.colors.surfaceAlt,
  },
  bookingCardImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookingCardBody: {
    padding: 10,
    gap: 4,
  },
  bookingCardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: burgundyTheme.colors.text,
  },
  bookingCardDate: {
    fontSize: 11,
    color: burgundyTheme.colors.textMuted,
  },
  bookingStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
    marginTop: 2,
  },
  bookingStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  bookingStatusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  bookingRef: {
    fontSize: 10,
    color: burgundyTheme.colors.textMuted,
    marginTop: 2,
  },
});
