import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator
} from 'react-native';
import { supabase } from '../../../lib/supabase';
import { searchService } from '../../../services/searchService';
import { listingService } from '../../../services/listingService';
import burgundyTheme from '../../theme/burgundyTheme';

const { width } = Dimensions.get('window');

interface SearchResult {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  date: string;
  time: string;
  location: string;
  price: string | number;
  attendees: number;
  rating: number;
  category: string;
  organizer: string;
  isVerified?: boolean;
}

export default function Dash({ onItemClick }) {
  const router = useRouter();
  const [collections, setCollections] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<SearchResult[]>([]);
  const [favoritePlaces, setFavoritePlaces] = useState<SearchResult[]>([]);
  const [recentlyVisited, setRecentlyVisited] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [allListings, setAllListings] = useState<SearchResult[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch categories for collections
      await fetchCategories();
      // Fetch listings from service
      await fetchListings();
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .limit(4);

      if (error) throw error;

      const formattedCollections = data.map((category, index) => ({
        id: index + 1,
        title: category.name,
        description: category.description || 'Collection of curated picks',
        count: 12,
        image: category.image_url,
      }));

      setCollections(formattedCollections);
    } catch (err) {
      console.error('Error fetching categories:', err);
      // Fallback to default collections if fetch fails
      setCollections([
        {
          id: 1,
          title: 'LSK Nightlife',
          description: 'Your favorite after-dark spots',
          count: 12,
          image: require('../../../assets/images/icon.png'),
        },
        {
          id: 2,
          title: 'favorite nshima spots',
          description: 'Delicious discoveries',
          count: 18,
          image: require('../../../assets/images/icon.png'),
        },
        {
          id: 3,
          title: 'Weekend Escapes',
          description: 'Perfect getaway spots',
          count: 8,
          image: require('../../../assets/images/icon.png'),
        },
        {
          id: 4,
          title: 'zambian Arts & Culture',
          description: 'Creative experiences',
          count: 15,
          image: require('../../../assets/images/icon.png'),
        },
      ]);
    }
  };

  const fetchListings = async () => {
    try {
      // Fetch listings from service
      const listings = await listingService.fetchListings({
        pagination: { page: 1, pageSize: 50 },
      });

      // Convert listings to SearchResult format
      const searchResults: SearchResult[] = listings.map((listing, idx) => {
        const imageUrls = [
          'https://images.unsplash.com/photo-1578321272176-852e6aa3a76e?w=400&h=400&fit=crop',
          'https://images.unsplash.com/photo-1552820728-8ac41f1ce891?w=400&h=400&fit=crop',
          'https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=400&h=400&fit=crop',
          'https://images.unsplash.com/photo-1531746790731-6c087fecd65b?w=400&h=400&fit=crop',
          'https://images.unsplash.com/photo-1478268413698-81f0f2de5bcc?w=400&h=400&fit=crop',
          'https://images.unsplash.com/photo-1514395462716-a3dec6deba34?w=400&h=400&fit=crop',
          'https://images.unsplash.com/photo-1517457373614-b7152f800fd1?w=400&h=400&fit=crop',
          'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=400&fit=crop',
          'https://images.unsplash.com/photo-1577720643272-265f434f6408?w=400&h=400&fit=crop',
        ];

        return {
          id: listing.id,
          title: listing.title,
          description: listing.description || 'Event or listing',
          imageUrl: imageUrls[idx % imageUrls.length],
          date: listing.listing_type === 'event' ? `Friday, Nov ${21 + idx}` : '',
          time: listing.listing_type === 'event' ? 'All Day' : '',
          location: listing.listing_type === 'event' ? 'Lusaka' : listing.title,
          price: listing.price || '0',
          attendees: 100 + idx * 10,
          rating: 4.2 + (idx % 5) * 0.2,
          category: listing.listing_type,
          organizer: 'ODINI',
          isVerified: idx % 2 === 0,
        };
      });

      setAllListings(searchResults);
      setUpcomingEvents(searchResults.slice(0, 3).filter(r => r.category === 'event'));
      setFavoritePlaces(searchResults.slice(3, 8));
      setRecentlyVisited(searchResults.slice(0, 3));
    } catch (err) {
      console.error('Error fetching listings:', err);
      // Use default data if fetch fails
      const defaultItems: SearchResult[] = [];
      setUpcomingEvents(defaultItems);
      setFavoritePlaces(defaultItems);
      setRecentlyVisited(defaultItems);
    }
  };

  const handleShowAll = (sectionId: string, items: SearchResult[]) => {
    setExpandedSection(sectionId);
    onItemClick?.({ id: sectionId, title: sectionId, items });
  };

  const getDisplayItems = (items: SearchResult[], sectionId: string) => {
    if (expandedSection === sectionId) {
      return items;
    }
    return items.slice(0, 3);
  };

  const renderCollectionCard = (collection) => {
    {
      id: '1',
      title: 'ZAMBIAN ART AND DESIGN SHOW',
      description: 'Experience the finest Zambian art and design at CIELA.',
      imageUrl: 'https://images.unsplash.com/photo-1578321272176-852e6aa3a76e?w=400&h=400&fit=crop',
      date: 'Friday, Nov 21',
      time: 'All Day',
      location: 'CIELA',
      price: 'From K100',
      attendees: 189,
      rating: 4.6,
      category: 'Art',
      organizer: 'CIELA',
      isVerified: true,
    },
    {
      id: '2',
      title: 'LUSAKA THRIFT MARKET & BLOCK PARTY',
      description: 'Join the thrift market and block party.',
      imageUrl: 'https://images.unsplash.com/photo-1552820728-8ac41f1ce891?w=400&h=400&fit=crop',
      date: 'Saturday, TBA',
      time: 'All Day',
      location: 'NGAGRES MALL',
      price: 'K50',
      attendees: 312,
      rating: 4.4,
      category: 'Shopping',
      organizer: 'Sampa the Great',
      isVerified: false,
    },
    {
      id: '3',
      title: '15TH LUSAKA MOTOR SHOW',
      description: 'Zambia\'s biggest motor show featuring vehicles.',
      imageUrl: 'https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=400&h=400&fit=crop',
      date: 'Friday, Aug 29',
      time: 'All Day',
      location: 'LUSAKA POLO CLUB',
      price: '100',
      attendees: 567,
      rating: 4.7,
      category: 'Automotive',
      organizer: 'Professional Insurance',
      isVerified: true,
    },
  ];

  const favoritePlaces: SearchResult[] = [
    {
      id: '4',
      title: 'MAZABUKA AGRI EXPO',
      description: 'Agricultural exposition powered by Professional Insurance.',
      imageUrl: 'https://images.unsplash.com/photo-1531746790731-6c087fecd65b?w=400&h=400&fit=crop',
      date: 'Friday, Oct 10',
      time: 'All Day',
      location: 'MAZABUKA TURF CLUB',
      price: '50',
      attendees: 423,
      rating: 4.5,
      category: 'Business',
      organizer: 'Professional Insurance',
      isVerified: true,
    },
    {
      id: '5',
      title: 'CLASSIC CARS AUTO SHOW 2025',
      description: 'Classic car exhibition featuring exclusive market.',
      imageUrl: 'https://images.unsplash.com/photo-1552820728-8ac41f1ce891?w=400&h=400&fit=crop',
      date: 'Sunday, Aug 24',
      time: '9:30 AM onwards',
      location: 'TBA',
      price: '50',
      attendees: 278,
      rating: 4.3,
      category: 'Automotive',
      organizer: 'Classic Cars Zambia',
      isVerified: false,
    },
    {
      id: '6',
      title: 'EL MUKUKA\'S ALBUM LAUNCH',
      description: 'Experience El Mukuka\'s album launch with live performance.',
      imageUrl: 'https://images.unsplash.com/photo-1478268413698-81f0f2de5bcc?w=400&h=400&fit=crop',
      date: 'Saturday, Dec 6',
      time: '7:00 PM - 1:00 AM',
      location: 'TBA',
      price: '200',
      attendees: 156,
      rating: 4.8,
      category: 'Music',
      organizer: 'Stella Artois',
      isVerified: false,
    },
    {
      id: '7',
      title: 'Stories in the Woods',
      description: 'Interactive story experience for children ages 6 to 10.',
      imageUrl: 'https://images.unsplash.com/photo-1514395462716-a3dec6deba34?w=400&h=400&fit=crop',
      date: 'Saturday, Nov 22',
      time: '9:00 AM - 12:00 PM',
      location: 'Chirfwema Arboretum',
      price: '500',
      attendees: 89,
      rating: 4.9,
      category: 'Education',
      organizer: 'Stories with Sala',
      isVerified: true,
    },
    {
      id: '8',
      title: 'GREEN COSMOS - KEEP ZAMBIA CLEAN',
      description: 'Community clean-up initiative with special guest.',
      imageUrl: 'https://images.unsplash.com/photo-1517457373614-b7152f800fd1?w=400&h=400&fit=crop',
      date: 'Friday, Nov 7',
      time: 'All Day',
      location: 'Kaunda Square Stage 1 Market',
      price: 'Free',
      attendees: 234,
      rating: 4.7,
      category: 'Community',
      organizer: 'Green Cosmos Zambia',
      isVerified: true,
    },
  ];

  const recentlyVisited: SearchResult[] = [
    {
      id: '9',
      title: 'RENPOWER ZAMBIA 2025',
      description: '3rd edition energy conference.',
      imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=400&fit=crop',
      date: 'Friday, Jul 11',
      time: 'All Day',
      location: 'Lusaka, Zambia',
      price: 'TBA',
      attendees: 345,
      rating: 4.6,
      category: 'Business',
      organizer: 'Euroconvention Global',
      isVerified: true,
    },
    {
      id: '10',
      title: 'YOUTH CONNEKT ZAMBIA - GREEN HUSTLE',
      description: 'Youth entrepreneurship and innovation in agriculture.',
      imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=400&fit=crop',
      date: 'Monday, Nov 17',
      time: 'All Day',
      location: 'New Government Complex, Lusaka',
      price: 'Free',
      attendees: 512,
      rating: 4.5,
      category: 'Business',
      organizer: 'Ministry of Youth, Sport & Arts',
      isVerified: true,
    },
    {
      id: '11',
      title: 'BOUNCE ZAMBIA',
      description: 'The ultimate trampoline park experience.',
      imageUrl: 'https://images.unsplash.com/photo-1577720643272-265f434f6408?w=400&h=400&fit=crop',
      date: '',
      time: 'All Day',
      location: 'Garden City Mall, Lusaka',
      price: '150',
      attendees: 300,
      rating: 4.9,
      category: 'Recreation',
      organizer: 'Bounce Zambia',
      isVerified: false,
    },
  ];



  const renderCollectionCard = (collection) => {
    const imageSource = collection.image
      ? (typeof collection.image === 'string'
          ? { uri: collection.image }
          : collection.image)
      : null;

    return (
      <TouchableOpacity
        key={collection.id}
        style={styles.collectionCard}
        activeOpacity={0.8}
      >
        {imageSource && (
          <Image source={imageSource} style={styles.collectionImage} />
        )}
        <View style={[styles.collectionOverlay, !imageSource && { backgroundColor: burgundyTheme.colors.primary }]} />
        <View style={styles.collectionContent}>
          <Text style={styles.collectionTitle}>{collection.title}</Text>
          <Text style={styles.collectionDesc}>{collection.description}</Text>
          <Text style={styles.collectionCount}>{collection.count} places</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEventCard = (event: SearchResult) => (
    <TouchableOpacity
      key={event.id}
      style={styles.eventCard}
      onPress={() => onItemClick?.(event)}
      activeOpacity={0.7}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: event.imageUrl }} style={styles.eventImage} />
        <View style={styles.imageOverlay} />
      </View>
      {event.date && (
        <View style={styles.eventDateBadge}>
          <Text style={styles.eventDateText}>{event.date}</Text>
        </View>
      )}
      <View style={styles.eventInfo}>
        <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
        <View style={styles.eventLocation}>
          <MaterialCommunityIcons name="map-marker" size={10} color={burgundyTheme.colors.textMuted} />
          <Text style={styles.eventLocationText} numberOfLines={1}>
            {event.location}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderPlaceCard = (place: SearchResult) => (
    <TouchableOpacity
      key={place.id}
      style={styles.placeCard}
      onPress={() => onItemClick?.(place)}
      activeOpacity={0.7}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: place.imageUrl }} style={styles.placeImage} />
        <View style={styles.imageOverlay} />
      </View>
      {place.isVerified && (
        <View style={styles.verifiedBadge}>
          <MaterialCommunityIcons name="check-circle" size={14} color="#0066cc" />
        </View>
      )}
      <View style={styles.placeInfo}>
        <Text style={styles.placeTitle} numberOfLines={2}>{place.title}</Text>
        <View style={styles.placeRating}>
          <MaterialCommunityIcons name="star" size={10} color={burgundyTheme.colors.primary} />
          <Text style={styles.ratingText}>{place.rating}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={burgundyTheme.colors.primary} />
        </View>
      ) : (
        <>
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <View style={styles.heroContent}>
          <Text style={styles.heroSubtitle}>Your holiday starter pack</Text>
          <Text style={styles.heroTitle}>hello Alex</Text>
        </View>
      </View>

      {/* Collections */}
      <View style={styles.section}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.collectionsContainer}
        >
          {collections.map(renderCollectionCard)}
        </ScrollView>
      </View>

      {/* Recently Visited */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recently Visited</Text>
          {recentlyVisited.length > 3 && (
            <TouchableOpacity onPress={() => handleShowAll('show-all-recent', recentlyVisited)}>
              <Text style={styles.showAllText}>{expandedSection === 'show-all-recent' ? 'Show less' : 'Show all'}</Text>
            </TouchableOpacity>
          )}
        </View>
        <ScrollView
          horizontal={expandedSection !== 'show-all-recent'}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={expandedSection !== 'show-all-recent' ? styles.recentContainer : styles.expandedContainer}
          scrollEnabled={expandedSection !== 'show-all-recent'}
        >
          {getDisplayItems(recentlyVisited, 'show-all-recent').map((place) => (
            <TouchableOpacity
              key={place.id}
              style={styles.recentCard}
              onPress={() => onItemClick?.(place)}
              activeOpacity={0.7}
            >
              <View style={styles.imageContainer}>
                <Image source={{ uri: place.imageUrl }} style={styles.recentImage} />
                <View style={styles.imageOverlay} />
              </View>
              <View style={styles.recentInfo}>
                <Text style={styles.recentTitle} numberOfLines={2}>
                  {place.title}
                </Text>
                <View style={styles.recentLocation}>
                  <MaterialCommunityIcons name="map-marker" size={10} color={burgundyTheme.colors.textMuted} />
                  <Text style={styles.recentLocationText} numberOfLines={1}>
                    {place.location}
                  </Text>
                </View>
                <View style={styles.recentRating}>
                  <MaterialCommunityIcons name="star" size={10} color={burgundyTheme.colors.primary} />
                  <Text style={styles.recentRatingText}>{place.rating}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Coming Up Next */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Coming Up Next</Text>
            <Text style={styles.sectionSubtitle}>Your scheduled adventures</Text>
          </View>
          {upcomingEvents.length > 3 && (
            <TouchableOpacity onPress={() => handleShowAll('show-all-events', upcomingEvents)}>
              <Text style={styles.showAllText}>{expandedSection === 'show-all-events' ? 'Show less' : 'View all'}</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={expandedSection === 'show-all-events' ? styles.expandedGrid : styles.eventGrid}>
          {getDisplayItems(upcomingEvents, 'show-all-events').map(renderEventCard)}
        </View>
      </View>

      {/* Your Top Places */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Your Top Places</Text>
            <Text style={styles.sectionSubtitle}>Most visited this month</Text>
          </View>
          {favoritePlaces.length > 3 && (
            <TouchableOpacity onPress={() => handleShowAll('show-all-places', favoritePlaces)}>
              <Text style={styles.showAllText}>{expandedSection === 'show-all-places' ? 'Show less' : 'See more'}</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={expandedSection === 'show-all-places' ? styles.expandedGrid : styles.placeGrid}>
          {getDisplayItems(favoritePlaces, 'show-all-places').map(renderPlaceCard)}
        </View>
      </View>

      {/* Made For You */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Made For You</Text>
        <Text style={styles.sectionSubtitle}>Personalized recommendations</Text>
        <View style={styles.placeGrid}>
          {[...upcomingEvents.slice(0, 2), ...favoritePlaces.slice(0, 3)].map(
            renderPlaceCard,
          )}
        </View>
      </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: burgundyTheme.colors.background,
  },
  heroSection: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: burgundyTheme.colors.border,
  },
  heroContent: {
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 12,
    color: burgundyTheme.colors.textMuted,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: burgundyTheme.colors.text,
  },
  section: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: burgundyTheme.colors.text,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: burgundyTheme.colors.textMuted,
    marginTop: 2,
  },
  showAllText: {
    fontSize: 13,
    color: burgundyTheme.colors.primary,
    fontWeight: '600',
  },
  collectionsContainer: {
    paddingRight: 16,
    gap: 12,
  },
  collectionCard: {
    width: 260,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: burgundyTheme.colors.surface,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  collectionImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  collectionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  collectionContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  collectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  collectionDesc: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  collectionCount: {
    fontSize: 12,
    color: '#fff',
    marginTop: 8,
  },
  recentContainer: {
    paddingRight: 16,
    gap: 12,
  },
  recentCard: {
    width: 130,
    backgroundColor: burgundyTheme.colors.surface,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: burgundyTheme.colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  recentImage: {
    width: '100%',
    height: 70,
  },
  recentInfo: {
    padding: 6,
  },
  recentTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: burgundyTheme.colors.text,
    marginBottom: 3,
  },
  recentLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 2,
  },
  recentLocationText: {
    fontSize: 10,
    color: burgundyTheme.colors.textMuted,
    flex: 1,
  },
  recentRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  recentRatingText: {
    fontSize: 10,
    color: burgundyTheme.colors.text,
  },
  eventGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  eventCard: {
    width: '22%',
    backgroundColor: burgundyTheme.colors.surface,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: burgundyTheme.colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  eventImage: {
    width: '100%',
    height: 90,
  },
  eventDateBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: burgundyTheme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  eventDateText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  eventInfo: {
    padding: 8,
  },
  eventTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: burgundyTheme.colors.text,
    marginBottom: 4,
  },
  eventLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  eventLocationText: {
    fontSize: 9,
    color: burgundyTheme.colors.textMuted,
    flex: 1,
  },
  placeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  placeCard: {
    width: '22%',
    backgroundColor: burgundyTheme.colors.surface,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: burgundyTheme.colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  placeImage: {
    width: '100%',
    height: 90,
  },
  verifiedBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#0066cc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeInfo: {
    padding: 8,
  },
  placeTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: burgundyTheme.colors.text,
    marginBottom: 4,
  },
  placeRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 10,
    color: burgundyTheme.colors.text,
  },
  imageContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
});
