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
        <ActivityIndicator size="large" color="#000000" />
      </SafeAreaView>
    );
  }

  if (!listing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#000000" />
          </TouchableOpacity>
        </View>
        <View style={styles.centeredContent}>
          <Ionicons name="alert-circle-outline" size={64} color="#888888" />
          <Text style={styles.notFoundTitle}>Listing Not Found</Text>
          <Text style={styles.notFoundText}>The requested listing could not be loaded.</Text>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Return to Listings</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <Ionicons name="chevron-back" size={24} color="#000000" />
          </TouchableOpacity>
          <View style={styles.headerSpacer} />
        </View>

        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>{listing.title}</Text>
          <View style={styles.divider} />
        </View>

        {/* Location and Type */}
        <View style={styles.metaContainer}>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={16} color="#666666" />
            <Text style={styles.location}>
              {listing.city}, {listing.country}
            </Text>
          </View>
          <View style={styles.tagContainer}>
            <Text style={styles.typeTag}>{listing.type}</Text>
          </View>
        </View>

        {/* Description */}
        {listing.description && (
          <View style={styles.descriptionContainer}>
            <Text style={styles.sectionLabel}>Description</Text>
            <Text style={styles.description}>{listing.description}</Text>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionLabel}>Details</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="bed-outline" size={20} color="#000000" />
              <Text style={styles.statValue}>{listing.available_rooms}</Text>
              <Text style={styles.statLabel}>Room{listing.available_rooms !== 1 ? 's' : ''}</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="time-outline" size={20} color="#000000" />
              <Text style={[styles.statValue, listing.is_active ? styles.active : styles.inactive]}>
                {listing.is_active ? 'Active' : 'Inactive'}
              </Text>
              <Text style={styles.statLabel}>Status</Text>
            </View>
          </View>
        </View>

        {/* Additional Info Section */}
        <View style={styles.infoContainer}>
          <Text style={styles.sectionLabel}>Property Information</Text>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color="#666666" />
            <Text style={styles.infoText}>Listed recently</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#666666" />
            <Text style={styles.infoText}>Verified listing</Text>
          </View>
        </View>

        {/* Bottom Spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFFFFF' 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#FFFFFF' 
  },
  content: { 
    paddingHorizontal: 20 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#F8F8F8'
  },
  headerSpacer: {
    flex: 1
  },
  titleSection: {
    marginTop: 24,
    marginBottom: 20
  },
  title: {
    fontSize: 28,
    fontWeight: '300',
    color: '#000000',
    letterSpacing: -0.5,
    lineHeight: 34
  },
  divider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginTop: 16
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  location: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '400'
  },
  tagContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F5F5F5',
    borderRadius: 16
  },
  typeTag: {
    fontSize: 12,
    color: '#333333',
    fontWeight: '500',
    letterSpacing: 0.5
  },
  descriptionContainer: {
    marginBottom: 32
  },
  sectionLabel: {
    fontSize: 12,
    color: '#888888',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12
  },
  description: {
    fontSize: 15,
    color: '#333333',
    lineHeight: 22,
    fontWeight: '300'
  },
  statsContainer: {
    marginBottom: 32
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEEEEE'
  },
  statValue: {
    fontSize: 24,
    fontWeight: '300',
    color: '#000000',
    marginTop: 8,
    marginBottom: 2
  },
  active: {
    color: '#000000'
  },
  inactive: {
    color: '#888888'
  },
  statLabel: {
    fontSize: 11,
    color: '#666666',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  infoContainer: {
    marginBottom: 32
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    paddingVertical: 8
  },
  infoText: {
    fontSize: 14,
    color: '#444444',
    fontWeight: '300'
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40
  },
  notFoundTitle: {
    fontSize: 20,
    fontWeight: '400',
    color: '#000000',
    marginTop: 20,
    marginBottom: 8
  },
  notFoundText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24
  },
  primaryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#000000',
    borderRadius: 8,
    minWidth: 160
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center'
  },
  bottomSpacer: {
    height: 40
  }
});