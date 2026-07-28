import { supabase } from '../../lib/supabase';
import { getListingsByIds, getShuffledListingIds } from '../../services/listings.service';

const TABLE = 'notifications';

export async function listNotifications(userId, { limit = 50 } = {}) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return { data: data || [], error };
}

export async function markAsRead(notificationId) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ is_read: true })
    .eq('id', notificationId)
    .select()
    .single();
  return { data, error };
}

export async function getUnreadCount(userId) {
  const { count, error } = await supabase
    .from(TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  return { count: count || 0, error };
}

/**
 * Subscribes to any change (new notification, marked read, etc.) on this
 * user's notifications so the caller can re-derive things like an unread
 * badge count. Returns the channel so the caller can supabase.removeChannel
 * it on unmount.
 */
export function subscribeToNotificationChanges(userId, onChange) {
  const channel = supabase
    .channel(`notifications-changes:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLE, filter: `user_id=eq.${userId}` },
      () => onChange?.()
    )
    .subscribe();
  return channel;
}

/**
 * Subscribes to new notifications for a user via Supabase Realtime.
 * Returns the channel so the caller can supabase.removeChannel(channel) on unmount.
 */
export function subscribeToNotifications(userId, onInsert) {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: TABLE, filter: `user_id=eq.${userId}` },
      (payload) => onInsert?.(payload.new)
    )
    .subscribe();
  return channel;
}

/**
 * Control mechanism: seeds 2 random active listings as `listing_match` notifications
 * once per calendar day per user, so the notifications feed has content flowing daily
 * even without a live recommendation-push pipeline behind it. Safe to call on every
 * app open — it no-ops if today's pair has already been created.
 */
export async function ensureDailyListingMatchNotifications(userId) {
  if (!userId) return;

  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { data: existing, error: existingErr } = await supabase
      .from(TABLE)
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'listing_match')
      .gte('created_at', startOfDay.toISOString())
      .limit(1);

    if (existingErr || (existing && existing.length > 0)) return;

    const shuffledIds = await getShuffledListingIds();
    if (!shuffledIds.length) return;

    const listings = await getListingsByIds(shuffledIds.slice(0, 2));
    if (!listings.length) return;

    const rows = listings.map((listing) => ({
      user_id: userId,
      type: 'listing_match',
      title: `New for you: ${listing.title}`,
      body: listing.description
        ? listing.description.slice(0, 120)
        : 'A listing you might like just went live.',
      data: { listing_id: listing.id },
    }));

    await supabase.from(TABLE).insert(rows);
  } catch (err) {
    console.error('Failed to seed daily listing notifications:', err);
  }
}

export default {
  listNotifications,
  markAsRead,
  getUnreadCount,
  subscribeToNotifications,
  subscribeToNotificationChanges,
  ensureDailyListingMatchNotifications,
};
