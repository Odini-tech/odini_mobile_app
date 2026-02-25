import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { supabase } from '../lib/supabase';
import ExploreCard from '../src/components/ExploreCard';
import { searchService } from '../src/services/searchService';

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [popularCategories, setPopularCategories] = useState([]);
  const [personalCategories, setPersonalCategories] = useState([]);
  const [selectedCategoryListings, setSelectedCategoryListings] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    fetchPopularCategories();
    fetchPersonalCategories();
  }, []);

  async function fetchPopularCategories() {
    setLoading(true);
    try {
      // Get all category-listing relations with category info
      const { data: catListings } = await supabase
        .from('category_listings')
        .select('listing_id, categories(id, name, image_url)');

      if (!catListings) {
        setPopularCategories([]);
        return;
      }

      const listingIds = Array.from(new Set(catListings.map(c => c.listing_id)));

      // Fetch bookings for these listings
      const { data: bookings } = await supabase
        .from('bookings')
        .select('listing_id');

      const bookingCountByListing = {};
      bookings?.forEach(b => {
        bookingCountByListing[b.listing_id] = (bookingCountByListing[b.listing_id] || 0) + 1;
      });

      // Aggregate counts per category
      const catMap = {};
      catListings.forEach((cl) => {
        const cat = cl.categories;
        if (!cat) return;
        catMap[cat.id] = catMap[cat.id] || { ...cat, count: 0 };
        catMap[cat.id].count += bookingCountByListing[cl.listing_id] || 0;
      });

      const categoriesArray = Object.values(catMap).sort((a, b) => b.count - a.count);
      setPopularCategories(categoriesArray.slice(0, 6));
    } catch (error) {
      console.error('Failed to fetch popular categories', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchPersonalCategories() {
    try {
      const { data: userResult } = await supabase.auth.getUser();
      const user = userResult?.user;
      if (!user) return setPersonalCategories([]);

      // Get user's bookings
      const { data: userBookings } = await supabase
        .from('bookings')
        .select('listing_id')
        .eq('user_id', user.id);

      const userListingIds = Array.from(new Set(userBookings?.map(b => b.listing_id) || []));
      if (userListingIds.length === 0) {
        setPersonalCategories([]);
        return;
      }

      // Get categories for those listings
      const { data: catListings } = await supabase
        .from('category_listings')
        .select('listing_id, categories(id, name, image_url)')
        .in('listing_id', userListingIds);

      const catCount = {};
      catListings?.forEach(cl => {
        const cat = cl.categories;
        if (!cat) return;
        catCount[cat.id] = catCount[cat.id] || { ...cat, count: 0 };
        catCount[cat.id].count += 1;
      });

      const personal = Object.values(catCount).sort((a, b) => b.count - a.count);
      setPersonalCategories(personal.slice(0, 6));
    } catch (error) {
      console.error('Failed to fetch personal categories', error);
    }
  }

  async function onCategoryPress(category) {
    setSelectedCategory(category);
    setSelectedCategoryListings([]);
    setLoading(true);
    try {
      const results = await searchService.searchByCategory(category.id, { page: 1, page_size: 50 });
      setSelectedCategoryListings(results.listings || []);
    } catch (error) {
      console.error('Failed to fetch category listings', error);
      setSelectedCategoryListings([]);
    } finally {
      setLoading(false);
    }
  }

  async function onSearchSubmit() {
    setLoading(true);
    try {
      const res = await searchService.searchListings({ query, page: 1, page_size: 50 });
      setSearchResults(res.listings || []);
      setSelectedCategory(null);
      setSelectedCategoryListings([]);
    } catch (error) {
      console.error('Search failed', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }

  function renderCategoryItem({ item }) {
    return (
      <TouchableOpacity style={styles.categoryTile} onPress={() => onCategoryPress(item)}>
        <Text style={styles.categoryName}>{item.name}</Text>
        <Text style={styles.categoryCount}>{item.count || 0} bookings</Text>
      </TouchableOpacity>
    );
  }

  function renderListing({ item }) {
    return (
      <ExploreCard item={item} onPress={() => router.push(`/listings/${item.id}`)} />
    );
  }

  return (
    <View style={styles.page}>
      <View style={styles.topSearch}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search stays, events, offerings..."
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          onSubmitEditing={onSearchSubmit}
        />
        <TouchableOpacity style={styles.searchBtn} onPress={onSearchSubmit}>
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Popular Today</Text>
        {loading ? (
          <ActivityIndicator size="small" color="#4A90E2" />
        ) : (
          <FlatList
            data={popularCategories}
            keyExtractor={(i) => i.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={renderCategoryItem}
            contentContainerStyle={{ paddingHorizontal: 12 }}
          />
        )}

        <Text style={styles.sectionTitle}>You May Like</Text>
        <FlatList
          data={personalCategories}
          keyExtractor={(i) => i.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={renderCategoryItem}
          contentContainerStyle={{ paddingHorizontal: 12 }}
        />

        {selectedCategory && (
          <View>
            <Text style={styles.sectionTitle}>Results for {selectedCategory.name}</Text>
            {loading ? (
              <ActivityIndicator size="large" color="#4A90E2" />
            ) : (
              <FlatList
                data={selectedCategoryListings}
                keyExtractor={(l) => l.id}
                renderItem={renderListing}
                numColumns={2}
                contentContainerStyle={{ padding: 12 }}
              />
            )}
          </View>
        )}

        {searchResults.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Search Results</Text>
            <FlatList
              data={searchResults}
              keyExtractor={(l) => l.id}
              renderItem={renderListing}
              numColumns={2}
              contentContainerStyle={{ padding: 12 }}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FFF' },
  topSearch: { flexDirection: 'row', padding: 12, gap: 8 },
  searchInput: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
  },
  searchBtn: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 8,
  },
  searchBtnText: { color: '#FFF', fontWeight: '700' },
  content: { flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 12, marginLeft: 12 },
  categoryTile: {
    backgroundColor: '#F8FAFF',
    padding: 12,
    borderRadius: 8,
    marginRight: 10,
    minWidth: 120,
    alignItems: 'center',
  },
  categoryName: { fontSize: 14, fontWeight: '700' },
  categoryCount: { fontSize: 12, color: '#666', marginTop: 6 },
});