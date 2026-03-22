import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useSegments } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import burgundyTheme from '../../../src/theme/burgundyTheme';

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
        <Ionicons name="home-outline" size={24} color={isActive('home') ? burgundyTheme.colors.primary : burgundyTheme.colors.textMuted} />
        <Text style={[styles.label, isActive('home') && styles.labelActive]}>Home</Text>
      </Pressable>

      <Pressable
        style={[styles.button, isActive('listings') && styles.buttonActive]}
        onPress={onListingsPress}
        accessibilityRole="button"
        accessibilityLabel="Open listings"
      >
        <Ionicons name="chat" size={24} color={isActive('listings') ? burgundyTheme.colors.primary : burgundyTheme.colors.textMuted} />
        <Text style={[styles.label, isActive('listings') && styles.labelActive]}>Advisory</Text>
      </Pressable>

      <Pressable
        style={[styles.button, isActive('search') && styles.buttonActive]}
        onPress={onSearchPress}
        accessibilityRole="button"
        accessibilityLabel="Open search"
      >
        <Ionicons name="search-outline" size={24} color={isActive('search') ? burgundyTheme.colors.primary : burgundyTheme.colors.textMuted} />
        <Text style={[styles.label, isActive('search') && styles.labelActive]}>Search</Text>
      </Pressable>

      <Pressable
        style={[styles.button, isActive('profile') && styles.buttonActive]}
        onPress={onProfilePress}
        accessibilityRole="button"
        accessibilityLabel="Open profile"
      >
        <Ionicons name="person" size={24} color={isActive('profile') ? burgundyTheme.colors.primary : burgundyTheme.colors.textMuted} />
        <Text style={[styles.label, isActive('profile') && styles.labelActive]}>Profile</Text>
      </Pressable>

      <Pressable
        style={styles.button}
        onPress={onSignOutPress}
        accessibilityRole="button"
        accessibilityLabel="Sign out"
      >
        <MaterialIcons name="logout" size={24} color={burgundyTheme.colors.textMuted} />
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
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: burgundyTheme.colors.border,
    backgroundColor: burgundyTheme.colors.surface,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  buttonActive: {
    backgroundColor: burgundyTheme.colors.primaryTint,
  },
  label: {
    fontSize: 12,
    color: burgundyTheme.colors.textMuted,
    marginTop: 4,
  },
  labelActive: {
    color: burgundyTheme.colors.primary,
    fontWeight: '700',
  },
});
