import * as NavigationBar from "expo-navigation-bar";
import { Slot, useRouter } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";
import { supabase } from "@/services/supabase/client";
import { AppModeProvider, useAppMode } from "@/store/AppModeContext";
import { AppDataProvider } from "@/store/AppDataContext";
import { BottomNavVisibilityProvider } from "@/store/BottomNavVisibilityContext";
import { CurrencyProvider } from "@/store/CurrencyContext";
import {
  attachNotificationTapListener,
  configureNotificationHandler,
  NotificationTapPayload,
  syncPushToken,
} from "@/services/pushNotificationService";

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
  const { colorScheme } = useAppMode();

  useEffect(() => {
    if (Platform.OS !== "android") return;
    NavigationBar.setStyle(colorScheme === "dark" ? "light" : "dark");
  }, [colorScheme]);

  useEffect(() => {
    let mounted = true;

    // get initial session
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session) syncPushToken().catch(() => undefined);
    });

    // subscribe to auth changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
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

  return <Slot />;
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
