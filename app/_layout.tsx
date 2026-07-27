import * as NavigationBar from "expo-navigation-bar";
import { Slot, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { supabase } from "../lib/supabase";
import { AppModeProvider, useAppMode } from "../src/context/AppModeContext";
import { AppDataProvider } from "../src/context/AppDataContext";
import { BottomNavVisibilityProvider } from "../src/context/BottomNavVisibilityContext";
import { CurrencyProvider } from "../src/context/CurrencyContext";
import {
  attachNotificationTapListener,
  configureNotificationHandler,
  NotificationTapPayload,
  syncPushToken,
} from "../src/services/pushNotificationService";
import BottomNav from "./(tabs)/components/BottomNav";

async function handleNotificationTap(payload: NotificationTapPayload, router: ReturnType<typeof useRouter>) {
  const ids = payload.notificationIds || (payload.notificationId ? [payload.notificationId] : []);
  if (!ids.length) {
    router.push("/notifications" as any);
    return;
  }

  const { data } = await supabase.from("notifications").select("id, data").in("id", ids);
  const rows = data || [];

  if (rows.length === 1) {
    const rowData = (rows[0].data || {}) as { listingId?: string; venueId?: string };
    if (rowData.listingId) {
      router.push({ pathname: "/notifications", params: { openId: rows[0].id } } as any);
      return;
    }
    if (rowData.venueId) {
      router.push(`/venue/${rowData.venueId}` as any);
      return;
    }
  }

  router.push("/notifications" as any);
}

function RootLayoutContent() {
  const router = useRouter();
  const { clearMode, colorScheme } = useAppMode();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    NavigationBar.setStyle(colorScheme === "dark" ? "light" : "dark");
  }, [colorScheme]);

  useEffect(() => {
    let mounted = true;

    // get initial session
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setIsAuthenticated(!!data.session);
      if (data.session) syncPushToken().catch(() => undefined);
    });

    // subscribe to auth changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      if (session) syncPushToken().catch(() => undefined);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    configureNotificationHandler();
    const detach = attachNotificationTapListener((payload) => {
      handleNotificationTap(payload, router).catch((err) => console.warn("Notification tap failed:", err));
    });
    return detach;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleProfile = () => {
    router.push("/profile" as any);
  };

  const handleHome = () => {
    router.push("/home" as any);
  };

  const handleSearch = () => {
    router.push("/search" as any);
  };

  const handleChat = () => {
    router.push("/chat" as any);
  };

  const handleNotifications = () => {
    router.push("/notifications" as any);
  };

  const handleSignOut = async () => {
    try {
      await clearMode();
      await supabase.auth.signOut();
      router.replace("/" as any);
    } catch (e) {
      console.warn("Sign out failed:", e);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Slot />
      </View>
      {isAuthenticated ? (
        <View style={styles.navShell}>
          <BottomNav
            onHomePress={handleHome}
            onChatPress={handleChat}
            onSearchPress={handleSearch}
            onNotificationsPress={handleNotifications}
            onProfilePress={handleProfile}
          />
        </View>
      ) : null}
    </View>
  );
}

export default function RootLayout() {
  return (
    <AppModeProvider>
      <CurrencyProvider>
        <AppDataProvider>
          <BottomNavVisibilityProvider>
            <RootLayoutContent />
          </BottomNavVisibilityProvider>
        </AppDataProvider>
      </CurrencyProvider>
    </AppModeProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  navShell: {
    left: 0,
    right: 0,
    bottom: 0,
  },
});
