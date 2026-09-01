import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppData } from '@/store/AppDataContext';
import { useAppMode } from '@/store/AppModeContext';
import { useBottomNavScroll } from '@/store/BottomNavVisibilityContext';
import { searchService } from '@/services/searchService';

export default function SearchPage() {
  const router = useRouter();
  const { theme } = useAppMode();
  const insets = useSafeAreaInsets();
  const bottomNavScroll = useBottomNavScroll();
  const { personalCategories } = useAppData();
  const [query, setQuery] = useState('');
  const [popularTags, setPopularTags] = useState([]);
  const styles = getStyles(theme, insets);
  const categories = personalCategories.slice(0, 6);

  useEffect(() => {
    searchService.getPopularTags(10).then(setPopularTags).catch(() => setPopularTags([]));
  }, []);

  const handleSearchSubmit = () => {
    const trimmed = query.trim();
    router.replace({
      pathname: '/search/results',
      params: trimmed ? { query: trimmed } : {},
    });
  };

  const handleTagPress = (tag) => {
    router.push({
      pathname: '/search/results',
      params: {
        tagId: tag.id,
        tagName: tag.name,
      },
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
          placeholder="Search stays, events, activities..."
          placeholderTextColor={theme.colors.textSubtle}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          onSubmitEditing={handleSearchSubmit}
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearchSubmit}>
          <Ionicons name="search" size={22} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        {...bottomNavScroll}
      >
        <Text style={styles.sectionTitle}>Popular Searches</Text>
        {popularTags.length ? (
          <View style={styles.tagList}>
            {popularTags.map((tag) => (
              <TouchableOpacity key={tag.id} onPress={() => handleTagPress(tag)}>
                <Text style={styles.tagText}>#{tag.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text style={styles.fallbackText}>No popular searches yet.</Text>
        )}

        <Text style={styles.sectionTitle}>You May Like</Text>
        {categories.length ? (
          <View style={styles.categoryGrid}>
            {categories.map((category) => (
              <CategoryTile
                key={category.id}
                category={category}
                theme={theme}
                styles={styles}
                onPress={() => handleCategoryPress(category)}
              />
            ))}
          </View>
        ) : (
          <Text style={styles.fallbackText}>Nothing personalised yet.</Text>
        )}
      </ScrollView>
    </View>
  );
}

function CategoryTile({ category, onPress, theme, styles }) {
  const hasImage = !!category.image_url;
  const content = (
    <>
      <LinearGradient
        colors={['rgba(0,0,0,0.12)', 'rgba(0,0,0,0.28)', 'rgba(0,0,0,0.66)', theme.colors.background]}
        style={styles.categoryTileGradient}
      />
      <Text style={styles.categoryTileText} numberOfLines={2}>
        {category.name}
      </Text>
    </>
  );

  return (
    <TouchableOpacity style={styles.categoryTile} onPress={onPress} activeOpacity={0.85}>
      {hasImage ? (
        <ImageBackground
          source={{ uri: category.image_url }}
          style={styles.categoryTileImage}
          imageStyle={styles.categoryTileImageRadius}
        >
          {content}
        </ImageBackground>
      ) : (
        <View style={[styles.categoryTileImage, { backgroundColor: theme.colors.surfaceAlt }]}>
          {content}
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
      borderRadius: 3,
      backgroundColor: theme.colors.surfaceAlt,
      paddingHorizontal: 14,
      color: theme.colors.text,
      borderWidth: 1,
      borderColor: theme.colors.border,
      fontSize: 15,
    },
    searchBtn: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
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
    tagList: {
      paddingHorizontal: 16,
      marginTop: 8,
      gap: 14,
    },
    tagText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    fallbackText: {
      fontSize: 14,
      color: theme.colors.textMuted,
      paddingHorizontal: 16,
      marginTop: 8,
    },
    categoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      marginTop: 8,
      gap: 12,
    },
    categoryTile: {
      width: '47%',
      aspectRatio: 1.1,
      borderRadius: 14,
      overflow: 'hidden',
      backgroundColor: theme.colors.surfaceAlt,
    },
    categoryTileImage: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    categoryTileImageRadius: {
      borderRadius: 14,
    },
    categoryTileGradient: {
      ...StyleSheet.absoluteFillObject,
    },
    categoryTileText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.text,
      padding: 12,
    },
  });