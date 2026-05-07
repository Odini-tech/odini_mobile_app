import { supabase } from "../lib/supabase";

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
        offering(service_type, opening_hours, location, duration_minutes, max_bookings),
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
        offering(service_type, opening_hours, location, duration_minutes, max_bookings),
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
