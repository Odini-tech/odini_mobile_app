import { supabase } from '../../lib/supabase';

async function getCurrentUserId() {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data?.user?.id ?? null;
  } catch (_) {
    return null;
  }
}

const mapRatingToScore = rating => {
  const value = Math.max(1, Math.min(5, Math.round(Number(rating) || 0)));
  const lookup = { 1: -1, 2: 0, 3: 3, 4: 5, 5: 7 };
  return lookup[value] ?? 1;
};

const normalizeEventRow = row => {
  const event = Array.isArray(row.events) ? row.events[0] : row.events;
  return {
    ...row,
    event: event || null,
  };
};

async function resolveListingIdsFromTags(tags) {
  if (!Array.isArray(tags) || tags.length === 0) return null;

  const { data: tagRows, error: tagError } = await supabase
    .from('tags')
    .select('id, name')
    .or(tags.map(tag => `id.eq.${tag},name.ilike.${tag}`).join(','));

  if (tagError) throw tagError;

  const tagIds = (tagRows || []).map(t => t.id);
  if (tagIds.length === 0) return [];

  const { data: links, error: linkError } = await supabase
    .from('tag_listings')
    .select('listing_id')
    .in('tag_id', tagIds);

  if (linkError) throw linkError;

  return Array.from(new Set((links || []).map(link => link.listing_id)));
}

export async function fetchEvents({ limit = 50, offset = 0, tags = null, orderBy = 'created_at', eventType = null } = {}) {
  try {
    const listingIds = await resolveListingIdsFromTags(tags);
    if (Array.isArray(listingIds) && listingIds.length === 0) {
      return [];
    }

    let query = supabase
      .from('listings')
      .select('id, host_id, listing_type, title, description, is_active, price, created_at, events!inner(event_time, event_type, capacity, available_slots, location, end_time)')
      .eq('listing_type', 'event')
      .eq('is_active', true)
      .range(offset, offset + limit - 1)
      .order(orderBy, { ascending: false });

    if (eventType) {
      query = query.eq('events.event_type', eventType);
    }

    if (Array.isArray(listingIds)) {
      query = query.in('id', listingIds);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(normalizeEventRow);
  } catch (err) {
    console.error('fetchEvents error', err);
    throw err;
  }
}

export async function getEventById(eventId) {
  if (!eventId) throw new Error('eventId is required');

  try {
    const { data, error } = await supabase
      .from('listings')
      .select('id, host_id, listing_type, title, description, is_active, price, created_at, events!inner(event_time, event_type, capacity, available_slots, location, end_time)')
      .eq('id', eventId)
      .eq('listing_type', 'event')
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return normalizeEventRow(data);
  } catch (err) {
    console.error('getEventById error', err);
    throw err;
  }
}

function computePreferenceDelta(rating, weight = 1.0) {
  const center = 3.0;
  return (Number(rating) - center) * weight;
}

export async function updateUserPreferences(userId, tags = [], delta = 0) {
  if (!userId || !Array.isArray(tags) || tags.length === 0) {
    return true;
  }

  try {
    const score = mapRatingToScore(3 + delta);

    const { data: links } = await supabase
      .from('tag_listings')
      .select('listing_id, tags!inner(name)')
      .in('tags.name', tags);

    if (!links || links.length === 0) return true;

    const listingIds = Array.from(new Set(links.map(link => link.listing_id)));

    const rows = listingIds.map(listingId => ({
      user_id: userId,
      listing_id: listingId,
      score,
      last_action: JSON.stringify({ action: 'preference_update', tags, delta }),
    }));

    const { error } = await supabase.from('interactions').insert(rows);
    if (error) throw error;

    return true;
  } catch (err) {
    console.error('updateUserPreferences error', err);
    throw err;
  }
}

export async function addRating({ userId = null, eventId, rating, comment = null } = {}) {
  if (!eventId) throw new Error('eventId required');
  if (!rating) throw new Error('rating required');

  const uid = userId || (await getCurrentUserId());
  if (!uid) throw new Error('user not authenticated');

  try {
    const score = mapRatingToScore(rating);

    const { error } = await supabase
      .from('interactions')
      .insert({
        user_id: uid,
        listing_id: eventId,
        score,
        last_action: JSON.stringify({ action: 'event_rating', rating, comment }),
      });

    if (error) throw error;

    const { data: tagLinks } = await supabase
      .from('tag_listings')
      .select('tags!inner(name)')
      .eq('listing_id', eventId);

    const tags = (tagLinks || []).map(link => link.tags?.name).filter(Boolean);
    const delta = computePreferenceDelta(rating, 1.0);

    if (tags.length > 0) {
      await updateUserPreferences(uid, tags, delta);
    }

    return await getEventById(eventId);
  } catch (err) {
    console.error('addRating error', err);
    throw err;
  }
}

export async function addToTrip({ userId = null, eventId, tripId = null } = {}) {
  if (!eventId) throw new Error('eventId required');

  const uid = userId || (await getCurrentUserId());
  if (!uid) throw new Error('user not authenticated');

  try {
    const { data: eventListing, error: listingErr } = await supabase
      .from('listings')
      .select('id, host_id, listing_type, price')
      .eq('id', eventId)
      .eq('listing_type', 'event')
      .single();

    if (listingErr || !eventListing) {
      throw listingErr || new Error('Event listing not found');
    }

    const { error: insertErr } = await supabase
      .from('bookings')
      .insert({
        booking_ref: tripId || `EVT-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        host_id: eventListing.host_id,
        user_id: uid,
        listing_id: eventId,
        listing_type: 'event',
        guests: 1,
        price_at_booking: eventListing.price || 0,
        total_price: eventListing.price || 0,
        quantity: 1,
        reservation_time: new Date().toISOString(),
        status: 'pending',
        notes: tripId ? `Trip ${tripId}` : 'Added to trip',
      });

    if (insertErr) throw insertErr;

    return true;
  } catch (err) {
    console.error('addToTrip error', err);
    throw err;
  }
}

export async function getUserTripEvents(userId = null) {
  const uid = userId || (await getCurrentUserId());
  if (!uid) throw new Error('user not authenticated');

  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('listing:listings(id, host_id, listing_type, title, description, is_active, price, created_at, events!inner(event_time, event_type, capacity, available_slots, location, end_time))')
      .eq('user_id', uid)
      .eq('listing_type', 'event')
      .in('status', ['pending', 'confirmed', 'completed']);

    if (error) throw error;

    return (data || [])
      .map(row => row.listing)
      .filter(Boolean)
      .map(normalizeEventRow);
  } catch (err) {
    console.error('getUserTripEvents error', err);
    throw err;
  }
}

export async function getUserPreferences(userId = null) {
  const uid = userId || (await getCurrentUserId());
  if (!uid) throw new Error('user not authenticated');

  try {
    const { data: interactions, error } = await supabase
      .from('interactions')
      .select('listing_id, score')
      .eq('user_id', uid);

    if (error) throw error;

    if (!interactions || interactions.length === 0) return [];

    const listingIds = Array.from(new Set(interactions.map(i => i.listing_id)));
    const listingScoreMap = interactions.reduce((acc, row) => {
      acc[row.listing_id] = (acc[row.listing_id] || 0) + Number(row.score || 0);
      return acc;
    }, {});

    const { data: tagLinks } = await supabase
      .from('tag_listings')
      .select('listing_id, tags!inner(name)')
      .in('listing_id', listingIds);

    const tagScoreMap = {};
    (tagLinks || []).forEach(link => {
      const tagName = link.tags?.name;
      if (!tagName) return;
      tagScoreMap[tagName] = (tagScoreMap[tagName] || 0) + (listingScoreMap[link.listing_id] || 0);
    });

    return Object.entries(tagScoreMap)
      .map(([tag, score]) => ({ tag, score }))
      .sort((a, b) => b.score - a.score);
  } catch (err) {
    console.error('getUserPreferences error', err);
    throw err;
  }
}

export function subscribeToEvents(onChange) {
  try {
    const channel = supabase
      .channel('public:events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, payload => {
        if (onChange) onChange(payload);
      })
      .subscribe();

    return channel;
  } catch (err) {
    console.warn('subscribeToEvents not available or failed', err);
    return null;
  }
}

const eventService = {
  fetchEvents,
  getEventById,
  addRating,
  addToTrip,
  getUserTripEvents,
  getUserPreferences,
  updateUserPreferences,
  subscribeToEvents,
};

export default eventService;
