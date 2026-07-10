import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { getSuggestedListings } from '../../../services/listings.service.js';
import { useCurrency } from '../../context/CurrencyContext';
import burgundyTheme, { getListingTypeColor } from '../../theme/burgundyTheme';
import EventDetail from './EventDetail';
import OfferingDetail from './OfferingDetail';
import StayDetail from './StayDetail';

const TYPE_META = {
  stay: { icon: 'home', color: getListingTypeColor('stay'), label: 'Stay' },
  event: { icon: 'calendar', color: getListingTypeColor('event'), label: 'Event' },
  offering: { icon: 'briefcase', color: getListingTypeColor('offering'), label: 'Service' },
};

function getTypeMeta(type) {
  return TYPE_META[type] || TYPE_META.stay;
}

function getSectionTitle(type) {
  if (type === 'stay') return 'Similar stays';
  if (type === 'event') return 'Similar events';
  return 'Similar services';
}

function getSectionSubtitle(type) {
  if (type === 'stay') return 'More stays with the same vibe';
  if (type === 'event') return 'More events you may enjoy';
  return 'More services to explore';
}

export default function DetailSuggestionCarousel({ listing }) {
  const [suggestions, setSuggestions] = useState({ sameType: [], otherType: [] });
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState(null);
  const { formatPrice } = useCurrency();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getSuggestedListings(listing.id, listing.listing_type, 6)
      .then((result) => {
        if (cancelled) return;
        setSuggestions({
          sameType: result.sameType || [],
          otherType: result.otherType || [],
        });
      })
      .catch((err) => {
        console.error('Detail suggestion load failed:', err);
        if (!cancelled) {
          setSuggestions({ sameType: [], otherType: [] });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [listing.id, listing.listing_type]);

  const renderCard = (item) => {
    const typeMeta = getTypeMeta(item.listing_type);
    const location = item.profiles?.location || item.location || item.address_city || null;

    return (
      <TouchableOpacity
        key={item.id}
        activeOpacity={0.85}
        style={styles.card}
        onPress={() => setSelectedListing(item)}
      >
        <View style={styles.cardImageWrapper}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.cardImage} />
          ) : (
            <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
              <Ionicons name={typeMeta.icon} size={32} color={typeMeta.color} />
            </View>
          )}
          <View style={[styles.typePill, { backgroundColor: typeMeta.color }]}> 
            <Text style={styles.typePillText}>{typeMeta.label.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
          {location ? (
            <Text style={styles.cardLocation} numberOfLines={1}>{location}</Text>
          ) : null}
          {item.price != null ? (
            <Text style={[styles.cardPrice, { color: typeMeta.color }]}> {formatPrice(item.price)}</Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const showSameType = !loading && suggestions.sameType.length > 0;
  const showOtherType = !loading && suggestions.otherType.length > 0;
  const typeLabel = getTypeMeta(listing.listing_type).label;

  return (
    <>
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionHeading}>Suggestions</Text>
        <Text style={styles.sectionDesc}>Explore similar options and what else is available.</Text>
      </View>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={burgundyTheme.colors.primary} />
          <Text style={styles.loadingText}>Loading suggestions…</Text>
        </View>
      ) : (
        <>
          {showSameType && (
            <View style={styles.sectionBlock}>
              <View style={styles.sectionTitleRow}>
                <View>
                  <Text style={styles.sectionTitle}>{getSectionTitle(listing.listing_type)}</Text>
                  <Text style={styles.sectionSubtitle}>{getSectionSubtitle(listing.listing_type)}</Text>
                </View>
                <Text style={styles.sectionTypeLabel}>Same {typeLabel}</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollRow}
              >
                {suggestions.sameType.map(renderCard)}
              </ScrollView>
            </View>
          )}

          {showOtherType && (
            <View style={styles.sectionBlock}>
              <View style={styles.sectionTitleRow}>
                <View>
                  <Text style={styles.sectionTitle}>What next?</Text>
                  <Text style={styles.sectionSubtitle}>Try other listing types for a broader experience.</Text>
                </View>
                <Text style={styles.sectionTypeLabel}>Other types</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollRow}
              >
                {suggestions.otherType.map(renderCard)}
              </ScrollView>
            </View>
          )}
        </>
      )}

      {selectedListing?.listing_type === 'stay' && (
        <StayDetail
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
        />
      )}
      {selectedListing?.listing_type === 'event' && (
        <EventDetail
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
        />
      )}
      {selectedListing?.listing_type === 'offering' && (
        <OfferingDetail
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: burgundyTheme.colors.text,
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 12,
    color: burgundyTheme.colors.textMuted,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  loadingText: {
    color: burgundyTheme.colors.textMuted,
    fontSize: 13,
  },
  sectionBlock: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: burgundyTheme.colors.text,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: burgundyTheme.colors.textMuted,
    marginTop: 2,
  },
  sectionTypeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: burgundyTheme.colors.primary,
    textTransform: 'uppercase',
  },
  scrollRow: {
    paddingLeft: 16,
    paddingRight: 16,
  },
  card: {
    width: 220,
    marginRight: 14,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  cardImageWrapper: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: burgundyTheme.colors.surface,
    height: 240,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: burgundyTheme.colors.surfaceAlt,
  },
  typePill: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  typePillText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  cardInfo: {
    paddingTop: 10,
    paddingHorizontal: 10,
    backgroundColor: 'transparent',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: burgundyTheme.colors.text,
    marginBottom: 4,
  },
  cardLocation: {
    fontSize: 11,
    color: burgundyTheme.colors.textMuted,
    marginBottom: 6,
  },
  cardPrice: {
    fontSize: 13,
    fontWeight: '700',
  },
});
