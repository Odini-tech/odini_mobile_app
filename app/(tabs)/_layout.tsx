import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/services/supabase/client';
import notificationService from '@/services/notificationService';
import { useAppMode } from '@/store/AppModeContext';

export default function TabsLayout() {
  const { theme } = useAppMode();
  const insets = useSafeAreaInsets();
  const [unreadCount, setUnreadCount] = useState(0);
  const channelRef = useRef<ReturnType<typeof notificationService.subscribeToNotificationChanges> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const refreshUnreadCount = async (userId: string) => {
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

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.text,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.surfaceAlt,
          paddingTop: 10,
          paddingBottom: Math.max(14, insets.bottom + 6),
          height: Math.max(58, insets.bottom + 50),
        },
        tabBarBadgeStyle: { backgroundColor: theme.colors.primary },
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Guide',
          tabBarIcon: ({ color }) => <Ionicons name="chatbubble-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color }) => <Ionicons name="search-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarIcon: ({ color }) => <Ionicons name="notifications-outline" size={24} color={color} />,
          tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
