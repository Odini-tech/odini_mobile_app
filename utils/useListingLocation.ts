import { supabase } from '@/services/supabase/client'

export type ListingLocation = {
  listing_id: string
  lat: number
  lng: number
  formatted_address: string | null
  city: string | null
  country: string | null
  place_id: string | null
}

export type ListingLocationDraft = Omit<ListingLocation, 'listing_id'>

type LocationResult =
  | { data: ListingLocation; error: null }
  | { data: null; error: string }

export async function getListingLocation(listing_id: string): Promise<LocationResult> {
  if (!listing_id) {
    return { data: null, error: 'listing_id is required' }
  }

  const { data, error } = await supabase
    .from('locations')
    .select('listing_id, lat, lng, formatted_address, city, country, place_id')
    .eq('listing_id', listing_id)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  if (!data) {
    return { data: null, error: 'No location found for this listing' }
  }

  return { data, error: null }
}

export async function getMultipleListingLocations(
  listing_ids: string[]
): Promise<{ data: ListingLocation[]; error: string | null }> {
  if (!listing_ids.length) {
    return { data: [], error: null }
  }

  const { data, error } = await supabase
    .from('locations')
    .select('listing_id, lat, lng, formatted_address, city, country, place_id')
    .in('listing_id', listing_ids)

  if (error) {
    return { data: [], error: error.message }
  }

  return { data: data ?? [], error: null }
}

export async function saveListingLocation(
  listing_id: string,
  location: ListingLocationDraft,
): Promise<{ data: ListingLocation | null; error: string | null }> {
  if (!listing_id) {
    return { data: null, error: 'listing_id is required' }
  }

  const { data, error } = await supabase
    .from('locations')
    .upsert(
      { listing_id, ...location },
      { onConflict: 'listing_id' },
    )
    .select('listing_id, lat, lng, formatted_address, city, country, place_id')
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  return { data, error: null }
}
