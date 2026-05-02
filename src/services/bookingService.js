import { supabase } from '../../lib/supabase';

/**
 * Booking service to create and manage bookings for stays, events, and offerings.
 * Functions return an object: { data, error }
 */

const BOOKINGS_TABLE = 'bookings';
const VALID_LISTING_TYPES = ['stay', 'event', 'offering'];
const VALID_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled_by_user', 'cancelled_by_host', 'rejected'];

const generateBookingRef = () => `BK-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const normalizeListingType = value => (value ? String(value).toLowerCase().trim() : null);

const pickDefined = row =>
  Object.fromEntries(
    Object.entries(row).filter(([, value]) => value !== undefined)
  );

async function resolveGuestInfo(userId, payload = {}) {
  const guest = {
    firstname: payload.guest_firstname || null,
    lastname: payload.guest_lastname || null,
    email: payload.guest_email || null,
    phone: payload.guest_phone || null,
  };

  try {
    if (!guest.firstname || !guest.lastname || !guest.phone) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('firstname, lastname, phone_number')
        .eq('id', userId)
        .maybeSingle();

      if (profile) {
        guest.firstname = guest.firstname || profile.firstname || null;
        guest.lastname = guest.lastname || profile.lastname || null;
        guest.phone = guest.phone || profile.phone_number || null;
      }
    }
  } catch (_) {
    // best-effort enrichment
  }

  try {
    if (!guest.email) {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user?.id === userId) {
        guest.email = authData.user.email || null;
      }
    }
  } catch (_) {
    // best-effort enrichment
  }

  return guest;
}

const validatePayload = ({ listingType, payload }) => {
  if (!listingType)  {
    return 'Missing listingType';
  }
  const normalizedType = normalizeListingType(listingType);
  if (!VALID_LISTING_TYPES.includes(normalizedType)) {
    return `Invalid listingType: "${listingType}". Must be one of: ${VALID_LISTING_TYPES.join(', ')}`;
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
  if (!payload.guest_firstname || !payload.guest_lastname || !payload.guest_email) {
    return 'Guest firstname, lastname, and email are required';
  }
  return null;
};

export async function createBooking({ userId, hostId, listingId, listingType, priceAtBooking, totalPrice, payload = {} }) {
  let normalizedType = normalizeListingType(listingType);
  if (!normalizedType || !VALID_LISTING_TYPES.includes(normalizedType) || !hostId) {
    try {
      const { data: listingData, error: listingErr } = await supabase.from('listings').select('listing_type, host_id').eq('id', listingId).single();
      if (listingErr) return { data: null, error: listingErr };
      if (!normalizedType || !VALID_LISTING_TYPES.includes(normalizedType)) {
        normalizedType = normalizeListingType(listingData?.listing_type);
      }
      hostId = hostId || listingData?.host_id;
      if (!normalizedType || !VALID_LISTING_TYPES.includes(normalizedType)) {
        return { data: null, error: { message: 'Invalid listing type from database' } };
      }
      if (!hostId) {
        return { data: null, error: { message: 'Host not found for listing' } };
      }
    } catch (e) {
      return { data: null, error: { message: 'Failed to determine listing type' } };
    }
  }

  const guest = await resolveGuestInfo(userId, payload);
  const mergedPayload = {
    ...payload,
    guest_firstname: guest.firstname,
    guest_lastname: guest.lastname,
    guest_email: guest.email,
    guest_phone: guest.phone,
  };

  const validationError = validatePayload({ listingType: normalizedType, payload: mergedPayload });
  if (validationError) return { data: null, error: { message: validationError } };

  const row = pickDefined({
    booking_ref: mergedPayload.booking_ref || generateBookingRef(),
    host_id: hostId,
    listing_id: listingId,
    user_id: userId,
    listing_type: normalizedType,
    guest_firstname: mergedPayload.guest_firstname,
    guest_lastname: mergedPayload.guest_lastname,
    guest_email: mergedPayload.guest_email,
    guest_phone: mergedPayload.guest_phone || null,
    guests: mergedPayload.guests || 1,
    price_at_booking: priceAtBooking,
    total_price: totalPrice || null,
    booking_date: mergedPayload.booking_date,
    notes: mergedPayload.notes || null,
    check_in: mergedPayload.check_in || null,
    check_out: mergedPayload.check_out || null,
    nights: mergedPayload.nights || null,
    event_slot: mergedPayload.event_slot ? new Date(mergedPayload.event_slot).toISOString() : null,
    quantity: mergedPayload.quantity || null,
    reservation_time: mergedPayload.reservation_time ? new Date(mergedPayload.reservation_time).toISOString() : null,
    status: mergedPayload.status || 'pending',
  });

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

export async function updateBookingStatus(bookingId, status, options = {}) {
  if (!VALID_STATUSES.includes(status)) {
    return { data: null, error: { message: 'Invalid status' } };
  }
  const updateFields = { status };
  if (status.startsWith('cancelled_by')) {
    updateFields.cancelled_by = options.cancelled_by || (status === 'cancelled_by_user' ? 'user' : 'host');
    updateFields.cancellation_note = options.cancellation_note || null;
    updateFields.cancelled_at = new Date().toISOString();
  }
  if (options.updated_at) updateFields.updated_at = options.updated_at;
  const { data, error } = await supabase.from(BOOKINGS_TABLE).update(updateFields).eq('id', bookingId).select().single();
  return { data, error };
}

export async function cancelBooking(bookingId, userId, cancellation_note = null) {
  // Only allow cancelling if booking belongs to user or additional checks happen server-side
  const { data: existing, error: getErr } = await supabase.from(BOOKINGS_TABLE).select('user_id, status').eq('id', bookingId).single();
  if (getErr) return { data: null, error: getErr };
  if (existing.user_id !== userId) return { data: null, error: { message: 'Not authorized to cancel this booking' } };
  if (existing.status && existing.status.startsWith('cancelled_by')) return { data: null, error: { message: 'Booking already cancelled' } };
  return updateBookingStatus(bookingId, 'cancelled_by_user', { cancelled_by: 'user', cancellation_note });
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
