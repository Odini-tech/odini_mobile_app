import { Ionicons } from "@expo/vector-icons";
import { useRouter, useSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { supabase } from "../../lib/supabase";

export default function ListingScreen() {
  const router = useRouter();
  const { listingId } = useSearchParams();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (listingId) fetchListing(listingId);
  }, [listingId]);

  async function fetchListing(id) {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("stays")
        .select(`*`)
        .eq("id", id)
        .single();

      if (error) throw error;
      setListing(data);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to load listing");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </SafeAreaView>
    );
  }

  if (!listing) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.notFound}>Listing not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
            <Ionicons name="chevron-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>{listing.title}</Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.location}>{listing.city}, {listing.country}</Text>
          <Text style={styles.type}>{listing.type}</Text>
        </View>

        {listing.description ? (
          <Text style={styles.description}>{listing.description}</Text>
        ) : null}

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="bed-outline" size={18} color="#666" />
            <Text style={styles.statText}>{listing.available_rooms} room{listing.available_rooms !== 1 ? 's' : ''}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="calendar-outline" size={18} color="#666" />
            <Text style={styles.statText}>{listing.is_active ? 'Active' : 'Inactive'}</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F7FA' },
  content: { padding: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  backIcon: { marginRight: 8 },
  title: { fontSize: 22, fontWeight: '700', color: '#1A1A1A', flex: 1 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  location: { fontSize: 14, color: '#666' },
  type: { fontSize: 14, color: '#4A90E2', fontWeight: '600' },
  description: { fontSize: 14, color: '#333', lineHeight: 20, marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 16 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statText: { color: '#666' },
  notFound: { padding: 20, fontSize: 16, color: '#666' },
  backButton: { marginTop: 12, padding: 12, backgroundColor: '#F0F7FF', borderRadius: 8, alignSelf: 'flex-start' },
  backText: { color: '#4A90E2', fontWeight: '600' },
});
