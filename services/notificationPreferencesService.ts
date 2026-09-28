import { supabase } from '@/services/supabase/client';

const TABLE = 'notification_preferences';

export type NotificationPreferences = {
  user_id: string;
  bookings: boolean;
  reminders: boolean;
  listings: boolean;
  announcements: boolean;
  push_enabled: boolean;
};

const DEFAULTS: Omit<NotificationPreferences, 'user_id'> = {
  bookings: true,
  reminders: true,
  listings: true,
  announcements: true,
  push_enabled: true,
};

/** Reads this user's preference row, creating the default row if it doesn't exist yet. */
export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const { data } = await supabase.from(TABLE).select('*').eq('user_id', userId).maybeSingle();
  if (data) return data as NotificationPreferences;

  const row = { user_id: userId, ...DEFAULTS };
  const { data: created } = await supabase.from(TABLE).insert(row).select().single();
  return (created as NotificationPreferences) || row;
}

export async function updateNotificationPreferences(
  userId: string,
  patch: Partial<Omit<NotificationPreferences, 'user_id'>>
): Promise<{ error: unknown }> {
  const { error } = await supabase
    .from(TABLE)
    .upsert({ user_id: userId, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  return { error };
}

export default { getNotificationPreferences, updateNotificationPreferences };
