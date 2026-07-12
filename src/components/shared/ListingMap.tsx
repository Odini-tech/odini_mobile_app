import { getListingLocation, ListingLocation } from '@/utils/useListingLocation'
import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { WebView } from 'react-native-webview'

const MAPTILER_API_KEY = process.env.EXPO_PUBLIC_MAPTILER_API_KEY ?? ''

type ListingMapProps = {
  listing_id: string
  height?: number
  markerTitle?: string
  markerDescription?: string
  onLocationLoaded?: (location: ListingLocation) => void
}

function buildMapHTML(lat: number, lng: number, apiKey: string, title?: string): string {
  const safeTitle = title ? title.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/[\n\r]/g, ' ') : ''
  const popupCode = safeTitle ? `.bindPopup('${safeTitle}').openPopup()` : ''

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { attributionControl: false, zoomControl: true }).setView([${lat}, ${lng}], 15);
    L.tileLayer('https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${apiKey}', {
      maxZoom: 19,
      tileSize: 256
    }).addTo(map);
    L.marker([${lat}, ${lng}])${popupCode}.addTo(map);
  </script>
</body>
</html>`
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
        setError('Map unavailable')
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
        <Text style={styles.errorText}>Map unavailable</Text>
      </View>
    )
  }

  const html = buildMapHTML(
    location.lat,
    location.lng,
    MAPTILER_API_KEY,
    markerTitle ?? location.formatted_address ?? undefined,
  )

  return (
    <View style={[styles.mapWrapper, { height }]}>
      <WebView
        source={{ html }}
        style={styles.map}
        scrollEnabled={false}
        javaScriptEnabled
        originWhitelist={['*']}
      />
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
