import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';
import burgundyTheme from '../src/theme/burgundyTheme';

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [popularCategories, setPopularCategories] = useState([]);
  const [personalCategories, setPersonalCategories] = useState([]);
  const [popularLoading, setPopularLoading] = useState(false);
  const [personalLoading, setPersonalLoading] = useState(false);

  useEffect(() => {
    fetchPopularCategories();
    fetchPersonalCategories();
  }, []);

  async function fetchPopularCategories() {
    setPopularLoading(true);
    try {
      const { data: catListings } = await supabase
        .from('category_listings')
        .select('listing_id, categories(id, name, image_url)')
        .order('listing_id');

      if (!catListings) {
        setPopularCategories([]);
        return;
      }

      const { data: bookings } = await supabase.from('bookings').select('listing_id');

      const bookingCountByListing = {};
      bookings?.forEach((b) => {
        bookingCountByListing[b.listing_id] = (bookingCountByListing[b.listing_id] || 0) + 1;
      });

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
      setPopularCategories([]);
    } finally {
      setPopularLoading(false);
    }
  }

  async function fetchPersonalCategories() {
    setPersonalLoading(true);
    try {
      const { data: userResult } = await supabase.auth.getUser();
      const user = userResult?.user;
      if (!user) {
        setPersonalCategories([]);
        return;
      }

      const { data: userBookings } = await supabase
        .from('bookings')
        .select('listing_id')
        .eq('user_id', user.id);

      const userListingIds = Array.from(new Set(userBookings?.map((b) => b.listing_id) || []));
      if (!userListingIds.length) {
        setPersonalCategories([]);
        return;
      }

      const { data: catListings } = await supabase
        .from('category_listings')
        .select('listing_id, categories(id, name, image_url)')
        .in('listing_id', userListingIds);

      const categoryCount = {};
      catListings?.forEach((cl) => {
        const cat = cl.categories;
        if (!cat) return;
        categoryCount[cat.id] = categoryCount[cat.id] || { ...cat, count: 0 };
        categoryCount[cat.id].count += 1;
      });

      const personal = Object.values(categoryCount).sort((a, b) => b.count - a.count);
      setPersonalCategories(personal.slice(0, 6));
    } catch (error) {
      console.error('Failed to fetch personal categories', error);
      setPersonalCategories([]);
    } finally {
      setPersonalLoading(false);
    }
  }

  const handleSearchSubmit = () => {
    const trimmed = query.trim();
    router.replace({
      pathname: '/search/results',
      params: trimmed ? { query: trimmed } : {},
    });
  };

  const handleCategoryPress = (category) => {
    router.push({
      pathname: '/search/results',
      params: {
        categoryId: category.id,
        categoryName: category.name,
      },
    });
  };

  return (
    <View style={styles.page}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Find your next experience</Text>
        <Text style={styles.heroTitle}>Search in a burgundy glow</Text>
      </View>

      <View style={styles.topSearch}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search stays, events, offerings..."
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          onSubmitEditing={handleSearchSubmit}
          placeholderTextColor={burgundyTheme.colors.textSubtle}
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearchSubmit}>
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.sectionTitle}>Popular Today</Text>
        {popularLoading ? (
          <View style={styles.loaderRow}>
            <ActivityIndicator size="small" color={burgundyTheme.colors.primary} />
          </View>
        ) : (
          <CategoryGrid
            categories={popularCategories}
            fallbackText="No trending categories yet."
            onPress={handleCategoryPress}
          />
        )}

        <Text style={styles.sectionTitle}>You May Like</Text>
        {personalLoading ? (
          <View style={styles.loaderRow}>
            <ActivityIndicator size="small" color={burgundyTheme.colors.primary} />
          </View>
        ) : (
          <CategoryGrid
            categories={personalCategories}
            fallbackText="Nothing personalized yet."
            onPress={handleCategoryPress}
          />
        )}
      </ScrollView>
    </View>
  );
}

function CategoryGrid({ categories, onPress, fallbackText }) {
  if (!categories.length) {
    return <Text style={styles.fallbackText}>{fallbackText}</Text>;
  }

  return (
    <View style={styles.categoriesGrid}>
      {categories.map((category) => (
        <CategoryTile key={category.id} category={category} onPress={() => onPress(category)} />
      ))}
    </View>
  );
}

function CategoryTile({ category, onPress }) {
  const hasImage = !!category.image_url;
  const content = (
    <View style={styles.categoryOverlay}>
      <Text style={styles.categoryName}>{category.name}</Text>
    
    </View>
  );

  return (
    <TouchableOpacity style={styles.categoryTile} onPress={onPress} activeOpacity={0.85}>
      {hasImage ? (
        <ImageBackground
          source={{ uri: category.image_url }}
          style={styles.categoryImage}
          imageStyle={styles.categoryImageStyle}
        >
          {content}
        </ImageBackground>
      ) : (
        <View style={[styles.categoryImage, styles.categoryFallback]}>
          {content}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: burgundyTheme.colors.background,
  },
  hero: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: burgundyTheme.colors.primarySoft,
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: burgundyTheme.colors.text,
  },
  topSearch: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 6,
    padding: 12,
    gap: 8,
    backgroundColor: burgundyTheme.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: burgundyTheme.colors.border,
    ...burgundyTheme.shadow,
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: burgundyTheme.colors.surfaceAlt,
    paddingHorizontal: 12,
    color: burgundyTheme.colors.text,
    borderWidth: 1,
    borderColor: burgundyTheme.colors.border,
  },
  searchBtn: {
    backgroundColor: burgundyTheme.colors.primary,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 12,
  },
  searchBtnText: {
    color: burgundyTheme.colors.white,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
    marginHorizontal: 12,
    color: burgundyTheme.colors.text,
  },
  loaderRow: {
    paddingHorizontal: 12,
    marginTop: 8,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginTop: 8,
  },
  categoryTile: {
    width: '48%',
    aspectRatio: 1.05,
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
    backgroundColor: burgundyTheme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: burgundyTheme.colors.border,
  },
  categoryImage: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  categoryImageStyle: {
    borderRadius: 14,
  },
  categoryOverlay: {
    backgroundColor: burgundyTheme.colors.overlay,
    padding: 10,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '700',
    color: burgundyTheme.colors.white,
  },
  categoryCount: {
    fontSize: 12,
    color: '#FFF',
    marginTop: 4,
  },
  categoryFallback: {
    padding: 12,
    justifyContent: 'flex-end',
    backgroundColor: burgundyTheme.colors.primaryTintStrong,
  },
  fallbackText: {
    fontSize: 14,
    color: burgundyTheme.colors.textMuted,
    paddingHorizontal: 12,
    marginTop: 8,
  },
});
