import { useRouter } from 'expo-router';
import { useState } from 'react';
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
import { useAppMode } from '../src/context/AppModeContext';
import { useAppData } from '../src/context/AppDataContext';
import { useBottomNavScroll } from '../src/context/BottomNavVisibilityContext';

export default function SearchPage() {
  const router = useRouter();
  const { theme } = useAppMode();
  const insets = useSafeAreaInsets();
  const bottomNavScroll = useBottomNavScroll();
  const { popularCategories, personalCategories } = useAppData();
  const [query, setQuery] = useState('');
  const styles = getStyles(theme, insets);

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
        <CategoryGrid
          categories={popularCategories}
          fallbackText="No trending categories yet."
          onPress={handleCategoryPress}
          theme={theme}
        />

        <Text style={styles.sectionTitle}>You May Like</Text>
        <CategoryGrid
          categories={personalCategories}
          fallbackText="Nothing personalised yet."
          onPress={handleCategoryPress}
          theme={theme}
        />
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

  const nameBlock = (
    <>
      {/* Simulated gradient: three overlapping layers that fade to dark at the bottom */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 70, backgroundColor: 'rgba(0,0,0,0.08)' }} />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 52, backgroundColor: 'rgba(0,0,0,0.22)' }} />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 38, backgroundColor: 'rgba(0,0,0,0.38)' }} />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 10 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFF' }}>{category.name}</Text>
      </View>
    </>
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
          style={{ flex: 1 }}
          imageStyle={{ borderRadius: 14 }}
        >
          {nameBlock}
        </ImageBackground>
      ) : (
        <View style={{ flex: 1, backgroundColor: theme.colors.primaryTint }}>
          {nameBlock}
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
  });
