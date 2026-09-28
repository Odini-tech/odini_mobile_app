import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking } from 'react-native';

export type NotificationPermissionState = 'granted' | 'denied' | 'undetermined' | 'unavailable';

const DECLINED_KEY = '@odini/notification_permission_declined';

// Android push support is pulled from Expo Go on SDK 53+, so importing
// expo-notifications there throws — mirrors the guard in pushNotificationService.
const isExpoGo = Constants.appOwnership === 'expo';
const Notifications: typeof import('expo-notifications') | null = isExpoGo
  ? null
  : require('expo-notifications');

/** Current OS permission state, without prompting. */
export async function getNotificationPermissionState(): Promise<NotificationPermissionState> {
  if (!Notifications) return 'unavailable';
  try {
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();
    if (status === 'granted') return 'granted';
    if (status === 'denied' && !canAskAgain) return 'denied';
    return 'undetermined';
  } catch {
    return 'unavailable';
  }
}

/**
 * Requests notification permission at most once per install unless the user
 * later grants it via system settings. Never re-prompts after a decline —
 * callers that need the user to reconsider should point them at
 * openSystemNotificationSettings() instead.
 */
export async function ensureNotificationPermission(): Promise<NotificationPermissionState> {
  if (!Notifications) return 'unavailable';

  const alreadyDeclined = await AsyncStorage.getItem(DECLINED_KEY);
  const current = await getNotificationPermissionState();
  if (current === 'granted') return 'granted';
  if (current === 'denied' || alreadyDeclined === 'true') return 'denied';

  try {
    const { status, canAskAgain } = await Notifications.requestPermissionsAsync();
    if (status === 'granted') {
      await AsyncStorage.removeItem(DECLINED_KEY);
      return 'granted';
    }
    await AsyncStorage.setItem(DECLINED_KEY, 'true');
    return canAskAgain ? 'undetermined' : 'denied';
  } catch {
    return 'unavailable';
  }
}

/** Deep-links to the OS notification settings screen for this app. */
export function openSystemNotificationSettings(): void {
  Linking.openSettings().catch(() => undefined);
}

export default {
  getNotificationPermissionState,
  ensureNotificationPermission,
  openSystemNotificationSettings,
};
