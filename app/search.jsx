import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Image,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { supabase } from '../lib/supabase';
import ExploreCard from '../src/components/ExploreCard';
import { popularTodayService } from '../src/services/popularTodayService';
import { searchService } from '../src/services/searchService';

const { width } = Dimensions.get('window');
const CATEGORY_CARD_WIDTH = width / 2.3;

export default function Search() {
  const [searchQuery, setSearchQuery] = useState('');
  const [allCategories, setAllCategories] = useState([]);
  const [popularCategories, setPopularCategories] = useState([]);
  const [userCategories, setUserCategories] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryListings, setCategoryListings] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingListings, setIsLoadingListings] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingPopular, setLoadingPopular] = useState(true);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setCurrentUser(data?.user);
    };
    getUser();
  }, []);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoadingPopular(true);
      // Get all categories
      const categories = await searchService.getCategories();
      setAllCategories(categories);

      // Get popular categories (top booked)
      const popularListings = await popularTodayService.getPopularThisWeek({ page_size: 50 });
      const popularCats = popularListings.categories.slice(0, 6);
      setPopularCategories(popularCats);

      // Get user's categories if logged in
      if (currentUser?.id) {
        const userCats = await getUserTopCategories(currentUser.id);
        setUserCategories(userCats.slice(0, 6));
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoadingPopular(false);
    }
  };

  const getUserTopCategories = async (userId) => {
    try {
      // Get user's bookings
      const { data: bookings, error: bookingError } = await supabase
        .from('bookings')
        .select('listing_id')
        .eq('user_id', userId)
        .limit(50);

      if (bookingError || !bookings?.length) return [];

      const listingIds = bookings.map(b => b.listing_id);

      // Get categories for user's bookings
      const { data: categoryListings, error } = await supabase
        .from('category_listings')
        .select('category_id, categories(id, name, description, image_url, parent_id, created_at)')
        .in('listing_id', listingIds);

      if (error || !categoryListings?.length) return [];

      // Count categories and get top ones
      const categoryCount = {};
      categoryListings.forEach((cl) => {
        if (cl.categories) {
          const catId = cl.categories.id;
          categoryCount[catId] = (categoryCount[catId] || 0) + 1;
        }
      });

      // Sort by count and return
      const topCategories = categoryListings
        .filter((cl, idx, self) => self.findIndex(c => c.categories?.id === cl.categories?.id) === idx)
        .sort((a, b) => (categoryCount[b.categories?.id] || 0) - (categoryCount[a.categories?.id] || 0))
        .map(cl => cl.categories)
        .filter(Boolean);

      return topCategories;
    } catch (error) {
      console.error('Error getting user categories:', error);
      return [];
    }
  };

  const handleSearch = useCallback(async (query) => {
    setSearchQuery(query);
    if (query.trim().length > 0) {
      setIsSearching(true);
      try {
        const results = await searchService.searchListings({ query, page_size: 50 });
        setSearchResults(results.listings);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    } else {
      setSearchResults([]);
    }
  }, []);

  const handleCategoryPress = useCallback(async (category) => {
    setSelectedCategory(category);
    setIsLoadingListings(true);
    try {
      const results = await searchService.searchByCategory(category.id, { page_size: 50 });
      setCategoryListings(results.listings);
      setShowResultsModal(true);
    } catch (error) {
      console.error('Error loading category listings:', error);
    } finally {
      setIsLoadingListings(false);
    }
  }, []);

  const renderCategoryCard = (category) => (
    <TouchableOpacity
      key={category.id}
      style={styles.categoryCard}
      onPress={() => handleCategoryPress(category)}
      activeOpacity={0.8}
    >
      <View style={styles.categoryImageContainer}>
        {category.image_url ? (
          <Image
            source={{ uri: category.image_url }}
            style={styles.categoryImage}
          />
        ) : (
          <View style={[styles.categoryImage, styles.categoryImagePlaceholder]}>
            <Ionicons name="grid" size={32} color="#999" />
          </View>
        )}
      </View>
      <Text style={styles.categoryName} numberOfLines={2}>
        {category.name}
      </Text>
    </TouchableOpacity>
  );

  const renderExploreCard = ({ item }) => (
    <View style={styles.exploreCardContainer}>
      <ExploreCard item={item} onPress={() => console.log('Item pressed:', item.id)} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={styles.searchBarContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search listings, events, offerings..."
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor="#CCC"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Search Results ({searchResults.length})</Text>
            <View style={styles.resultsGrid}>
              {searchResults.slice(0, 6).map((listing) => (
                <View key={listing.id} style={styles.exploreCardContainer}>
                  <ExploreCard item={listing} />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Only show sections if not searching */}
        {searchResults.length === 0 && (
          <>
            {/* Popular Today Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Popular Today</Text>
              {loadingPopular ? (
                <ActivityIndicator size="large" color="#4A90E2" style={styles.loader} />
              ) : popularCategories.length > 0 ? (
                <ScrollView
                  horizontal
                  scrollEventThrottle={16}
                  showsHorizontalScrollIndicator={false}
                  style={styles.horizontalScroll}
                >
                  {popularCategories.map((category) => (
                    <View key={category.id} style={styles.categoryCardWrapper}>
                      {renderCategoryCard(category)}
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <Text style={styles.emptyText}>No popular categories yet</Text>
              )}
            </View>

            {/* You May Like Section */}
            {userCategories.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>You May Like</Text>
                <ScrollView
                  horizontal
                  scrollEventThrottle={16}
                  showsHorizontalScrollIndicator={false}
                  style={styles.horizontalScroll}
                >
                  {userCategories.map((category) => (
                    <View key={category.id} style={styles.categoryCardWrapper}>
                      {renderCategoryCard(category)}
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* All Categories Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Browse All Categories</Text>
              <View style={styles.categoriesGrid}>
                {allCategories.slice(0, 12).map((category) => renderCategoryCard(category))}
              </View>
            </View>
          </>
        )}

        {/* Loading indicator for search */}
        {isSearching && (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#4A90E2" />
          </View>
        )}
      </ScrollView>

      {/* Category Results Modal */}
      <Modal
        visible={showResultsModal}
        animationType="slide"
        onRequestClose={() => setShowResultsModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowResultsModal(false)}>
              <Ionicons name="chevron-back" size={28} color="#1A1A1A" />
            </TouchableOpacity>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {selectedCategory?.name}
            </Text>
            <View style={{ width: 28 }} />
          </View>

          {/* Modal Content */}
          {isLoadingListings ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#4A90E2" />
            </View>
          ) : categoryListings.length > 0 ? (
            <FlatList
              data={categoryListings}
              renderItem={renderExploreCard}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={styles.columnWrapper}
              contentContainerStyle={styles.flatListContent}
              scrollEventThrottle={16}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={64} color="#DDD" />
              <Text style={styles.emptyTitle}>No listings found</Text>
              <Text style={styles.emptySubtitle}>Try browsing another category</Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollView: {
    flex: 1,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 20,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    height: 48,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  horizontalScroll: {
    paddingHorizontal: 16,
  },
  categoryCardWrapper: {
    marginRight: 12,
  },
  categoryCard: {
    width: CATEGORY_CARD_WIDTH,
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryImageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  categoryImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    padding: 12,
    textAlign: 'center',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  resultsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    justifyContent: 'space-between',
  },
  exploreCardContainer: {
    width: '48%',
    marginHorizontal: '1%',
    marginBottom: 12,
  },
  loader: {
    marginVertical: 24,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginVertical: 24,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginHorizontal: 12,
  },
  flatListContent: {
    paddingHorizontal: 8,
    paddingBottom: 24,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
});