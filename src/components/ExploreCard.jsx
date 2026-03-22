import { Ionicons } from '@expo/vector-icons';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import burgundyTheme, { getListingTypeColor } from '../theme/burgundyTheme';

export default function ExploreCard({ item, onPress }) {
  const typeIcon = getTypeIcon(item.listing_type);
  const imageUrl = getFirstImageUrl(item);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.imageContainer}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Ionicons name={typeIcon.name} size={40} color={typeIcon.color} />
          </View>
        )}

        <View style={[styles.typeBadge, { backgroundColor: typeIcon.color }]}>
          <Ionicons name={typeIcon.name} size={12} color={burgundyTheme.colors.white} />
          <Text style={styles.typeBadgeText}>{item.listing_type.toUpperCase()}</Text>
        </View>
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {item.title}
      </Text>

      <Text style={styles.hostName} numberOfLines={1}>
        by {item.profiles?.firstname || item.profiles?.username || 'Host'}
      </Text>
    </TouchableOpacity>
  );
}

function getFirstImageUrl(item) {
  if (item.image_url) return item.image_url;

  if (Array.isArray(item.images) && item.images.length > 0) {
    const first = item.images[0];
    return typeof first === 'string' ? first : first?.image_url;
  }

  const type = item.listing_type;
  if (type === 'stay' && Array.isArray(item.stay_images) && item.stay_images.length > 0) {
    return item.stay_images[0].image_url;
  }
  if (type === 'event' && Array.isArray(item.event_images) && item.event_images.length > 0) {
    return item.event_images[0].image_url;
  }
  if (type === 'offering' && Array.isArray(item.offering_images) && item.offering_images.length > 0) {
    return item.offering_images[0].image_url;
  }

  return null;
}

function getTypeIcon(listingType) {
  const icons = {
    stay: { name: 'home', color: getListingTypeColor('stay') },
    event: { name: 'calendar', color: getListingTypeColor('event') },
    offering: { name: 'briefcase', color: getListingTypeColor('offering') },
  };
  return icons[listingType] || icons.stay;
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    marginHorizontal: 6,
    marginBottom: 14,
  },
  imageContainer: {
    borderRadius: 12,
    width: '100%',
    aspectRatio: 0.75,
    backgroundColor: burgundyTheme.colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: burgundyTheme.colors.border,
    ...burgundyTheme.shadow,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: burgundyTheme.colors.white,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: burgundyTheme.colors.text,
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  hostName: {
    fontSize: 12,
    color: burgundyTheme.colors.textMuted,
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
});
