import { supabase } from "../lib/supabase";

/**
 * Takes an array of ListingCard objects returned by the recommendation engine
 * and enriches them with full Supabase data (profiles, images, type-specific details).
 * Preserves score/explanation metadata from the rec engine.
 */
export async function enrichRecommendationListings(recListings = []) {
  if (!recListings?.length) return [];

  const ids = recListings.map((l) => l.id).filter(Boolean);
  if (!ids.length) return [];

  try {
    const { data, error } = await supabase
      .from("listings")
      .select(`
        id,
        host_id,
        listing_type,
        title,
        description,
        is_active,
        created_at,
        price,
        profiles:host_id(username, firstname, lastname, location),
        stays(durations_nights, max_guests, available_rooms),
        events(event_time, event_type, capacity),
        offering(service_type, opening_hours, duration_minutes, max_bookings)
      `)
      .in("id", ids)
      .eq("is_active", true);

    if (error || !data) return [];

    const imageMap = await fetchImagesForListings(data);

    const enriched = data.map((listing) => {
      const recMeta = recListings.find((r) => r.id === listing.id);
      return {
        ...listing,
        image_url: imageMap.get(listing.id) || null,
        rec_score: recMeta?.score ?? null,
        rec_reason: recMeta?.explanation ?? null,
      };
    });

    const orderMap = new Map(ids.map((id, i) => [id, i]));
    return enriched.sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999));
  } catch (err) {
    console.error("Error enriching recommendation listings:", err);
    return [];
  }
}

/**
 * Returns a shuffled array of all active listing IDs.
 * Used for random-order pagination — fetch IDs once, shuffle, then page through with getListingsByIds.
 */
export async function getShuffledListingIds(listingType = null) {
  try {
    let query = supabase.from('listings').select('id').eq('is_active', true);
    if (listingType) query = query.eq('listing_type', listingType);
    const { data, error } = await query;
    if (error) throw error;
    const ids = (data || []).map((r) => r.id);
    // Fisher-Yates shuffle
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    return ids;
  } catch (error) {
    console.error('Error fetching listing IDs:', error);
    throw error;
  }
}

/**
 * Fetch full listing data for a specific set of IDs, preserving the given order.
 */
export async function getListingsByIds(ids = []) {
  if (!ids.length) return [];
  try {
    const { data, error } = await supabase
      .from('listings')
      .select(`
        id,
        host_id,
        listing_type,
        title,
        description,
        is_active,
        created_at,
        price,
        profiles:host_id(username, firstname, lastname, location),
        stays(durations_nights, max_guests, available_rooms),
        events(event_time, event_type, capacity),
        offering(service_type, opening_hours, duration_minutes, max_bookings)
      `)
      .in('id', ids)
      .eq('is_active', true);

    if (error) throw error;
    if (!data?.length) return [];

    const imageMap = await fetchImagesForListings(data);

    const enriched = data.map((listing) => ({
      ...listing,
      image_url: imageMap.get(listing.id) || null,
    }));

    const orderMap = new Map(ids.map((id, i) => [id, i]));
    return enriched.sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999));
  } catch (error) {
    console.error('Error fetching listings by IDs:', error);
    throw error;
  }
}

/**
 * Get all listings with their specific details and images
 * @param {string} listingType - Optional filter: 'stay', 'event', or 'offering'
 * @returns {Promise<Array>} Array of enriched listing objects
 */
export async function getListings(listingType = null) {
  try {
    let query = supabase
      .from("listings")
      .select(`
        id,
        host_id,
        listing_type,
        title,
        description,
        is_active,
        created_at,
        profiles:host_id(username, firstname, lastname, location),
        stays(durations_nights, max_guests, available_rooms),
        events(event_time, event_type, capacity),
        offering(service_type, opening_hours, duration_minutes, max_bookings),
        price
      `)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (listingType) {
      query = query.eq("listing_type", listingType);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Enrich listings with images
    const enrichedListings = await Promise.all(
      data.map(async (listing) => {
        const imageTable = getImageTableName(listing.listing_type);
        const { data: images } = await supabase
          .from(imageTable)
          .select("image_url")
          .eq("listing_id", listing.id)
          .limit(1);

        return {
          ...listing,
          image_url: images?.[0]?.image_url || null,
        };
      })
    );

    return enrichedListings;
  } catch (error) {
    console.error("Error fetching listings:", error);
    throw error;
  }
}

/**
 * Get specific listing details with all related data
 */
export async function getListingById(listingId) {
  try {
    const { data, error } = await supabase
      .from("listings")
      .select(`
        id,
        host_id,
        listing_type,
        title,
        description,
        is_active,
        created_at,
        profiles:host_id(username, firstname, lastname, location),
        stays(durations_nights, max_guests, available_rooms),
        events(event_time, event_type, capacity),
        offering(service_type, opening_hours, duration_minutes, max_bookings),
        price
      `)
      .eq("id", listingId)
      .single();

    if (error) throw error;

    // Get all images
    const imageTable = getImageTableName(data.listing_type);
    const { data: images } = await supabase
      .from(imageTable)
      .select("image_url")
      .eq("listing_id", listingId);

    return {
      ...data,
      images: images?.map((img) => img.image_url) || [],
    };
  } catch (error) {
    console.error("Error fetching listing:", error);
    throw error;
  }
}

/**
 * Add listing to favorites
 */
export async function addToFavorites(userId, listingId) {
  try {
    const { error } = await supabase
      .from("favorites")
      .insert({
        user_id: userId,
        listing_id: listingId,
      });

    if (error) throw error;
  } catch (error) {
    console.error("Error adding to favorites:", error);
    throw error;
  }
}

/**
 * Remove listing from favorites
 */
export async function removeFromFavorites(userId, listingId) {
  try {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", userId)
      .eq("listing_id", listingId);

    if (error) throw error;
  } catch (error) {
    console.error("Error removing from favorites:", error);
    throw error;
  }
}

/**
 * Check if listing is favorited by user
 */
export async function isFavorited(userId, listingId) {
  try {
    const { data, error } = await supabase
      .from("favorites")
      .select("id")
      .eq("user_id", userId)
      .eq("listing_id", listingId)
      .single();

    if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows found
    return !!data;
  } catch (error) {
    console.error("Error checking favorites:", error);
    return false;
  }
}

/**
 * Get listings the user has favorited (interactions with score >= 5)
 */
export async function getUserFavoriteListings(userId) {
  try {
    const { data: interactions, error: intErr } = await supabase
      .from('interactions')
      .select('listing_id, score, updated_at')
      .eq('user_id', userId)
      .gte('score', 5)
      .order('updated_at', { ascending: false })
      .limit(20);

    if (intErr || !interactions?.length) return [];

    const listingIds = [...new Set(interactions.map((i) => i.listing_id))];

    const { data, error } = await supabase
      .from('listings')
      .select(`
        id, host_id, listing_type, title, description, is_active, created_at, price,
        profiles:host_id(username, firstname, lastname, location),
        stays(durations_nights, max_guests, available_rooms),
        events(event_time, event_type, capacity),
        offering(service_type, opening_hours, duration_minutes, max_bookings)
      `)
      .in('id', listingIds)
      .eq('is_active', true);

    if (error || !data) return [];

    const enriched = await Promise.all(
      data.map(async (listing) => {
        const imageTable = getImageTableName(listing.listing_type);
        const { data: images } = await supabase
          .from(imageTable)
          .select('image_url')
          .eq('listing_id', listing.id)
          .limit(1);
        return { ...listing, image_url: images?.[0]?.image_url || null, is_favorited: true };
      })
    );

    return enriched;
  } catch (error) {
    console.error('Error fetching favorite listings:', error);
    return [];
  }
}

/**
 * Get listings the user has recently viewed (click/view interactions)
 */
export async function getUserRecentlyViewedListings(userId, limit = 8) {
  try {
    const { data: interactions, error: intErr } = await supabase
      .from('interactions')
      .select('listing_id, last_action, updated_at')
      .eq('user_id', userId)
      .in('score', [1, 3])
      .order('updated_at', { ascending: false })
      .limit(limit * 2);

    if (intErr || !interactions?.length) return [];

    const seen = new Set();
    const uniqueIds = [];
    for (const i of interactions) {
      if (!seen.has(i.listing_id)) {
        seen.add(i.listing_id);
        uniqueIds.push(i.listing_id);
        if (uniqueIds.length >= limit) break;
      }
    }

    if (!uniqueIds.length) return [];

    const { data, error } = await supabase
      .from('listings')
      .select(`
        id, host_id, listing_type, title, description, is_active, created_at, price,
        profiles:host_id(username, firstname, lastname, location),
        stays(durations_nights, max_guests, available_rooms),
        events(event_time, event_type, capacity),
        offering(service_type, opening_hours, duration_minutes, max_bookings)
      `)
      .in('id', uniqueIds)
      .eq('is_active', true);

    if (error || !data) return [];

    const enriched = await Promise.all(
      data.map(async (listing) => {
        const imageTable = getImageTableName(listing.listing_type);
        const { data: images } = await supabase
          .from(imageTable)
          .select('image_url')
          .eq('listing_id', listing.id)
          .limit(1);
        return { ...listing, image_url: images?.[0]?.image_url || null };
      })
    );

    return enriched;
  } catch (error) {
    console.error('Error fetching recently viewed listings:', error);
    return [];
  }
}

/**
 * Get listing IDs that the user has hidden
 */
export async function getUserHiddenListingIds(userId) {
  try {
    const { data, error } = await supabase
      .from('interactions')
      .select('listing_id, last_action')
      .eq('user_id', userId)
      .eq('score', -1);

    if (error || !data) return new Set();

    const hidden = data
      .filter((i) => {
        try {
          const action = JSON.parse(i.last_action || '{}');
          return action.action === 'hide';
        } catch (_) {
          return false;
        }
      })
      .map((i) => i.listing_id);

    return new Set(hidden);
  } catch (_) {
    return new Set();
  }
}

/**
 * Fetches the first image for each listing in a batch using at most 3 parallel queries
 * (one per image table type), rather than one query per listing.
 */
async function fetchImagesForListings(listings) {
  const byTable = {};
  for (const l of listings) {
    const table = getImageTableName(l.listing_type);
    if (!byTable[table]) byTable[table] = [];
    byTable[table].push(l.id);
  }

  const results = await Promise.all(
    Object.entries(byTable).map(([table, ids]) =>
      supabase.from(table).select('listing_id, image_url').in('listing_id', ids).order('id', { ascending: true })
    )
  );

  const imageMap = new Map();
  for (const { data } of results) {
    for (const row of (data || [])) {
      if (!imageMap.has(row.listing_id)) {
        imageMap.set(row.listing_id, row.image_url);
      }
    }
  }
  return imageMap;
}

/**
 * Helper function to get the correct image table name
 */
function getImageTableName(listingType) {
  const imageTableMap = {
    stay: "stay_images",
    event: "event_images",
    offering: "offering_images",
  };
  return imageTableMap[listingType] || "stay_images";
}
