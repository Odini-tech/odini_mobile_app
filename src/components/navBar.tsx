import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
	ActivityIndicator,
	Modal,
	SafeAreaView,
	ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { searchService } from '../../src/services/searchService';
import burgundyTheme, { getListingTypeColor } from '../theme/burgundyTheme';

interface NavBarProps {
	showSearch?: boolean;
	onSearchPress?: () => void;
	searchPlaceholder?: string;
}

export default function NavBar({ showSearch = true, onSearchPress, searchPlaceholder = 'Search listings...' }: NavBarProps) {
	const router = useRouter();
	const [searchQuery, setSearchQuery] = useState('');
	const [showSearchModal, setShowSearchModal] = useState(false);
	const [isSearching, setIsSearching] = useState(false);
	const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);

	const handleSearchInput = async (text: string) => {
		setSearchQuery(text);

		if (text.trim().length > 2) {
			setIsSearching(true);
			try {
				const results = await searchService.searchListings({
					query: text,
					page_size: 5,
				});
				setSearchSuggestions(results.listings);
			} catch (error) {
				console.error('Search error:', error);
				setSearchSuggestions([]);
			} finally {
				setIsSearching(false);
			}
		} else {
			setSearchSuggestions([]);
		}
	};

	const handleSearchSubmit = async () => {
		if (searchQuery.trim()) {
			setShowSearchModal(false);
			setSearchQuery('');
			setSearchSuggestions([]);
      
			// Navigate to search page or call custom handler
			if (onSearchPress) {
				onSearchPress();
			} else {
				router.push('/search');
			}
		}
	};

	const handleSearchFocus = () => {
		setShowSearchModal(true);
	};

	const handleSuggestionPress = (listing: any) => {
		setShowSearchModal(false);
		setSearchQuery('');
		setSearchSuggestions([]);
		// Navigate to listing detail
		router.push(`/listings/${listing.id}`);
	};

	return (
		<>
			<SafeAreaView style={styles.container} edges={['top']}>
				<View style={styles.navContent}>
					{/* Logo/Brand */}
					<TouchableOpacity onPress={() => router.push('/')}>
						<Text style={styles.logo}>Odini</Text>
					</TouchableOpacity>

					{/* Search Bar */}
					{showSearch && (
						<TouchableOpacity
							style={styles.searchBarContainer}
							onPress={handleSearchFocus}
							activeOpacity={0.8}
						>
							<Ionicons name="search" size={18} color={burgundyTheme.colors.textSubtle} />
							<Text style={styles.searchPlaceholder}>{searchPlaceholder}</Text>
						</TouchableOpacity>
					)}

					{/* Right Icons */}
					<View style={styles.rightIcons}>
						<TouchableOpacity style={styles.iconButton} onPress={() => router.push('/search')}>
							<Ionicons name="search-outline" size={22} color={burgundyTheme.colors.text} />
						</TouchableOpacity>
						<TouchableOpacity style={styles.iconButton} onPress={() => router.push('/notifications')}>
							<Ionicons name="notifications-outline" size={24} color={burgundyTheme.colors.text} />
							<View style={styles.badge}>
								<Text style={styles.badgeText}>3</Text>
							</View>
						</TouchableOpacity>

						<TouchableOpacity style={styles.iconButton} onPress={() => router.push('/profile')}>
							<Ionicons name="person-circle-outline" size={24} color={burgundyTheme.colors.text} />
						</TouchableOpacity>
					</View>
				</View>
			</SafeAreaView>

			{/* Search Modal */}
			<Modal
				visible={showSearchModal}
				animationType="fade"
				transparent
				onRequestClose={() => setShowSearchModal(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						{/* Modal Search Bar */}
						<View style={styles.modalSearchContainer}>
							<TouchableOpacity
								onPress={() => setShowSearchModal(false)}
								style={styles.closeButton}
							>
								<Ionicons name="close" size={24} color={burgundyTheme.colors.text} />
							</TouchableOpacity>

							<View style={styles.modalSearchInput}>
								<Ionicons name="search" size={20} color={burgundyTheme.colors.primary} />
								<TextInput
									style={styles.textInput}
									placeholder="Search listings, events, activities..."
									value={searchQuery}
									onChangeText={handleSearchInput}
									placeholderTextColor={burgundyTheme.colors.textSubtle}
									autoFocus
								/>
								{searchQuery.length > 0 && (
									<TouchableOpacity onPress={() => setSearchQuery('')}>
										<Ionicons name="close-circle" size={20} color={burgundyTheme.colors.textSubtle} />
									</TouchableOpacity>
								)}
							</View>

							<TouchableOpacity
								style={[styles.searchButton, !searchQuery.trim() && styles.searchButtonDisabled]}
								onPress={handleSearchSubmit}
								disabled={!searchQuery.trim()}
							>
								<Text style={styles.searchButtonText}>Go</Text>
							</TouchableOpacity>
						</View>

						{/* Search Suggestions */}
						{isSearching ? (
							<View style={styles.loadingContainer}>
								<ActivityIndicator size="large" color={burgundyTheme.colors.primary} />
							</View>
						) : searchSuggestions.length > 0 ? (
							<ScrollView
								style={styles.suggestionsContainer}
								scrollEventThrottle={16}
								showsVerticalScrollIndicator={false}
							>
								<Text style={styles.suggestionsTitle}>Quick Results</Text>
								{searchSuggestions.map((listing) => (
									<TouchableOpacity
										key={listing.id}
										style={styles.suggestionItem}
										onPress={() => handleSuggestionPress(listing)}
									>
										<View style={styles.suggestionIcon}>
											<Ionicons
												name={
													listing.listing_type === 'stay'
														? 'home'
														: listing.listing_type === 'event'
															? 'calendar'
															: 'compass'
												}
												size={16}
												color={getListingTypeColor(listing.listing_type)}
											/>
										</View>
										<View style={styles.suggestionContent}>
											<Text style={styles.suggestionTitle} numberOfLines={1}>
												{listing.title}
											</Text>
											<Text style={styles.suggestionType}>
												{listing.listing_type === 'offering'
														? 'Activity'
														: listing.listing_type.charAt(0).toUpperCase() + listing.listing_type.slice(1)}
											</Text>
										</View>
										<Text style={styles.suggestionPrice}>${listing.price}</Text>
									</TouchableOpacity>
								))}
							</ScrollView>
						) : searchQuery.trim() ? (
							<View style={styles.emptyContainer}>
								<Ionicons name="search-outline" size={48} color="#DDD" />
								<Text style={styles.emptyTitle}>No results found</Text>
								<Text style={styles.emptySubtitle}>Try a different search term</Text>
							</View>
						) : (
							<View style={styles.suggestionsContainer}>
								<Text style={styles.suggestionsTitle}>Recent Searches</Text>
								<TouchableOpacity style={styles.suggestionItem}>
									<Ionicons name="time-outline" size={16} color="#999" />
									<Text style={styles.suggestionTitle}>No recent searches</Text>
								</TouchableOpacity>
							</View>
						)}
					</View>
				</View>
			</Modal>
		</>
	);
}

const styles = StyleSheet.create({
	container: {
		backgroundColor: burgundyTheme.colors.surface,
		borderBottomWidth: 1,
		borderBottomColor: burgundyTheme.colors.border,
	},
	navContent: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 12,
		paddingVertical: 12,
		gap: 12,
	},
	logo: {
		fontSize: 24,
		fontWeight: '700',
		color: burgundyTheme.colors.primary,
		width: 60,
	},
	searchBarContainer: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: burgundyTheme.colors.surfaceAlt,
		borderRadius: 24,
		paddingHorizontal: 14,
		height: 40,
		gap: 8,
		borderWidth: 1,
		borderColor: burgundyTheme.colors.border,
	},
	searchPlaceholder: {
		fontSize: 14,
		color: burgundyTheme.colors.textSubtle,
		flex: 1,
	},
	rightIcons: {
		flexDirection: 'row',
		gap: 8,
	},
	iconButton: {
		position: 'relative',
		padding: 8,
	},
	badge: {
		position: 'absolute',
		top: 0,
		right: 0,
		backgroundColor: burgundyTheme.colors.primarySoft,
		borderRadius: 10,
		width: 20,
		height: 20,
		justifyContent: 'center',
		alignItems: 'center',
	},
	badgeText: {
		color: burgundyTheme.colors.white,
		fontSize: 10,
		fontWeight: '700',
	},
	// Modal Styles
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
	},
	modalContent: {
		flex: 1,
		backgroundColor: burgundyTheme.colors.surface,
		marginTop: 0,
	},
	modalSearchContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 12,
		paddingVertical: 12,
		gap: 8,
		backgroundColor: burgundyTheme.colors.surface,
		borderBottomWidth: 1,
		borderBottomColor: burgundyTheme.colors.border,
	},
	closeButton: {
		padding: 8,
	},
	modalSearchInput: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: burgundyTheme.colors.surfaceAlt,
		borderRadius: 8,
		paddingHorizontal: 12,
		height: 40,
		gap: 8,
		borderWidth: 1,
		borderColor: burgundyTheme.colors.border,
	},
	textInput: {
		flex: 1,
		fontSize: 16,
		color: burgundyTheme.colors.text,
	},
	searchButton: {
		backgroundColor: burgundyTheme.colors.primary,
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderRadius: 6,
	},
	searchButtonDisabled: {
		backgroundColor: burgundyTheme.colors.primaryTintStrong,
	},
	searchButtonText: {
		color: burgundyTheme.colors.white,
		fontSize: 14,
		fontWeight: '600',
	},
	suggestionsContainer: {
		flex: 1,
		paddingHorizontal: 16,
		paddingVertical: 12,
	},
	suggestionsTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: burgundyTheme.colors.textSubtle,
		marginBottom: 12,
	},
	suggestionItem: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: burgundyTheme.colors.border,
		gap: 12,
	},
	suggestionIcon: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: burgundyTheme.colors.primaryTint,
		justifyContent: 'center',
		alignItems: 'center',
	},
	suggestionContent: {
		flex: 1,
	},
	suggestionTitle: {
		fontSize: 14,
		fontWeight: '500',
		color: burgundyTheme.colors.text,
	},
	suggestionType: {
		fontSize: 12,
		color: burgundyTheme.colors.textSubtle,
		marginTop: 4,
	},
	suggestionPrice: {
		fontSize: 14,
		fontWeight: '600',
		color: burgundyTheme.colors.primary,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
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
		color: burgundyTheme.colors.text,
		marginTop: 12,
	},
	emptySubtitle: {
		fontSize: 14,
		color: burgundyTheme.colors.textSubtle,
		marginTop: 8,
	},
});
