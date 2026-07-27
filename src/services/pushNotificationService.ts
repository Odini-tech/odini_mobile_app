import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { callRecommendationApi, getRecommendationModeStatus } from './recommendationGateway';

const LAST_SYNCED_TOKEN_KEY = '@odini/last_synced_push_token';

const expoExtra =
  (Constants.expoConfig && Constants.expoConfig.extra) ||
  ((Constants as any).manifest && (Constants as any).manifest.extra) ||
  {};

const easProjectId: string | undefined = expoExtra?.eas?.projectId;

/**
 * Governs how a push shows up while the app is in the foreground. Registered
 * once at app startup, before any permission/token work happens.
 */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      // Older expo-notifications typings only know this field; the two above
      // cover current SDKs. Harmless if ignored.
      shouldShowAlert: true,
    } as Notifications.NotificationBehavior),
  });

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    }).catch(() => undefined);
  }
}

async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null; // push tokens aren't issued to simulators/emulators

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== 'granted') return null;

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
 * Requests notification permission, fetches this device's Expo push token,
 * and registers it with the recommendation engine (POST /api/push-tokens).
 * Safe to call on every app open — skips the network call when the token
 * hasn't changed since the last successful sync. No-ops when the engine
 * isn't configured, since push delivery is entirely engine-owned.
 */
export async function syncPushToken(): Promise<void> {
  const { apiBaseUrl } = getRecommendationModeStatus();
  if (!apiBaseUrl) return;

  const token = await getExpoPushToken();
  if (!token) return;

  try {
    const lastSynced = await AsyncStorage.getItem(LAST_SYNCED_TOKEN_KEY);
    if (lastSynced === token) return;

    await callRecommendationApi('/api/push-tokens', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
    await AsyncStorage.setItem(LAST_SYNCED_TOKEN_KEY, token);
  } catch (err) {
    console.warn('Failed to sync push token:', err);
  }
}

export type NotificationTapPayload = {
  notificationIds?: string[];
  notificationId?: string;
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
