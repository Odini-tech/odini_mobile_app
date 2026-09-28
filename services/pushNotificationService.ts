import Constants from 'expo-constants';
import * as Device from 'expo-device';
import type { NotificationBehavior } from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/services/supabase/client';
import { ensureNotificationPermission } from '@/services/notificationPermissionService';

const LAST_SYNCED_TOKEN_KEY = '@odini/last_synced_push_token';

const expoExtra =
  (Constants.expoConfig && Constants.expoConfig.extra) ||
  ((Constants as any).manifest && (Constants as any).manifest.extra) ||
  {};

const easProjectId: string | undefined = expoExtra?.eas?.projectId;

// Android remote push support was pulled from Expo Go in SDK 53, and even
// `import`-ing expo-notifications there throws. Detect Expo Go and lazily
// require the module only outside it, so the app still boots in Expo Go.
const isExpoGo = Constants.appOwnership === 'expo';
const Notifications: typeof import('expo-notifications') | null = isExpoGo
  ? null
  : require('expo-notifications');

/**
 * Governs how a push shows up while the app is in the foreground. Registered
 * once at app startup, before any permission/token work happens.
 */
export function configureNotificationHandler(): void {
  if (!Notifications) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      // Older expo-notifications typings only know this field; the two above
      // cover current SDKs. Harmless if ignored.
      shouldShowAlert: true,
    } as NotificationBehavior),
  });

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    }).catch(() => undefined);
  }
}

async function getExpoPushToken(): Promise<string | null> {
  if (!Notifications) return null; // running in Expo Go — no native module available
  if (!Device.isDevice) return null; // push tokens aren't issued to simulators/emulators

  const permission = await ensureNotificationPermission();
  if (permission !== 'granted') return null;

  try {
    const { data } = await Notifications.getExpoPushTokenAsync(
      easProjectId ? { projectId: easProjectId } : undefined
    );
    return data;
  } catch (err) {
    console.warn('Failed to get Expo push token:', err);
    return null;
  }
}

/**
 * Requests notification permission (at most once — see
 * notificationPermissionService), fetches this device's Expo push token, and
 * upserts it directly into Supabase's `push_tokens` table for the signed-in
 * user. Safe to call on every app open — skips the network round-trip when
 * the token hasn't changed since the last successful sync. Writing directly
 * (rather than through the recommendation-engine's optional dual-mode API)
 * means booking/reminder pushes keep working even if that service is down.
 */
export async function syncPushToken(): Promise<void> {
  const token = await getExpoPushToken();
  if (!token) return;

  try {
    const lastSynced = await AsyncStorage.getItem(LAST_SYNCED_TOKEN_KEY);
    if (lastSynced === token) return;

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return;

    const { error } = await supabase.from('push_tokens').upsert(
      {
        user_id: userId,
        expo_push_token: token,
        platform: Platform.OS,
        is_valid: true,
        updated_at: new Date().toISOString(),
        last_used_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,expo_push_token' }
    );
    if (error) throw error;

    await AsyncStorage.setItem(LAST_SYNCED_TOKEN_KEY, token);
  } catch (err) {
    console.warn('Failed to sync push token:', err);
  }
}

export type NotificationTapPayload = {
  notificationIds?: string[];
  notificationId?: string;
  bookingId?: string;
  listingId?: string;
  venueId?: string;
  [key: string]: unknown;
};

/**
 * Subscribes to notification taps (foreground, background, and the response
 * that brought the app back from a cold start via getLastNotificationResponseAsync).
 * Returns a cleanup function.
 */
export function attachNotificationTapListener(
  onTap: (payload: NotificationTapPayload) => void
): () => void {
  if (!Notifications) return () => undefined;

  Notifications.getLastNotificationResponseAsync()
    .then((response) => {
      if (response?.notification.request.content.data) {
        onTap(response.notification.request.content.data as NotificationTapPayload);
      }
    })
    .catch(() => undefined);

  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    onTap(response.notification.request.content.data as NotificationTapPayload);
  });

  return () => subscription.remove();
}

export default {
  configureNotificationHandler,
  syncPushToken,
  attachNotificationTapListener,
};
