import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ensureNotificationPermission } from '@/services/notificationPermissionService';

// Mirrors the Expo Go guard used by pushNotificationService — local
// scheduling also lives in the native module that's unavailable there.
const isExpoGo = Constants.appOwnership === 'expo';
const Notifications: typeof import('expo-notifications') | null = isExpoGo
  ? null
  : require('expo-notifications');

const SCHEDULE_MAP_KEY = '@odini/scheduled_booking_reminders';
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

async function readScheduleMap(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(SCHEDULE_MAP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function writeScheduleMap(map: Record<string, string>): Promise<void> {
  await AsyncStorage.setItem(SCHEDULE_MAP_KEY, JSON.stringify(map));
}

export type BookingReminderInput = {
  bookingId: string;
  listingTitle: string;
  /** ISO datetime the booking is "for" — check_in, event_slot, or reservation_time. */
  eventDateIso: string | null;
};

/**
 * Schedules a single local reminder for an upcoming booking: 24h ahead when
 * there's enough runway, otherwise 2h ahead, otherwise skipped entirely (the
 * moment has already passed or is too close to bother). Device-generated —
 * no backend involved. Safe to call multiple times for the same booking; it
 * replaces any previously scheduled reminder for that id.
 */
export async function scheduleBookingReminder({ bookingId, listingTitle, eventDateIso }: BookingReminderInput): Promise<void> {
  if (!Notifications || !eventDateIso) return;

  const permission = await ensureNotificationPermission();
  if (permission !== 'granted') return;

  const eventTime = new Date(eventDateIso).getTime();
  if (Number.isNaN(eventTime)) return;

  const now = Date.now();
  let fireAt = eventTime - DAY_MS;
  if (fireAt <= now) fireAt = eventTime - HOUR_MS * 2;
  if (fireAt <= now) return; // too close / already happened — nothing useful to schedule

  await cancelBookingReminder(bookingId);

  const timeLabel = new Date(eventTime).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Upcoming booking',
      body: `Your booking at ${listingTitle} starts ${new Date(eventTime).toLocaleDateString(undefined, { weekday: 'long' })} at ${timeLabel}.`,
      data: { bookingId },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(fireAt) },
  });

  const map = await readScheduleMap();
  map[bookingId] = id;
  await writeScheduleMap(map);
}

/** Cancels a previously scheduled reminder for this booking, if any. */
export async function cancelBookingReminder(bookingId: string): Promise<void> {
  if (!Notifications) return;
  const map = await readScheduleMap();
  const id = map[bookingId];
  if (!id) return;

  await Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
  delete map[bookingId];
  await writeScheduleMap(map);
}

export default { scheduleBookingReminder, cancelBookingReminder };
