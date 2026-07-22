import { supabase } from '../../lib/supabase';
import { fetchImagesForListings } from '../../services/listings.service';
import { callRecommendationApi, runDualMode } from './recommendationGateway';

/**
 * Booking service to create and manage bookings for stays, events, and offerings.
 * Functions return an object: { data, error }
 */

const BOOKINGS_TABLE = 'bookings';
const VALID_LISTING_TYPES = ['stay', 'event', 'offering'];
const VALID_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled_by_user', 'cancelled_by_host', 'rejected'];
// Pending bookings already hold a claim on the slot until a host rejects/cancels them,
// so they must count toward capacity — otherwise two users could both get approved for the same room/ticket.
const ACTIVE_STATUSES = ['pending', 'confirmed'];

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
  if (!payload.guest_email) {
    return 'Guest email is required to complete booking';
  }
  return null;
};

const sumField = (rows, field) => (rows || []).reduce((total, row) => total + (Number(row[field]) || 0), 0);

export async function checkStayAvailability({ listingId, checkIn, checkOut, guests, rooms }) {
  const { data: stay, error: stayErr } = await supabase
    .from('stays')
    .select('max_guests, available_rooms')
    .eq('listing_id', listingId)
    .maybeSingle();
  if (stayErr) return { ok: false, remaining: 0, error: { message: 'Unable to check room availability' } };

  const requestedGuests = Number(guests) || 1;
  const requestedRooms = Number(rooms) || 1;

  // max_guests is a per-room occupancy cap, so the effective cap for a multi-room
  // request scales with how many rooms are being requested (e.g. 2/room x 10 rooms = 20).
  const guestCap = stay?.max_guests ? stay.max_guests * Math.max(1, requestedRooms) : null;
  if (guestCap && requestedGuests > guestCap) {
    return { ok: false, remaining: guestCap, error: { message: `This stay allows a maximum of ${stay.max_guests} guests per room (${guestCap} for ${requestedRooms} room${requestedRooms === 1 ? '' : 's'})` } };
  }
  if (stay?.available_rooms == null) return { ok: true, remaining: Infinity, error: null };

  const { data: overlapping, error: bookingsErr } = await supabase
    .from(BOOKINGS_TABLE)
    .select('quantity')
    .eq('listing_id', listingId)
    .eq('listing_type', 'stay')
    .in('status', ACTIVE_STATUSES)
    .lt('check_in', checkOut)
    .gt('check_out', checkIn);
  if (bookingsErr) return { ok: false, remaining: 0, error: { message: 'Unable to check room availability' } };

  const roomsTaken = sumField(overlapping, 'quantity');
  const remaining = stay.available_rooms - roomsTaken;
  if (requestedRooms > remaining) {
    return { ok: false, remaining: Math.max(0, remaining), error: { message: remaining > 0 ? `Only ${remaining} room${remaining === 1 ? '' : 's'} left for these dates` : 'No rooms left for these dates' } };
  }
  return { ok: true, remaining, error: null };
}

export async function checkEventAvailability({ listingId, quantity }) {
  const { data: event, error: eventErr } = await supabase
    .from('events')
    .select('capacity, available_slots')
    .eq('listing_id', listingId)
    .maybeSingle();
  if (eventErr) return { ok: false, remaining: 0, error: { message: 'Unable to check ticket availability' } };

  const capacity = event?.available_slots ?? event?.capacity;
  if (capacity == null) return { ok: true, remaining: Infinity, error: null };

  const { data: active, error: bookingsErr } = await supabase
    .from(BOOKINGS_TABLE)
    .select('quantity')
    .eq('listing_id', listingId)
    .eq('listing_type', 'event')
    .in('status', ACTIVE_STATUSES);
  if (bookingsErr) return { ok: false, remaining: 0, error: { message: 'Unable to check ticket availability' } };

  const ticketsTaken = sumField(active, 'quantity');
  const remaining = capacity - ticketsTaken;
  const requestedQuantity = Number(quantity) || 1;
  if (requestedQuantity > remaining) {
    return { ok: false, remaining: Math.max(0, remaining), error: { message: remaining > 0 ? `Only ${remaining} ticket${remaining === 1 ? '' : 's'} left` : 'This event is sold out' } };
  }
  return { ok: true, remaining, error: null };
}

export async function checkOfferingAvailability({ listingId, quantity, reservationTime }) {
  const { data: offering, error: offeringErr } = await supabase
    .from('offering')
    .select('max_bookings')
    .eq('listing_id', listingId)
    .maybeSingle();
  if (offeringErr) return { ok: false, remaining: 0, error: { message: 'Unable to check availability' } };
  if (offering?.max_bookings == null) return { ok: true, remaining: Infinity, error: null };
  if (!reservationTime) return { ok: true, remaining: offering.max_bookings, error: null };

  const { data: active, error: bookingsErr } = await supabase
    .from(BOOKINGS_TABLE)
    .select('quantity')
    .eq('listing_id', listingId)
    .eq('listing_type', 'offering')
    .eq('reservation_time', new Date(reservationTime).toISOString())
    .in('status', ACTIVE_STATUSES);
  if (bookingsErr) return { ok: false, remaining: 0, error: { message: 'Unable to check availability' } };

  const slotsTaken = sumField(active, 'quantity');
  const remaining = offering.max_bookings - slotsTaken;
  const requestedQuantity = Number(quantity) || 1;
  if (requestedQuantity > remaining) {
    return { ok: false, remaining: Math.max(0, remaining), error: { message: remaining > 0 ? `Only ${remaining} slot${remaining === 1 ? '' : 's'} left at this time` : 'This time slot is fully booked' } };
  }
  return { ok: true, remaining, error: null };
}

export async function checkAvailability({ listingType, listingId, ...params }) {
  const normalizedType = normalizeListingType(listingType);
  if (normalizedType === 'stay') return checkStayAvailability({ listingId, ...params });
  if (normalizedType === 'event') return checkEventAvailability({ listingId, ...params });
  if (normalizedType === 'offering') return checkOfferingAvailability({ listingId, ...params });
  return { ok: true, remaining: Infinity, error: null };
}

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

  const availability = await checkAvailability({
    listingType: normalizedType,
    listingId,
    checkIn: mergedPayload.check_in,
    checkOut: mergedPayload.check_out,
    guests: mergedPayload.guests,
    rooms: mergedPayload.quantity,
    quantity: mergedPayload.quantity,
    reservationTime: mergedPayload.reservation_time,
  });
  if (!availability.ok) return { data: null, error: availability.error || { message: 'Not enough availability for this request' } };

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
    // nights is GENERATED ALWAYS AS in the DB — omit it; Postgres computes from check_in/check_out
    // DB check constraint requires event_slot IS NOT NULL for event bookings —
    // fall back to reservation_time or now when the event has no specific slot set
    event_slot: normalizedType === 'event'
      ? new Date(mergedPayload.event_slot || mergedPayload.reservation_time || new Date()).toISOString()
      : (mergedPayload.event_slot ? new Date(mergedPayload.event_slot).toISOString() : null),
    quantity: mergedPayload.quantity || null,
    reservation_time: mergedPayload.reservation_time ? new Date(mergedPayload.reservation_time).toISOString() : null,
    status: mergedPayload.status || 'pending',
  });

  try {
    const { data, error } = await supabase.from(BOOKINGS_TABLE).insert(row).select().single();
    if (!error && data) {
      // Fire-and-forget interaction tracking — never block or fail the booking
      runDualMode({
        context: 'bookingService.createBooking',
        fallbackToBasicOnError: false,
        recEng: async () => {
          await callRecommendationApi('/v1/listings/interactions', {
            method: 'POST',
            body: JSON.stringify({
              userId,
              listingId,
              interactionType: 'book',
              score: 7,
              metadata: { bookingId: data.id, listingType: normalizedType },
            }),
          });
        },
        basic: async () => {
          await supabase.from('interactions').insert({
            user_id: userId,
            listing_id: listingId,
            score: 7,
            last_action: JSON.stringify({ action: 'book', metadata: { bookingId: data.id } }),
          });
        },
      }).catch(() => undefined);
    }
    return { data, error };
  } catch (e) {
    return { data: null, error: e };
  }
}

export async function getBookingById(bookingId) {
  const { data, error } = await supabase.from(BOOKINGS_TABLE).select('*').eq('id', bookingId).single();
  return { data, error };
}

/**
 * Whether this user has any prior (non-cancelled/rejected) booking for this listing —
 * used to swap "Book" copy for "Book Again" once they've requested it before.
 */
export async function hasUserBookedListing(userId, listingId) {
  if (!userId || !listingId) return false;
  const { count, error } = await supabase
    .from(BOOKINGS_TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('listing_id', listingId)
    .not('status', 'in', '(cancelled_by_user,cancelled_by_host,rejected)');
  if (error) return false;
  return (count || 0) > 0;
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

export async function listBookingsByUserWithListing(userId, { limit = 100 } = {}) {
  const { data, error } = await supabase
    .from(BOOKINGS_TABLE)
    .select(
      'id, booking_ref, listing_type, status, guests, quantity, check_in, check_out, event_slot, reservation_time, total_price, price_at_booking, created_at, cancelled_by, cancellation_note, listings!listing_id(id, title, listing_type, price)'
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return { data, error };

  // listings has no image_url column — images live in stay_images/event_images/offering_images
  const imageMap = await fetchImagesForListings(data.map((b) => b.listings).filter(Boolean));
  const enriched = data.map((b) => ({
    ...b,
    listings: b.listings ? { ...b.listings, image_url: imageMap.get(b.listings.id) || null } : null,
  }));

  return { data: enriched, error: null };
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
  hasUserBookedListing,
  listBookingsByUser,
  listBookingsByUserWithListing,
  checkAvailability,
  checkStayAvailability,
  checkEventAvailability,
  checkOfferingAvailability,
  updateBookingStatus,
  cancelBooking,
  confirmBooking,
  completeBooking,
};
