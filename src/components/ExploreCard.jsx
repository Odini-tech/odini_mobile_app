import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAppMode } from '../context/AppModeContext';
import { useCurrency } from '../context/CurrencyContext';
import { InteractionService } from '../services/interactionService';
import CardInteractionMenu from './shared/CardInteractionMenu';

const ExploreCard = React.memo(function ExploreCard({ item, onPress, onInteractionAction, isFavorited: propIsFavorited, aspectRatio = 0.75 }) {
  const { theme } = useAppMode();
  const styles = getStyles(theme);
  const { formatPrice } = useCurrency();
  const typeIcon = getTypeIcon(item.listing_type, theme);
  const imageUrl = getFirstImageUrl(item);
  const [menuVisible, setMenuVisible] = useState(false);
  const [isFavorited, setIsFavorited] = useState(propIsFavorited ?? false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  // Track whether initial value came from props so we can skip the DB round-trip
  const hasPropRef = useRef(propIsFavorited !== undefined);

  useEffect(() => {
    if (!hasPropRef.current) checkIfFavorited();
  }, [item.id]);

  const checkIfFavorited = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      if (!userId) return;
      const { data } = await supabase
        .from('interactions')
        .select('id, last_action')
        .eq('user_id', userId)
        .eq('listing_id', item.id)
        .gte('score', 5)
        .maybeSingle();
      setIsFavorited(!!data);
    } catch (_) {}
  };

  const handleLongPress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    setMenuVisible(true);
  };

  const handleInteractionAction = async (actionId, listing) => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      if (!userId) return;

      if (actionId === 'favorite') {
        if (isFavorited) {
          await supabase
            .from('interactions')
            .delete()
            .eq('user_id', userId)
            .eq('listing_id', listing.id)
            .gte('score', 5);
          setIsFavorited(false);
        } else {
          await InteractionService.trackSave(userId, listing.id);
          setIsFavorited(true);
        }
      } else if (actionId === 'dislike') {
        await InteractionService.trackSwipe(userId, listing.id, 'left');
      } else if (actionId === 'hide') {
        await supabase.from('interactions').insert({
          user_id: userId,
          listing_id: listing.id,
          score: -1,
          last_action: JSON.stringify({ action: 'hide' }),
        });
      }

      onInteractionAction?.(actionId, listing);
    } catch (err) {
      console.error('Interaction action error:', err);
    }
  };

  return (
    <>
      <Animated.View style={[styles.cardWrapper, { transform: [{ scale: scaleAnim }] }]}>
        <TouchableOpacity
          style={styles.card}
          onPress={onPress}
          onLongPress={handleLongPress}
          delayLongPress={350}
          activeOpacity={0.85}
        >
          <View style={[styles.imageContainer, { aspectRatio }]}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.image} />
            ) : (
              <View style={[styles.image, styles.imagePlaceholder]}>
                <Ionicons name={typeIcon.name} size={40} color={typeIcon.color} />
              </View>
            )}

            {/* price + type badge placed as overlay at bottom-left of the image */}
            <View style={styles.priceBadge}>
              <Ionicons name={typeIcon.name} size={12} color={typeIcon.color} />
              <Text style={styles.priceBadgeText}>{item.price ? formatPrice(item.price) : '—'}</Text>
            </View>

            {isFavorited && (
              <View style={styles.favoriteBadge}>
                <Ionicons name="heart" size={12} color={theme.colors.danger} />
              </View>
            )}
          </View>

          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>

          <View style={styles.cardFooter}>
            <Text style={styles.hostName} numberOfLines={1}>
              {item.profiles?.location || ''}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>

      <CardInteractionMenu
        visible={menuVisible}
        listing={item}
        onAction={handleInteractionAction}
        onClose={() => setMenuVisible(false)}
      />
    </>
  );
});

export default ExploreCard;

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

function getTypeIcon(listingType, theme) {
  const icons = {
    stay: { name: 'home', color: theme.listingTypeColors.stay },
    event: { name: 'calendar', color: theme.listingTypeColors.event },
    offering: { name: 'compass', color: theme.listingTypeColors.offering },
  };
  return icons[listingType] || icons.stay;
}

const getStyles = (theme) => StyleSheet.create({
  cardWrapper: {
    flex: 1,
  },
  card: {
    flex: 1,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    marginHorizontal: 3,
    marginBottom: 8,
  },
  imageContainer: {
    borderRadius: 6,
    width: '100%',
    aspectRatio: 0.75,
    backgroundColor: theme.colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow,
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    gap: 16,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 2
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.border
  },
  priceBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
  },
  priceBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  favoriteBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  price: {
    fontSize: 12,
    fontWeight: '700',
  },
  hostName: {
    fontSize: 12,
    color: theme.colors.textMuted,
    flex: 1,
    paddingBottom: 10,
  },
});
