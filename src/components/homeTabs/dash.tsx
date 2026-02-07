import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function Dash({ onItemClick }) {
	const dummy = { id: 'dash-1', title: 'Dash — Coming Soon' };

	return (
		<View style={styles.container}>
			<Text style={styles.title}>DASH</Text>
			<Text style={styles.sub}>Coming soon</Text>

			<TouchableOpacity style={styles.card} onPress={() => onItemClick?.(dummy)}>
				<Text style={styles.cardText}>Preview content — tap to activate tab</Text>
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center' },
	title: { fontSize: 28, fontWeight: '700', marginBottom: 8 },
	sub: { fontSize: 16, color: '#65676B', marginBottom: 16 },
	card: { width: '90%', padding: 16, borderRadius: 8, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E5EA' },
	cardText: { color: '#333', fontWeight: '600' },
});