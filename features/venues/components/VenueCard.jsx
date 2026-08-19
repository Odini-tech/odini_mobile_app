import { Ionicons } from '@expo/vector-icons';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppMode } from '@/store/AppModeContext';

/**
 * Standard horizontal venue card — large image on the left, name/location/
 * description/rating on the right. Used wherever venues are listed (Dash's
 * Venues carousel, the venue detail screen's "Similar venues" carousel).
 */
export default function VenueCard({ venue, onPress, style = undefined }) {
  const { theme } = useAppMode();
  const styles = getStyles(theme);
  const locationLabel = [venue.location?.city, venue.location?.country].filter(Boolean).join(', ');

  return (
    <TouchableOpacity style={[styles.container, style]} activeOpacity={0.78} onPress={onPress}>
      <View style={styles.imageWrap}>
        {venue.previewImageUrl ? (
          <Image source={{ uri: venue.previewImageUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Ionicons name="business" size={26} color={theme.colors.textSubtle} />
          </View>
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{venue.name}</Text>
        {locationLabel ? (
          <View style={styles.row}>
            <Ionicons name="location-outline" size={12} color={theme.colors.textMuted} />
            <Text style={styles.location} numberOfLines={1}>{locationLabel}</Text>
          </View>
        ) : null}
        {venue.description ? (
          <Text style={styles.description} numberOfLines={2}>{venue.description}</Text>
        ) : null}
        <View style={styles.footerRow}>
          {venue.listingCount ? (
            <Text style={styles.footerText}>
              {venue.listingCount} {venue.listingCount === 1 ? 'listing' : 'listings'}
            </Text>
          ) : null}
          {venue.averageRating ? (
            <View style={styles.ratingPill}>
              <Ionicons name="star" size={11} color="#FFB800" />
              <Text style={styles.ratingText}>{venue.averageRating.toFixed(1)}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    width: 300,
    height: 112,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  imageWrap: {
    width: 112,
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.surfaceAlt,
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  location: {
    fontSize: 11,
    color: theme.colors.textMuted,
    flexShrink: 1,
  },
  description: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 4,
    lineHeight: 14,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  footerText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.text,
  },
});
