import { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import FilterPopup from '../../src/components/FilterPopup';
import ListingGridWithDetails from '../../src/components/shared/ListingGridWithDetails';
import { searchService } from '../../src/services/searchService';
import { useAppMode } from '../../src/context/AppModeContext';

export default function SearchResultsPage() {
  const router = useRouter();
  const { theme } = useAppMode();
  const styles = getStyles(theme);
  const params = useLocalSearchParams();
  const [queryInput, setQueryInput] = useState(params.query || '');
  const [searchTerm, setSearchTerm] = useState(params.query || '');
  const [activeCategory, setActiveCategory] = useState(
    params.categoryId ? { id: params.categoryId, name: params.categoryName || 'Category' } : null
  );
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ type: null, price_min: null, price_max: null, active: true });
  const [showFilter, setShowFilter] = useState(false);

  useEffect(() => {
    if (params.categoryId && params.categoryId !== activeCategory?.id) {
      setActiveCategory({ id: params.categoryId, name: params.categoryName || 'Category' });
      setQueryInput('');
      setSearchTerm('');
    }
  }, [params.categoryId, params.categoryName, activeCategory?.id]);

  useEffect(() => {
    if (params.query !== undefined && params.query !== searchTerm) {
      setActiveCategory(null);
      setSearchTerm(params.query);
      setQueryInput(params.query);
    }
  }, [params.query, searchTerm]);

  useEffect(() => {
    let isActive = true;

    const loadResults = async () => {
      setLoading(true);
      setError('');

      try {
        let data = [];
        if (activeCategory?.id) {
          const res = await searchService.searchByCategory(activeCategory.id, { page: 1, page_size: 60 });
          data = res.listings || [];
        } else {
          const res = await searchService.searchListings({
            query: searchTerm,
            listing_type: filters.type || undefined,
            min_price: filters.price_min ?? undefined,
            max_price: filters.price_max ?? undefined,
            is_active: filters.active ?? true,
            page: 1,
            page_size: 60,
          });
          data = res.listings || [];
        }

        const filtered = applyClientFilters(data, filters);
        if (isActive) {
          setListings(filtered);
        }
      } catch (err) {
        console.error('Error loading search results:', err);
        if (isActive) {
          setError(err instanceof Error ? err.message : 'Failed to load listings');
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadResults();

    return () => {
      isActive = false;
    };
  }, [activeCategory?.id, searchTerm, filters.type, filters.price_min, filters.price_max, filters.active]);

  const handleSearchSubmit = () => {
    const trimmed = queryInput.trim();
    setActiveCategory(null);
    setSearchTerm(trimmed);
    router.replace({
      pathname: '/search/results',
      params: trimmed ? { query: trimmed } : {},
    });
  };

  const handleApplyFilters = (applied) => {
    setFilters(applied);
    setShowFilter(false);
  };

  const headerLabel = activeCategory
    ? `Results for ${activeCategory.name}`
    : searchTerm
      ? `Results for "${searchTerm}"`
      : 'Search results';

  const emptyMessage = activeCategory
    ? 'No listings match this category yet.'
    : 'No listings match your search yet.';

  return (
    <View style={styles.page}>
      <View style={styles.topSearch}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search stays, events, activities..."
          value={queryInput}
          onChangeText={setQueryInput}
          returnKeyType="search"
          onSubmitEditing={handleSearchSubmit}
          placeholderTextColor={theme.colors.textSubtle}
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearchSubmit}>
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilter(true)}>
          <Text style={styles.filterBtnText}>Filters</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>{headerLabel}</Text>
        <Text style={styles.resultsMeta}>{listings.length} listings</Text>
      </View>

      <ListingGridWithDetails
        listings={listings}
        loading={loading}
        error={error}
        emptyMessage={emptyMessage}
        contentContainerStyle={styles.gridContent}
      />

      <FilterPopup
        visible={showFilter}
        onClose={() => setShowFilter(false)}
        onApply={handleApplyFilters}
        initialFilters={filters}
      />
    </View>
  );
}

function applyClientFilters(items, filters) {
  return items.filter((listing) => {
    if (filters.type && listing.listing_type !== filters.type) {
      return false;
    }
    if (filters.price_min != null && listing.price < filters.price_min) {
      return false;
    }
    if (filters.price_max != null && listing.price > filters.price_max) {
      return false;
    }
    if (filters.active && listing.is_active === false) {
      return false;
    }
    return true;
  });
}

const getStyles = (theme) => StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  topSearch: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    margin: 12,
    marginBottom: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow,
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceAlt,
    paddingHorizontal: 12,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 12,
    height: 44,
  },
  searchBtnText: {
    color: theme.colors.white,
    fontWeight: '700',
  },
  filterBtn: {
    backgroundColor: theme.colors.primaryTint,
    borderColor: theme.colors.primary,
    borderWidth: 1,
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRadius: 12,
    height: 44,
  },
  filterBtnText: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  resultsMeta: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  gridContent: {
    paddingHorizontal: 6,
    paddingBottom: 16,
  },
});
