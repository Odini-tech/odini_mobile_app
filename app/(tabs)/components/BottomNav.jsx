import { Ionicons } from '@expo/vector-icons';
import { useSegments } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/services/supabase/client';
import { useAppMode } from '@/store/AppModeContext';
import notificationService from '@/services/notificationService';

export default function BottomNav({
  onHomePress = () => {},
  onChatPress = () => {},
  onSearchPress = () => {},
  onNotificationsPress = () => {},
  onProfilePress = () => {},
}) {
  const segments = useSegments();
  const { theme } = useAppMode();
  const insets = useSafeAreaInsets();
  const styles = getStyles(theme, insets);
  const [unreadCount, setUnreadCount] = useState(0);
  const channelRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const refreshUnreadCount = async (userId) => {
      const { count } = await notificationService.getUnreadCount(userId);
      if (!cancelled) setUnreadCount(count);
    };

    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      if (!userId || cancelled) return;

      await refreshUnreadCount(userId);
      channelRef.current = notificationService.subscribeToNotificationChanges(userId, () => {
        refreshUnreadCount(userId);
      });
    })();

    return () => {
      cancelled = true;
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  const isActive = (name) => {
    if (!segments || segments.length === 0) return name === 'home';
    return segments.includes(name);
  };

  const NAV_ITEMS = [
    { name: 'home',          icon: 'home-outline',          label: 'Home',     onPress: onHomePress },
    { name: 'chat',          icon: 'chatbubble-outline',    label: 'Guide', onPress: onChatPress },
    { name: 'search',        icon: 'search-outline',        label: 'Search',   onPress: onSearchPress },
    { name: 'notifications', icon: 'notifications-outline', label: 'notifications',   onPress: onNotificationsPress, badgeCount: unreadCount },
    { name: 'profile',       icon: 'person-outline',        label: 'Profile',  onPress: onProfilePress },
  ];

  return (
    <View style={styles.container}>
      {NAV_ITEMS.map(({ name, icon, label, onPress, badgeCount }) => {
        const active = isActive(name);
        return (
          <Pressable
            key={name}
            style={[styles.button, active && styles.buttonActive]}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={label}
          >
            <View style={styles.iconWrap}>
              <Ionicons
                name={icon}
                size={24}
                color={active ? theme.colors.text : theme.colors.textMuted}
              />
              {badgeCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText} numberOfLines={1}>
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const getStyles = (theme, insets) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingTop: 10,
      paddingBottom: Math.max(14, insets.bottom + 6),
      paddingHorizontal: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.surfaceAlt,
      backgroundColor: theme.colors.surface,
    },
    button: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 14,
      paddingVertical: 6,
    },
    iconWrap: {
      position: 'relative',
    },
    badge: {
      position: 'absolute',
      top: -4,
      right: -8,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      paddingHorizontal: 3,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    badgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#fff',
    },
    buttonActive: {
      backgroundColor: theme.colors.surfaceAlt,
    },
    label: {
      fontSize: 11,
      color: theme.colors.textMuted,
      marginTop: 4,
    },
    labelActive: {
      color: theme.colors.text,
      fontWeight: '700',
    },
  });
