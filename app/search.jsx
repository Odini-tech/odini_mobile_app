import { LinearGradient } from 'expo-linear-gradient';
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

import { useAppData } from '../src/context/AppDataContext';
import { useAppMode } from '../src/context/AppModeContext';
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
          placeholder="Search stays, events, activities..."
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
    return (
      <Text
        style={{
          fontSize: 14,
          color: theme.colors.textMuted,
          paddingHorizontal: 16,
          marginTop: 8,
        }}
      >
        {fallbackText}
      </Text>
    );
  }
  return (
    <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
      {categories.map((category, index) => (
        <CategoryTile
          key={category.id}
          category={category}
          theme={theme}
          corner={index % 2 === 0 ? 'left' : 'right'}
          onPress={() => onPress(category)}
        />
      ))}
    </View>
  );
}

function CategoryTile({ category, onPress, theme, corner }) {
  const hasImage = !!category.image_url;
  const isLeft = corner === 'left';
  const textSideStyle = isLeft
    ? { left: 16, alignItems: 'flex-start' }
    : { right: 16, alignItems: 'flex-end' };

  const nameBlock = (
    <View style={[styles.nameWrap, textSideStyle]}>
      <Text style={styles.nameText} numberOfLines={2}>
        {category.name}
      </Text>
    </View>
  );

  return (
    <TouchableOpacity
      style={{
        width: '100%',
        aspectRatio: 2.5,
        borderRadius: 14,
        marginBottom: 12,
        overflow: 'hidden',
        backgroundColor: theme.colors.surfaceAlt,
      }}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {hasImage ? (
        <ImageBackground
          source={{ uri: category.image_url }}
          style={{ flex: 1 }}
          imageStyle={{ borderRadius: 14 }}
        >
          {/* Shadowy gradient overlay */}
          <LinearGradient
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            colors={[
              'rgba(0,0,0,0.35)',
              'rgba(0,0,0,0.08)',
              'rgba(0,0,0,0)',
              'rgba(0,0,0,0.75)',
            ]}
            locations={[0, 0.08, 0.55, 1]}
            style={[StyleSheet.absoluteFillObject, { borderRadius: 14 }]}
          />
          {nameBlock}
        </ImageBackground>
      ) : (
        <View style={{ flex: 1, backgroundColor: theme.colors.primaryTint }}>
          <LinearGradient
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            colors={[
              'rgba(0, 0, 0, 0.82)',
              'rgba(0, 0, 0, 0.88)',
              'rgba(0, 0, 0, 0.78)',
              'rgba(0, 0, 0, 0.9)',
            ]}
            locations={[0, 0.08, 0.6, 1]}
            style={[StyleSheet.absoluteFillObject, { borderRadius: 14 }]}
          />
          {nameBlock}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  nameWrap: {
    position: 'absolute',
    bottom: 12,
    maxWidth: '62%',
  },
  nameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});

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
      backgroundColor: theme.colors.buttonBg,
      paddingHorizontal: 10,
      justifyContent: 'center',
      borderRadius: 3,
      height: 44,
    },
    searchBtnText: {
      color: theme.colors.buttonText,
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