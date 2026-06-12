import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import MapView, { Marker, UrlTile, Region } from 'react-native-maps'
import { getListingLocation, ListingLocation } from '@/utils/useListingLocation'

const MAPTILER_API_KEY = process.env.EXPO_PUBLIC_MAPTILER_API_KEY ?? ''
const MAPTILER_TILE_URL = `https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=${MAPTILER_API_KEY}`

const DEFAULT_DELTA = {
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
}

type ListingMapProps = {
  listing_id: string
  height?: number
  markerTitle?: string
  markerDescription?: string
  onLocationLoaded?: (location: ListingLocation) => void
}

export default function ListingMap({
  listing_id,
  height = 240,
  markerTitle,
  markerDescription,
  onLocationLoaded,
}: ListingMapProps) {
  const [location, setLocation] = useState<ListingLocation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchLocation() {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await getListingLocation(listing_id)

      if (cancelled) return

      if (fetchError || !data) {
        setError(fetchError ?? 'Location unavailable')
        setLoading(false)
        return
      }

      setLocation(data)
      onLocationLoaded?.(data)
      setLoading(false)
    }

    fetchLocation()
    return () => { cancelled = true }
  }, [listing_id])

  if (loading) {
    return (
      <View style={[styles.container, { height }]}>
        <ActivityIndicator size="small" color="#1D9E75" />
      </View>
    )
  }

  if (error || !location) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={styles.errorText}>{error ?? 'Location unavailable'}</Text>
      </View>
    )
  }

  const region: Region = {
    latitude: location.lat,
    longitude: location.lng,
    ...DEFAULT_DELTA,
  }

  return (
    <View style={[styles.mapWrapper, { height }]}>
      <MapView
        style={styles.map}
        initialRegion={region}
        mapType="none"
        rotateEnabled={false}
      >
        <UrlTile
          urlTemplate={MAPTILER_TILE_URL}
          maximumZ={19}
          flipY={false}
          tileSize={256}
        />
        <Marker
          coordinate={{ latitude: location.lat, longitude: location.lng }}
          title={markerTitle ?? location.formatted_address ?? 'Listing'}
          description={markerDescription ?? [location.city, location.country].filter(Boolean).join(', ')}
          pinColor="#1D9E75"
        />
      </MapView>

      {location.formatted_address && (
        <View style={styles.addressBadge}>
          <Text style={styles.addressText} numberOfLines={1}>
            {location.formatted_address}
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    backgroundColor: '#F1EFE8',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mapWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  addressBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  addressText: {
    fontSize: 12,
    color: '#444441',
  },
  errorText: {
    fontSize: 13,
    color: '#888780',
  },
})
