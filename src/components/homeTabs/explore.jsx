import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { getListingById, getListings } from "../../../services/listings.service";
import ExploreCard from '../ExploreCard';
import EventDetail from '../details/EventDetail';
import OfferingDetail from '../details/OfferingDetail';
import StayDetail from '../details/StayDetail';

export default function Explore({ onItemClick }) {
	const [listings, setListings] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [selectedListing, setSelectedListing] = useState(null);
	const [detailsType, setDetailsType] = useState(null);
	const detailRequestRef = useRef(null);

	useEffect(() => {
		loadListings();
	}, []);

	const loadListings = async () => {
		try {
			setLoading(true);
			setError(null);
			console.log('Starting to fetch listings...');
			const data = await getListings();
			console.log('Listings received:', data);
			if (!data || data.length === 0) {
				setError('No listings available');
				setListings([]);
			} else {
				setListings(data);
			}
		} catch (err) {
			console.error('Error loading listings:', err);
			setError(err instanceof Error ? err.message : 'Failed to load listings');
		} finally {
			setLoading(false);
		}
	};

	const handleCardPress = async (listing) => {
		detailRequestRef.current = listing.id;
		setSelectedListing(listing);
		setDetailsType(listing.listing_type);
		onItemClick?.(listing);

		try {
			const detailedListing = await getListingById(listing.id);
			if (detailRequestRef.current !== listing.id) return;
			setSelectedListing(detailedListing);
			onItemClick?.(detailedListing);
		} catch (error) {
			console.error('Error loading listing details:', error);
		}
	};

	const handleCloseDetails = () => {
		detailRequestRef.current = null;
		setSelectedListing(null);
		setDetailsType(null);
	};

	if (loading) {
		return (
			<View style={styles.centerContainer}>
				<ActivityIndicator size="large" color="#4A90E2" />
			</View>
		);
	}

	if (error) {
		return (
			<View style={styles.centerContainer}>
				<Text style={styles.errorText}>{error}</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Explore</Text>
			<FlatList
				data={listings}
				numColumns={2}
				key="explore-grid"
				keyExtractor={(item) => item.id}
				renderItem={({ item }) => (
					<ExploreCard item={item} onPress={() => handleCardPress(item)} />
				)}
				contentContainerStyle={styles.gridContent}
				showsVerticalScrollIndicator={false}
			/>

			{/* Detail Modals */}
			{selectedListing && detailsType === 'stay' && (
				<StayDetail listing={selectedListing} onClose={handleCloseDetails} />
			)}
			{selectedListing && detailsType === 'event' && (
				<EventDetail listing={selectedListing} onClose={handleCloseDetails} />
			)}
			{selectedListing && detailsType === 'offering' && (
				<OfferingDetail listing={selectedListing} onClose={handleCloseDetails} />
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#FFF' },
	centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
	title: { fontSize: 28, fontWeight: '700', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
	gridContent: { paddingHorizontal: 6, paddingVertical: 8 },
	errorText: { fontSize: 16, color: '#FF3B30', fontWeight: '500' },
});
