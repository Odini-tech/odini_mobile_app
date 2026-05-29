import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import burgundyTheme from '../../theme/burgundyTheme';

const ACTIONS = [
  {
    id: 'favorite',
    label: 'Add to Favorites',
    icon: 'heart',
    color: burgundyTheme.colors.danger,
    description: 'Save this to your favorites',
  },
  {
    id: 'dislike',
    label: 'Not Interested',
    icon: 'thumbs-down',
    color: burgundyTheme.colors.textMuted,
    description: 'See less of this type',
  },
  {
    id: 'hide',
    label: 'Hide This',
    icon: 'eye-off',
    color: burgundyTheme.colors.textSubtle,
    description: "Don't show this listing again",
  },
];

export default function CardInteractionMenu({ visible, listing, onAction, onClose }) {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible && !listing) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.container}>
        <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.handle} />

          {listing && (
            <View style={styles.listingPreview}>
              <View style={styles.listingDot} />
              <Text style={styles.listingTitle} numberOfLines={1}>
                {listing.title}
              </Text>
              <View style={[styles.typePill, { backgroundColor: `${burgundyTheme.colors.primary}18` }]}>
                <Text style={[styles.typeText, { color: burgundyTheme.colors.primary }]}>
                  {listing.listing_type?.toUpperCase()}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.actions}>
            {ACTIONS.map((action, index) => (
              <TouchableOpacity
                key={action.id}
                style={[styles.actionRow, index < ACTIONS.length - 1 && styles.actionBorder]}
                onPress={() => {
                  onAction(action.id, listing);
                  onClose();
                }}
                activeOpacity={0.65}
              >
                <View style={[styles.actionIcon, { backgroundColor: `${action.color}18` }]}>
                  <Ionicons name={action.icon} size={22} color={action.color} />
                </View>
                <View style={styles.actionText}>
                  <Text style={styles.actionLabel}>{action.label}</Text>
                  <Text style={styles.actionDesc}>{action.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={burgundyTheme.colors.border} />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.cancelButton} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: burgundyTheme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
    paddingHorizontal: 16,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: burgundyTheme.colors.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  listingPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: burgundyTheme.colors.border,
  },
  listingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: burgundyTheme.colors.primary,
  },
  listingTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: burgundyTheme.colors.text,
  },
  typePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  actions: {
    backgroundColor: burgundyTheme.colors.surfaceAlt,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: burgundyTheme.colors.border,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
    backgroundColor: burgundyTheme.colors.surface,
  },
  actionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: burgundyTheme.colors.border,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: burgundyTheme.colors.text,
    marginBottom: 2,
  },
  actionDesc: {
    fontSize: 12,
    color: burgundyTheme.colors.textMuted,
  },
  cancelButton: {
    backgroundColor: burgundyTheme.colors.surfaceAlt,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: burgundyTheme.colors.border,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: burgundyTheme.colors.textMuted,
  },
});
