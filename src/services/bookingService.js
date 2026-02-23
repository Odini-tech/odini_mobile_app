import { supabase } from '../../lib/supabase';

/**
 * Booking service to create and manage bookings for stays, events, and offerings.
 * Functions return an object: { data, error }
 */

const BOOKINGS_TABLE = 'bookings';

const validatePayload = ({ listingType, payload }) => {
  const validTypes = ['stay', 'event', 'offering'];
  
  if (!listingType) {
    return 'Missing listingType';
  }
  
  const normalizedType = String(listingType).toLowerCase().trim();
  if (!validTypes.includes(normalizedType)) {
    return `Invalid listingType: "${listingType}". Must be one of: ${validTypes.join(', ')}`;
  }

  if (normalizedType === 'stay') {
    if (!payload.check_in || !payload.check_out) return 'check_in and check_out required for stay bookings';
    if (!payload.guests) return 'guests required for stay bookings';
  }

  if (normalizedType === 'event') {
    if (!payload.event_slot && !payload.reservation_time) return 'event_slot or reservation_time required for event bookings';
    if (!payload.quantity) return 'quantity required for event bookings';
  }

  if (normalizedType === 'offering') {
    if (!payload.reservation_time) return 'reservation_time required for offering bookings';
    if (!payload.quantity) return 'quantity required for offering bookings';
  }

  return null;
};

export async function createBooking({ userId, listingId, listingType, priceAtBooking, payload = {} }) {
  // ensure listingType is normalized and present; if not provided, try to fetch from listings table
  let normalizedType = listingType ? String(listingType).toLowerCase().trim() : null;
  
  if (!normalizedType || !['stay', 'event', 'offering'].includes(normalizedType)) {
    try {
      const { data: listingData, error: listingErr } = await supabase.from('listings').select('listing_type').eq('id', listingId).single();
      if (listingErr) return { data: null, error: listingErr };
      normalizedType = listingData?.listing_type ? String(listingData.listing_type).toLowerCase().trim() : null;
      
      // Final validation after fetching
      if (!normalizedType || !['stay', 'event', 'offering'].includes(normalizedType)) {
        return { data: null, error: { message: 'Invalid listing type from database' } };
      }
    } catch (e) {
      return { data: null, error: { message: 'Failed to determine listing type' } };
    }
  }

  const validationError = validatePayload({ listingType: normalizedType, payload });
  if (validationError) return { data: null, error: { message: validationError } };

  const row = {
    listing_id: listingId,
    user_id: userId,
    listing_type: normalizedType,
    price_at_booking: priceAtBooking,
    status: payload.status || 'pending',
    guests: payload.guests || null,
    quantity: payload.quantity || null,
    check_in: payload.check_in || null,
    check_out: payload.check_out || null,
    event_slot: payload.event_slot ? new Date(payload.event_slot).toISOString() : null,
    reservation_time: payload.reservation_time ? new Date(payload.reservation_time).toISOString() : null,
  };

  try {
    const { data, error } = await supabase.from(BOOKINGS_TABLE).insert(row).select().single();
    return { data, error };
  } catch (e) {
    return { data: null, error: e };
  }
}

export async function getBookingById(bookingId) {
  const { data, error } = await supabase.from(BOOKINGS_TABLE).select('*').eq('id', bookingId).single();
  return { data, error };
}

export async function listBookingsByUser(userId, { limit = 50, offset = 0 } = {}) {
  const { data, error } = await supabase
    .from(BOOKINGS_TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  return { data, error };
}

export async function updateBookingStatus(bookingId, status) {
  if (!['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
    return { data: null, error: { message: 'Invalid status' } };
  }
  const { data, error } = await supabase.from(BOOKINGS_TABLE).update({ status }).eq('id', bookingId).select().single();
  return { data, error };
}

export async function cancelBooking(bookingId, userId) {
  // Only allow cancelling if booking belongs to user or additional checks happen server-side
  const { data: existing, error: getErr } = await supabase.from(BOOKINGS_TABLE).select('user_id, status').eq('id', bookingId).single();
  if (getErr) return { data: null, error: getErr };
  if (existing.user_id !== userId) return { data: null, error: { message: 'Not authorized to cancel this booking' } };
  if (existing.status === 'cancelled') return { data: null, error: { message: 'Booking already cancelled' } };

  return updateBookingStatus(bookingId, 'cancelled');
}

export async function confirmBooking(bookingId) {
  return updateBookingStatus(bookingId, 'confirmed');
}

export async function completeBooking(bookingId) {
  return updateBookingStatus(bookingId, 'completed');
}

export default {
  createBooking,
  getBookingById,
  listBookingsByUser,
  updateBookingStatus,
  cancelBooking,
  confirmBooking,
  completeBooking,
};
