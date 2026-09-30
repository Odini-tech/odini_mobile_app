import { Ionicons } from '@expo/vector-icons'
import * as Location from 'expo-location'
import { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { WebView, WebViewMessageEvent } from 'react-native-webview'
import type { ListingLocationDraft } from '@/utils/useListingLocation'
import { requestAndGetLocation } from '@/services/locationService'

const MAPTILER_API_KEY = process.env.EXPO_PUBLIC_MAPTILER_API_KEY ?? ''

type SearchResult = ListingLocationDraft & { label: string }

type ListingLocationPickerProps = {
  value?: ListingLocationDraft | null
  onChange: (location: ListingLocationDraft) => void
  height?: number
}

function formatAddress(address: Location.LocationGeocodedAddress): string {
  return [address.name, address.street, address.city, address.region, address.country]
    .filter(Boolean)
    .filter((part, index, parts) => parts.indexOf(part) === index)
    .join(', ')
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function buildPickerHtml(value: ListingLocationDraft | null): string {
  const lat = value?.lat ?? 0
  const lng = value?.lng ?? 0
  const zoom = value ? 15 : 2
  const tileLayer = MAPTILER_API_KEY
    ? `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${escapeHtml(MAPTILER_API_KEY)}`
    : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
  const attribution = MAPTILER_API_KEY ? 'MapTiler' : 'OpenStreetMap contributors'

  return `<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>*{margin:0;padding:0;box-sizing:border-box}html,body,#map{width:100%;height:100%}.leaflet-control-attribution{font-size:9px}</style>
</head>
<body>
  <div id="map"></div>
  <script>
    var hasLocation = ${value ? 'true' : 'false'};
    var map = L.map('map').setView([${lat}, ${lng}], ${zoom});
    L.tileLayer('${tileLayer}', { maxZoom: 19, attribution: '&copy; ${attribution}' }).addTo(map);
    var marker = hasLocation ? L.marker([${lat}, ${lng}]).addTo(map) : null;
    map.on('click', function(event) {
      var point = { lat: event.latlng.lat, lng: event.latlng.lng };
      if (marker) marker.setLatLng(event.latlng); else marker = L.marker(event.latlng).addTo(map);
      window.ReactNativeWebView.postMessage(JSON.stringify(point));
    });
  </script>
</body>
</html>`
}

export default function ListingLocationPicker({
  value = null,
  onChange,
  height = 260,
}: ListingLocationPickerProps) {
  const [query, setQuery] = useState(value?.formatted_address ?? '')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const html = useMemo(() => buildPickerHtml(value ?? null), [value])

  async function searchPlaces() {
    const trimmedQuery = query.trim()
    if (!trimmedQuery) return
    if (!MAPTILER_API_KEY) {
      setError('Add EXPO_PUBLIC_MAPTILER_API_KEY to search places.')
      return
    }

    setSearching(true)
    setError(null)
    try {
      const response = await fetch(
        `https://api.maptiler.com/geocoding/${encodeURIComponent(trimmedQuery)}.json?key=${MAPTILER_API_KEY}&limit=5`,
      )
      if (!response.ok) throw new Error('Search failed')
      const payload = await response.json()
      const nextResults: SearchResult[] = (payload.features ?? [])
        .filter((feature: any) => Array.isArray(feature.geometry?.coordinates))
        .map((feature: any) => ({
          lat: Number(feature.geometry.coordinates[1]),
          lng: Number(feature.geometry.coordinates[0]),
          place_id: feature.id ?? null,
          formatted_address: feature.properties?.label ?? feature.properties?.name ?? trimmedQuery,
          city: feature.properties?.city ?? null,
          country: feature.properties?.country ?? null,
          label: feature.properties?.label ?? feature.properties?.name ?? trimmedQuery,
        }))
      setResults(nextResults)
      if (!nextResults.length) setError('No matching places found.')
    } catch {
      setError('Could not search places. Check your connection and try again.')
    } finally {
      setSearching(false)
    }
  }

  async function useCurrentLocation() {
    setLocating(true)
    setError(null)
    try {
      const current = await requestAndGetLocation()
      if (!current) {
        setError('Location permission is needed to use your current position.')
        return
      }
      const { latitude: lat, longitude: lng } = current
      const [address] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng })
      const formattedAddress = address ? formatAddress(address) : null
      onChange({
        lat,
        lng,
        place_id: null,
        formatted_address: formattedAddress,
        city: address?.city ?? null,
        country: address?.country ?? null,
      })
      setQuery(formattedAddress ?? '')
    } catch {
      setError('Could not read your current location.')
    } finally {
      setLocating(false)
    }
  }

  function handleMapMessage(event: WebViewMessageEvent) {
    try {
      const point = JSON.parse(event.nativeEvent.data) as { lat: number; lng: number }
      onChange({
        lat: point.lat,
        lng: point.lng,
        place_id: null,
        formatted_address: null,
        city: null,
        country: null,
      })
      setQuery('Pinned location')
      setResults([])
    } catch {
      setError('Could not set the pinned location.')
    }
  }

  function selectResult(result: SearchResult) {
    const { label: _label, ...location } = result
    onChange(location)
    setQuery(result.label)
    setResults([])
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.searchRow}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={searchPlaces}
          placeholder="Search for an address or place"
          placeholderTextColor="#8A8881"
          style={styles.input}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchButton} onPress={searchPlaces} disabled={searching} accessibilityLabel="Search location">
          {searching ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="search" size={19} color="#FFFFFF" />}
        </TouchableOpacity>
      </View>

      {results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={(item) => `${item.place_id}-${item.lat}-${item.lng}`}
          style={styles.results}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.result} onPress={() => selectResult(item)}>
              <Ionicons name="location-outline" size={18} color="#1D9E75" />
              <Text style={styles.resultText} numberOfLines={2}>{item.label}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      <View style={[styles.mapWrapper, { height }]}>
        <WebView
          source={{ html }}
          onMessage={handleMapMessage}
          style={styles.map}
          scrollEnabled={false}
          javaScriptEnabled
          originWhitelist={['*']}
        />
        <View pointerEvents="none" style={styles.mapHint}>
          <Text style={styles.mapHintText}>Tap the map to place the pin</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.currentButton} onPress={useCurrentLocation} disabled={locating}>
        {locating ? <ActivityIndicator size="small" color="#1D9E75" /> : <Ionicons name="navigate" size={18} color="#1D9E75" />}
        <Text style={styles.currentButtonText}>{locating ? 'Finding your location...' : 'Use my current location'}</Text>
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { gap: 10 },
  searchRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, minHeight: 46, borderWidth: 1, borderColor: '#D8D5CC', borderRadius: 10, paddingHorizontal: 13, color: '#292927', backgroundColor: '#FFFFFF', fontSize: 15 },
  searchButton: { width: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1D9E75' },
  results: { maxHeight: 190, borderWidth: 1, borderColor: '#E0DED6', borderRadius: 10, backgroundColor: '#FFFFFF' },
  result: { minHeight: 50, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E0DED6' },
  resultText: { flex: 1, color: '#444441', fontSize: 14 },
  mapWrapper: { overflow: 'hidden', borderRadius: 12, backgroundColor: '#F1EFE8' },
  map: { flex: 1 },
  mapHint: { position: 'absolute', top: 10, alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  mapHintText: { color: '#444441', fontSize: 12 },
  currentButton: { minHeight: 44, borderRadius: 10, borderWidth: 1, borderColor: '#A7D8C8', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#F2FBF7' },
  currentButtonText: { color: '#137353', fontSize: 14, fontWeight: '600' },
  errorText: { color: '#B42318', fontSize: 13 },
})
