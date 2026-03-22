import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { getListings } from "../../../services/listings.service";
import burgundyTheme from '../../theme/burgundyTheme';
import ListingGridWithDetails from '../shared/ListingGridWithDetails';

export default function Explore({ onItemClick }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadListings();
  }, []);

  const loadListings = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Starting to fetch listings...');
      const data = await getListings();
      console.log('Listings received:', data);
      if (!data || data.length === 0) {
        setError('No listings available');
        setListings([]);
      } else {
        setListings(data);
      }
    } catch (err) {
      console.error('Error loading listings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ListingGridWithDetails
        listings={listings}
        loading={loading}
        error={error}
        onListingSelected={onItemClick}
        contentContainerStyle={styles.gridContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: burgundyTheme.colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: burgundyTheme.colors.primarySoft,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: burgundyTheme.colors.text,
  },
  gridContent: {
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
});
