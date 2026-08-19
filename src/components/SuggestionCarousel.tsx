import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { startTransition, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/services/supabase/client';
import { useCurrency } from '@/store/CurrencyContext';
import EventDetail from './details/EventDetail';
import OfferingDetail from './details/OfferingDetail';
import StayDetail from './details/StayDetail';

const { width: SW, height: SH } = Dimensions.get('window');
const SQUARE_SIZE = Math.min(SW - 72, SH * 0.42);

interface SuggestionListing {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  listing_type: 'stay' | 'event' | 'offering';
  price: number | null;
  image_url: string | null;
  profiles?: {
    id?: string | null;
    username?: string | null;
    firstname?: string | null;
    lastname?: string | null;
    location?: string | null;
    role?: string | null;
  } | null;
  events?: any[] | null;
  stays?: any[] | null;
  offering?: any[] | null;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  excludeListingId?: string;
  bookedListingType?: 'stay' | 'event' | 'offering';
}

const TYPE_META = {
  stay:     { icon: 'home',      color: '#7C3048', label: 'Stay' },
  event:    { icon: 'calendar',  color: '#3B82F6', label: 'Event' },
  offering: { icon: 'compass', color: '#8B5CF6', label: 'Activity' },
} as const;

function shuffleArray<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const IMAGE_TABLE: Record<string, string> = {
  stay: 'stay_images',
  event: 'event_images',
  offering: 'offering_images',
};

async function loadSuggestions(
  excludeId?: string,
  bookedListingType?: 'stay' | 'event' | 'offering'
): Promise<SuggestionListing[]> {
  let query = supabase
    .from('listings')
    .select(`
      id, host_id, title, description, listing_type, price,
      profiles:host_id(id, username, firstname, lastname, location, role),
      events(event_time, event_type, capacity, available_slots, end_time),
      stays(durations_nights, max_guests, available_rooms),
      offering(service_type, opening_hours, duration_minutes, max_bookings)
    `)
    .eq('is_active', true)
    .limit(24);

  // Stay booking → show only events and services (diversify the experience)
  if (bookedListingType === 'stay') {
    query = query.in('listing_type', ['event', 'offering']);
  }
  // Event or offering booking → show all types (no filter)

  if (excludeId) query = query.neq('id', excludeId);

  const { data, error } = await query;
  if (error || !data || data.length === 0) return [];

  // Shuffle and take 6 — fast and varied
  const shuffled = shuffleArray(data).slice(0, 6);

  const enriched = await Promise.all(
    shuffled.map(async (item) => {
      const tbl = IMAGE_TABLE[item.listing_type] ?? 'stay_images';
      const { data: imgs } = await supabase
        .from(tbl)
        .select('image_url')
        .eq('listing_id', item.id)
        .limit(1);
      return { ...item, image_url: imgs?.[0]?.image_url ?? null } as SuggestionListing;
    })
  );
  return enriched;
}

const SuggestionCard = React.memo(function SuggestionCard({
  item,
  isActive,
  topPad,
  bottomInset,
  formatPrice,
  onPress,
}: {
  item: SuggestionListing;
  isActive: boolean;
  topPad: number;
  bottomInset: number;
  formatPrice: (n: number) => string;
  onPress: () => void;
}) {
  const meta = TYPE_META[item.listing_type] ?? TYPE_META.stay;
  const zoom = useSharedValue(1);

  useEffect(() => {
    if (isActive) {
      zoom.value = withRepeat(
        withTiming(1.15, { duration: 9000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      cancelAnimation(zoom);
      zoom.value = withTiming(1, { duration: 250 });
    }
    return () => cancelAnimation(zoom);
  }, [isActive, zoom]);

  const zoomStyle = useAnimatedStyle(() => ({
    transform: [{ scale: zoom.value }],
  }));

  return (
    <TouchableOpacity activeOpacity={0.97} style={styles.card} onPress={onPress}>
      {/* Darkened, blurred backdrop — same image, full-bleed */}
      {item.image_url ? (
        <Image
          source={{ uri: item.image_url }}
          style={styles.bgFill}
          resizeMode="cover"
          blurRadius={28}
        />
      ) : (
        <View style={[styles.bgFill, styles.noImageBg]} />
      )}
      <View style={styles.bgDarkOverlay} />

      {/* Type badge — sits just below the top bar */}
      <View style={[styles.typeBadge, { top: topPad, backgroundColor: meta.color }]}>
        <Ionicons name={meta.icon as any} size={12} color="#fff" />
        <Text style={styles.typeBadgeText}>{meta.label.toUpperCase()}</Text>
      </View>

      <View style={styles.cardContent} pointerEvents="box-none">
        <View style={{ height: topPad + 40 }} />

        {/* Sharp square, laid over the blurred backdrop — the whole container zooms */}
        <View style={styles.squareCenterWrap}>
          <Animated.View style={[styles.squareShadowWrap, zoomStyle]}>
            <View style={styles.squareClip}>
              {item.image_url ? (
                <Image
                  source={{ uri: item.image_url }}
                  style={styles.squareImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.squareImage, styles.noImageBg]} />
              )}
            </View>
          </Animated.View>
        </View>

        {/* Bottom text content */}
        <View style={[styles.cardBottom, { paddingBottom: bottomInset + 72 }]}>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
          {item.description ? (
            <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
          ) : null}
          <View style={styles.cardFooterRow}>
            <Text style={styles.cardPrice}>{formatPrice(item.price)}</Text>
            <TouchableOpacity
              style={styles.detailBtn}
              onPress={onPress}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.detailBtnText}>View Details</Text>
              <Ionicons name="arrow-forward" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

export default function SuggestionCarousel({ visible, onClose, excludeListingId, bookedListingType }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { formatPrice } = useCurrency() as any;
  const [listings, setListings] = useState<SuggestionListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedListing, setSelectedListing] = useState<SuggestionListing | null>(null);
  const listRef = useRef<FlatList>(null);
  const viewabilityConfig = { itemVisiblePercentThreshold: 60 };

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;

    startTransition(() => {
      setLoading(true);
      setCurrentIndex(0);
      setSelectedListing(null);
    });

    loadSuggestions(excludeListingId, bookedListingType).then((items) => {
      if (cancelled) return;
      startTransition(() => {
        setListings(items);
        setLoading(false);
      });
    });

    return () => {
      cancelled = true;
    };
  }, [visible, excludeListingId]);

  const handleClose = () => {
    onClose();
    router.push('/home' as any);
  };

  const handleHostPress = (hostId: string) => {
    if (!hostId) return;

    setSelectedListing(null);
    onClose();
    setTimeout(() => {
      router.push(`/host/${hostId}` as any);
    }, 0);
  };

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setCurrentIndex(viewableItems[0].index);
    }
  }, []);

  const renderItem = useCallback(({ item, index }: { item: SuggestionListing; index: number }) => (
    <SuggestionCard
      item={item}
      isActive={index === currentIndex}
      topPad={insets.top + 76}
      bottomInset={insets.bottom}
      formatPrice={formatPrice}
      onPress={() => setSelectedListing(item)}
    />
  ), [insets, formatPrice, currentIndex]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={styles.container}>

        {/* ── Sticky top bar (always on top of cards) ── */}
        <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.titleWrap}>
            <Text style={styles.headerTitle}>You might also like</Text>
            <Text style={styles.headerSub}>
              {bookedListingType === 'stay' ? 'Events & activities near you' : 'More you might enjoy'}
            </Text>
          </View>
          {listings.length > 0 && !loading && (
            <Text style={styles.counter}>{currentIndex + 1} / {listings.length}</Text>
          )}
        </View>

        {/* ── Content ── */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="rgba(255,255,255,0.85)" />
            <Text style={styles.loadingText}>Finding suggestions…</Text>
          </View>
        ) : listings.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="telescope-outline" size={52} color="rgba(255,255,255,0.4)" />
            <Text style={styles.emptyText}>No suggestions available{'\n'}right now</Text>
            <TouchableOpacity style={styles.homeBtn} onPress={handleClose}>
              <Text style={styles.homeBtnText}>Go to Home</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={listings}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            bounces={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            decelerationRate="fast"
            getItemLayout={(_, index) => ({ length: SW, offset: SW * index, index })}
          />
        )}

        {/* ── Dot progress indicators ── */}
        {!loading && listings.length > 1 && (
          <View style={[styles.dotsRow, { paddingBottom: insets.bottom + 20 }]}>
            {listings.map((_, i) => (
              <View key={i} style={[styles.dot, i === currentIndex && styles.dotActive]} />
            ))}
          </View>
        )}
      </View>

      {/* ── Listing detail modals ── */}
      {selectedListing?.listing_type === 'stay' && (
        <StayDetail
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
          onHostPress={handleHostPress}
        />
      )}
      {selectedListing?.listing_type === 'event' && (
        <EventDetail
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
          onHostPress={handleHostPress}
        />
      )}
      {selectedListing?.listing_type === 'offering' && (
        <OfferingDetail
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
          onHostPress={handleHostPress}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },

  // Top bar
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 14,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleWrap: {
    flex: 1,
    paddingHorizontal: 12,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  headerSub: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    marginTop: 1,
  },
  counter: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    fontWeight: '600',
  },

  // Cards
  card: {
    width: SW,
    height: SH,
  },
  noImageBg: {
    backgroundColor: '#1c0b13',
  },
  bgFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bgDarkOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  cardContent: {
    flex: 1,
  },
  squareCenterWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 36,
  },
  squareShadowWrap: {
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  squareClip: {
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#1c0b13',
  },
  squareImage: {
    width: '100%',
    height: '100%',
  },
  typeBadge: {
    position: 'absolute',
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  typeBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  // Card bottom text section
  cardBottom: {
    paddingHorizontal: 24,
    paddingTop: 20,
    zIndex: 2,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  cardDesc: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardPrice: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#7C3048',
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 30,
  },
  detailBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  // Dots
  dotsRow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    zIndex: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotActive: {
    width: 22,
    backgroundColor: '#fff',
  },

  // States
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 40,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  homeBtn: {
    backgroundColor: '#7C3048',
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 28,
    marginTop: 4,
  },
  homeBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
