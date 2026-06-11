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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAppMode } from '../src/context/AppModeContext';
import { useBottomNavScroll } from '../src/context/BottomNavVisibilityContext';

export default function SearchPage() {
  const router = useRouter();
  const { theme } = useAppMode();
  const insets = useSafeAreaInsets();
  const bottomNavScroll = useBottomNavScroll();
  const [query, setQuery] = useState('');
  const [popularCategories, setPopularCategories] = useState([]);
  const [personalCategories, setPersonalCategories] = useState([]);
  const [popularLoading, setPopularLoading] = useState(false);
  const [personalLoading, setPersonalLoading] = useState(false);
  const styles = getStyles(theme, insets);

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
      <View style={styles.topSearch}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search stays, events, offerings..."
          placeholderTextColor={theme.colors.textSubtle}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          onSubmitEditing={handleSearchSubmit}
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearchSubmit}>
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        {...bottomNavScroll}
      >
        <Text style={styles.sectionTitle}>Popular Today</Text>
        {popularLoading ? (
          <View style={styles.loaderRow}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        ) : (
          <CategoryGrid
            categories={popularCategories}
            fallbackText="No trending categories yet."
            onPress={handleCategoryPress}
            theme={theme}
          />
        )}

        <Text style={styles.sectionTitle}>You May Like</Text>
        {personalLoading ? (
          <View style={styles.loaderRow}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        ) : (
          <CategoryGrid
            categories={personalCategories}
            fallbackText="Nothing personalised yet."
            onPress={handleCategoryPress}
            theme={theme}
          />
        )}
      </ScrollView>
    </View>
  );
}

function CategoryGrid({ categories, onPress, fallbackText, theme }) {
  if (!categories.length) {
    return <Text style={{ fontSize: 14, color: theme.colors.textMuted, paddingHorizontal: 16, marginTop: 8 }}>{fallbackText}</Text>;
  }
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 8 }}>
      {categories.map((category) => (
        <CategoryTile key={category.id} category={category} theme={theme} onPress={() => onPress(category)} />
      ))}
    </View>
  );
}

function CategoryTile({ category, onPress, theme }) {
  const hasImage = !!category.image_url;
  const overlay = (
    <View style={{ backgroundColor: 'rgba(0,0,0,0.38)', padding: 10 }}>
      <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFF' }}>{category.name}</Text>
    </View>
  );

  return (
    <TouchableOpacity
      style={{ width: '48%', aspectRatio: 1.05, borderRadius: 14, marginBottom: 12, overflow: 'hidden', backgroundColor: theme.colors.surfaceAlt }}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {hasImage ? (
        <ImageBackground
          source={{ uri: category.image_url }}
          style={{ flex: 1, justifyContent: 'flex-end' }}
          imageStyle={{ borderRadius: 14 }}
        >
          {overlay}
        </ImageBackground>
      ) : (
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: theme.colors.primaryTint }}>
          {overlay}
        </View>
      )}
    </TouchableOpacity>
  );
}

const getStyles = (theme, insets) =>
  StyleSheet.create({
    page: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    topSearch: {
      flexDirection: 'row',
      paddingTop: insets.top + 12,
      paddingBottom: 12,
      paddingHorizontal: 16,
      gap: 8,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    searchInput: {
      flex: 1,
      height: 44,
      borderRadius: 10,
      backgroundColor: theme.colors.surfaceAlt,
      paddingHorizontal: 14,
      color: theme.colors.text,
      borderWidth: 1,
      borderColor: theme.colors.border,
      fontSize: 15,
    },
    searchBtn: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 16,
      justifyContent: 'center',
      borderRadius: 10,
      height: 44,
    },
    searchBtnText: {
      color: theme.colors.white,
      fontWeight: '700',
      fontSize: 15,
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      paddingBottom: 32,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.colors.text,
      marginTop: 20,
      marginHorizontal: 16,
      marginBottom: 4,
    },
    loaderRow: {
      paddingHorizontal: 16,
      marginTop: 12,
    },
  });
