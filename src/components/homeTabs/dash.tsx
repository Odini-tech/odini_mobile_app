import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ImageBackground,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import { supabase } from '../../../lib/supabase';
import { useAppData } from '../../context/AppDataContext';
import { useAppMode } from '../../context/AppModeContext';
import { useCurrency } from '../../context/CurrencyContext';
import { InteractionService } from '../../services/interactionService';
import { VenueSummary } from '../../services/venueService';
import { formatEventDateSmart } from '../../utils/dateFormat';
import EventDetail from '../details/EventDetail';
import OfferingDetail from '../details/OfferingDetail';
import StayDetail from '../details/StayDetail';
import CardInteractionMenu from '../shared/CardInteractionMenu';

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
  venueId?: string | null;
  venueName?: string | null;
  stays?: any[];
  events?: any[];
  offering?: any[];
}

interface CategoryMix {
  id: string;
  title: string;
  reason: string;
  items: Listing[];
}

export default function Dash({ onItemClick }: { onItemClick?: (listing: Listing) => void }) {
  const router = useRouter();
  const { theme } = useAppMode();
  const styles = getStyles(theme);
  const {
    isReady,
    upcomingEvents: ctxEvents,
    favoritePlaces: ctxFavorites,
    recentlyViewed: ctxRecent,
    madeForYou: ctxMadeForYou,
    categoryMixes: ctxCategoryMixes,
    venues: ctxVenues,
    pastBookings: ctxBookings,
    collections: ctxCollections,
    userName: ctxUserName,
    userId: ctxUserId,
    refresh: ctxRefresh,
    updateFavoritedId,
  } = useAppData();

  const [collections, setCollections] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Listing[]>([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const carouselRef = useRef<ScrollView | null>(null);
  const { formatPrice } = useCurrency();
  const [favoritePlaces, setFavoritePlaces] = useState<Listing[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<Listing[]>([]);
  const [madeForYou, setMadeForYou] = useState<Listing[]>([]);
  const [categoryMixes, setCategoryMixes] = useState<CategoryMix[]>([]);
  const [venues, setVenues] = useState<VenueSummary[]>([]);
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
      setCategoryMixes((ctxCategoryMixes as CategoryMix[]) || []);
      setVenues((ctxVenues as VenueSummary[]) || []);
      setPastBookings(ctxBookings || []);
      setCollections(ctxCollections.length ? ctxCollections : getDefaultCollections());
      setUserName(ctxUserName);
      setUserId(ctxUserId);
      setLoading(false);
    }
  }, [isReady, ctxEvents, ctxFavorites, ctxRecent, ctxMadeForYou, ctxCategoryMixes, ctxVenues, ctxBookings, ctxCollections, ctxUserName, ctxUserId]);

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

  const handleCollectionCheckout = (collection: any) => {
    const params = collection.id
      ? { categoryId: String(collection.id), categoryName: collection.title || collection.name }
      : { query: collection.title || collection.name };
    router.push({ pathname: '/search/results', params });
  };

  const handleHostPress = (hostId: string) => {
    router.push(`/host/${hostId}`);
  };

  const handleVenuePress = (venueId: string) => {
    router.push(`/venue/${venueId}` as any);
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
        setCategoryMixes((prev) => prev.map((m) => ({ ...m, items: m.items.filter((l) => l.id !== listing.id) })).filter((m) => m.items.length > 0));
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
        setCategoryMixes((prev) => prev.map((m) => ({ ...m, items: m.items.filter((l) => l.id !== listing.id) })).filter((m) => m.items.length > 0));
      }
    } catch (err) {
      console.error('Dash interaction error:', err);
    }
  };

  const handleShowAll = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  useEffect(() => {
    if (!collections.length || !carouselRef.current) return;
    const interval = setInterval(() => {
      const nextIndex = (activeSlide + 1) % collections.length;
      setActiveSlide(nextIndex);
      carouselRef.current?.scrollTo({ x: nextIndex * width, y: 0, animated: true });
    }, 4500);
    return () => clearInterval(interval);
  }, [activeSlide, collections.length]);

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
    const listingType = listing?.listing_type || booking.listing_type;
    const dateStr = booking.check_in || booking.event_slot || booking.reservation_time || booking.created_at;
    const displayDate = dateStr
      ? listingType === 'event'
        ? formatEventDateSmart(dateStr)
        : new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
      : null;
    const typeColor =
      listingType === 'event'
        ? '#A63456'
        : listingType === 'offering'
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
                  ? 'compass'
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
                name={listing.listing_type === 'event' ? 'calendar' : listing.listing_type === 'offering' ? 'compass' : 'home'}
                size={size === 'small' ? 24 : 32}
                color={accent}
              />
            </View>
          )}
          <View style={[styles.typePill, { backgroundColor: accent }]}>
            <Text style={styles.typePillText}>{listing.listing_type === 'offering' ? 'ACTIVITY' : listing.listing_type.toUpperCase()}</Text>
          </View>
          {listing.is_favorited && (
            <View style={styles.heartBadge}>
              <MaterialCommunityIcons name="heart" size={12} color="#E63B6F" />
            </View>
          )}
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={2}>{listing.title}</Text>
          {listing.venueName ? (
            <TouchableOpacity
              onPress={() => listing.venueId && handleVenuePress(listing.venueId)}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
              <Text style={[styles.cardLocation, styles.cardVenueLink]} numberOfLines={1}>
                {listing.venueName}
              </Text>
            </TouchableOpacity>
          ) : null}
          <Text style={[styles.cardPrice, { color: theme.colors.text }]}>{formatPrice(listing.price)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderVenueCard = (venue: VenueSummary) => {
    const locationLabel = [venue.location?.city, venue.location?.country].filter(Boolean).join(', ');
    return (
      <TouchableOpacity
        key={venue.id}
        style={styles.smallCard}
        onPress={() => handleVenuePress(venue.id)}
        activeOpacity={0.75}
      >
        <View style={styles.cardImageWrapper}>
          {venue.previewImageUrl ? (
            <Image source={{ uri: venue.previewImageUrl }} style={styles.smallCardImage} />
          ) : (
            <View style={[styles.smallCardImage, styles.cardImagePlaceholder]}>
              <MaterialCommunityIcons name="office-building-marker" size={28} color={theme.colors.textSubtle} />
            </View>
          )}
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>{venue.name}</Text>
          {locationLabel ? (
            <Text style={styles.cardLocation} numberOfLines={1}>{locationLabel}</Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.textMuted} />
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
            tintColor={theme.colors.textMuted}
          />
        }
      >
        <View style={styles.heroSection}>
          <ScrollView
            ref={carouselRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.heroCarouselContainer}
            onMomentumScrollEnd={(event) => {
              const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
              setActiveSlide(nextIndex);
            }}
          >
            {collections.map((collection, index) => (
              <TouchableOpacity
                key={collection.id ?? index}
                style={styles.heroSlide}
                activeOpacity={0.9}
                onPress={() => handleCollectionCheckout(collection)}
              >
                <ImageBackground
                  source={collection.collection_image_url ? { uri: collection.collection_image_url } : collection.image_url ? { uri: collection.image_url } : undefined}
                  style={styles.heroImageBackground}
                  imageStyle={styles.heroImage}
                >
                  <LinearGradient
                    colors={['rgba(0,0,0,0.12)', 'rgba(0,0,0,0.28)', 'rgba(0,0,0,0.66)', theme.colors.background]}
                    style={styles.heroGradient}
                  />
                  <View style={styles.heroOverlay}>
                    <Text style={styles.heroSubtitle}>{collection.title}</Text>
                    <Text style={styles.heroTitle} numberOfLines={2}>
                      {collection.description}
                    </Text>
                    <TouchableOpacity
                      style={styles.checkoutButton}
                      onPress={() => handleCollectionCheckout(collection)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.checkoutButtonText}>Explore</Text>
                    </TouchableOpacity>
                  </View>
                </ImageBackground>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.heroDots}>
            {collections.map((_, index) => (
              <View
                key={index}
                style={[styles.heroDot, index === activeSlide && styles.heroDotActive]}
              />
            ))}
          </View>
        </View>

        {/* Your Favorites */}
        {favoritePlaces.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Your Favorites</Text>
                <Text style={styles.sectionSubtitle}>Places you&apos;ve saved</Text>
              </View>
              {favoritePlaces.length > 4 && (
                <TouchableOpacity style={styles.showAllBtn} onPress={() => handleShowAll('favorites')}>
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
                <TouchableOpacity style={styles.showAllBtn} onPress={() => handleShowAll('recent')}>
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
                <TouchableOpacity style={styles.showAllBtn} onPress={() => handleShowAll('events')}>
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
                <TouchableOpacity style={styles.showAllBtn} onPress={() => handleShowAll('foryou')}>
                  <Text style={styles.showAllText}>
                    {expandedSection === 'foryou' ? 'Show less' : 'See more'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {getDisplayItems(madeForYou, 'foryou').map((l) => renderListingCard(l, 'medium'))}
            </ScrollView>
          </View>
        )}

        {/* Category Mixes — one carousel per tag/interest, from the recommendation engine */}
        {categoryMixes.map((mix) => {
          const sectionId = `mix-${mix.id}`;
          return (
            <View key={mix.id} style={styles.section}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>{mix.title}</Text>
                  <Text style={styles.sectionSubtitle}>{mix.reason}</Text>
                </View>
                {mix.items.length > 4 && (
                  <TouchableOpacity style={styles.showAllBtn} onPress={() => handleShowAll(sectionId)}>
                    <Text style={styles.showAllText}>
                      {expandedSection === sectionId ? 'Show less' : 'See all'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <ScrollView
                horizontal={expandedSection !== sectionId}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={
                  expandedSection !== sectionId ? styles.horizontalScroll : styles.wrappedGrid
                }
              >
                {getDisplayItems(mix.items, sectionId).map((l) => renderListingCard(l, 'medium'))}
              </ScrollView>
            </View>
          );
        })}

        {/* Venues — browse venues directly */}
        {venues.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Venues</Text>
                <Text style={styles.sectionSubtitle}>Places hosting stays, events & activities</Text>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {venues.map((v) => renderVenueCard(v))}
            </ScrollView>
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
              <TouchableOpacity style={styles.showAllBtn} onPress={() => router.push('/bookings' as any)}>
                <Text style={styles.showAllText}>View Status</Text>
              </TouchableOpacity>
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
        <StayDetail listing={selectedListing} onClose={handleCloseDetails} onHostPress={handleHostPress} />
      )}
      {selectedListing && detailsType === 'event' && (
        <EventDetail listing={selectedListing} onClose={handleCloseDetails} onHostPress={handleHostPress} />
      )}
      {selectedListing && detailsType === 'offering' && (
        <OfferingDetail listing={selectedListing} onClose={handleCloseDetails} onHostPress={handleHostPress} />
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
    { id: 1, title: 'LSK Nightlife', description: 'After-dark spots', count: 12, collection_image_url: null },
    { id: 2, title: 'Nshima Spots', description: 'Delicious discoveries', count: 18, collection_image_url: null },
    { id: 3, title: 'Weekend Escapes', description: 'Perfect getaways', count: 8, collection_image_url: null },
    { id: 4, title: 'Arts & Culture', description: 'Creative experiences', count: 15, collection_image_url: null },
  ];
}

const getStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  heroSection: {
    width: '100%',
    height: 320,
  },
  heroCarouselContainer: {
    height: '100%',
  },
  heroSlide: {
    width,
    height: '100%',
    justifyContent: 'flex-end',
  },
  heroImageBackground: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    ...StyleSheet.absoluteFill,
  },
  heroOverlay: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 28,
    justifyContent: 'flex-end',
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 34,
  },
  checkoutButton: {
    marginTop: 18,
    backgroundColor: theme.colors.buttonBg,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 28,
    alignSelf: 'flex-start',
  },
  checkoutButtonText: {
    color: theme.colors.buttonText,
    fontWeight: '700',
    fontSize: 14,
  },
  heroDots: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.45)',
    marginHorizontal: 4,
  },
  heroDotActive: {
    backgroundColor: '#fff',
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
    color: theme.colors.text,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  showAllBtn: {
    backgroundColor: theme.colors.buttonBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    marginTop: 4,
  },
  showAllText: {
    fontSize: 13,
    color: theme.colors.buttonText,
    fontWeight: '600',
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
    width: 220,
    height: 368,
    backgroundColor: 'transparent',
    borderRadius: 5,
    overflow: 'hidden',
    borderWidth: 0,
    elevation: 0,
  },
  mediumCard: {
    width: 220,
    height: 368,
    backgroundColor: 'transparent',
    borderRadius: 5,
    overflow: 'hidden',
    borderWidth: 0,
    elevation: 0,
  },
  cardImageWrapper: {
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
  smallCardImage: {
    width: '100%',
    height: 245,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 5,
  },
  mediumCardImage: {
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
    marginBottom: 2,
  },
  cardLocation: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginBottom: 2,
  },
  cardVenueLink: {
    color: theme.colors.text,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  cardPrice: {
    fontSize: 12,
    fontWeight: '700',
  },
  bookingCard: {
    width: 220,
    height: 368,
    overflow: 'hidden',
    borderWidth: 0,
    elevation: 0,
    backgroundColor: 'transparent',
  },

  bookingCardImage: {
    width: '100%',
    height: 245,
    borderRadius: 5,
    backgroundColor: theme.colors.surfaceAlt,
  },
  bookingCardImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookingCardBody: {
    paddingHorizontal: 11,
    paddingTop: 11,
    paddingBottom: 0,
    gap: 4,
    backgroundColor: 'transparent',
  },
  bookingCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  bookingCardDate: {
    fontSize: 11,
    color: theme.colors.textMuted,
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
    color: theme.colors.textMuted,
    marginTop: 2,
  },
});
