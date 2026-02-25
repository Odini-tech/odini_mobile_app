import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useSegments } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function BottomNav({ onHomePress = () => {}, onListingsPress = () => {}, onSearchPress = () => {}, onProfilePress = () => {}, onSignOutPress = () => {} }) {
  const segments = useSegments();
  const isActive = (name) => {
    if (!segments || segments.length === 0) return name === 'home';
    return segments.includes(name);
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.button, isActive('home') && styles.buttonActive]}
        onPress={onHomePress}
        accessibilityRole="button"
        accessibilityLabel="Open home"
      >
        <Ionicons name="home-outline" size={24} color={isActive('home') ? '#4A90E2' : '#222'} />
        <Text style={[styles.label, isActive('home') && styles.labelActive]}>Home</Text>
      </Pressable>

      <Pressable
        style={[styles.button, isActive('listings') && styles.buttonActive]}
        onPress={onListingsPress}
        accessibilityRole="button"
        accessibilityLabel="Open listings"
      >
        <Ionicons name="list-outline" size={24} color={isActive('listings') ? '#4A90E2' : '#222'} />
        <Text style={[styles.label, isActive('listings') && styles.labelActive]}>Listings</Text>
      </Pressable>

      <Pressable
        style={[styles.button, isActive('search') && styles.buttonActive]}
        onPress={onSearchPress}
        accessibilityRole="button"
        accessibilityLabel="Open search"
      >
        <Ionicons name="search-outline" size={24} color={isActive('search') ? '#4A90E2' : '#222'} />
        <Text style={[styles.label, isActive('search') && styles.labelActive]}>Search</Text>
      </Pressable>

      <Pressable
        style={[styles.button, isActive('profile') && styles.buttonActive]}
        onPress={onProfilePress}
        accessibilityRole="button"
        accessibilityLabel="Open profile"
      >
        <Ionicons name="person" size={24} color={isActive('profile') ? '#4A90E2' : '#222'} />
        <Text style={[styles.label, isActive('profile') && styles.labelActive]}>Profile</Text>
      </Pressable>

      <Pressable
        style={styles.button}
        onPress={onSignOutPress}
        accessibilityRole="button"
        accessibilityLabel="Sign out"
      >
        <MaterialIcons name="logout" size={24} color="#222" />
        <Text style={styles.label}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ddd',
    backgroundColor: '#fff',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonActive: {
    backgroundColor: '#E8F4FF',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  label: {
    fontSize: 12,
    color: '#333',
    marginTop: 4,
  },
  labelActive: {
    color: '#4A90E2',
    fontWeight: '700',
  },
});