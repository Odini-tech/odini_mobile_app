import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useSegments } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppMode } from '../../../src/context/AppModeContext';

export default function BottomNav({
  onHomePress = () => {},
  onListingsPress = () => {},
  onSearchPress = () => {},
  onProfilePress = () => {},
  onSignOutPress = () => {},
  showSignOut = false,
}) {
  const segments = useSegments();
  const { theme } = useAppMode();
  const styles = getStyles(theme);

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
        <Ionicons
          name="home-outline"
          size={24}
          color={isActive('home') ? theme.colors.primary : theme.colors.textMuted}
        />
        <Text style={[styles.label, isActive('home') && styles.labelActive]}>Home</Text>
      </Pressable>

      <Pressable
        style={[styles.button, isActive('listings') && styles.buttonActive]}
        onPress={onListingsPress}
        accessibilityRole="button"
        accessibilityLabel="Open listings"
      >
        <Ionicons
          name="chat"
          size={24}
          color={isActive('listings') ? theme.colors.primary : theme.colors.textMuted}
        />
        <Text style={[styles.label, isActive('listings') && styles.labelActive]}>Advisory</Text>
      </Pressable>

      <Pressable
        style={[styles.button, isActive('search') && styles.buttonActive]}
        onPress={onSearchPress}
        accessibilityRole="button"
        accessibilityLabel="Open search"
      >
        <Ionicons
          name="search-outline"
          size={24}
          color={isActive('search') ? theme.colors.primary : theme.colors.textMuted}
        />
        <Text style={[styles.label, isActive('search') && styles.labelActive]}>Search</Text>
      </Pressable>

      <Pressable
        style={[styles.button, isActive('profile') && styles.buttonActive]}
        onPress={onProfilePress}
        accessibilityRole="button"
        accessibilityLabel="Open profile"
      >
        <Ionicons
          name="person"
          size={24}
          color={isActive('profile') ? theme.colors.primary : theme.colors.textMuted}
        />
        <Text style={[styles.label, isActive('profile') && styles.labelActive]}>Profile</Text>
      </Pressable>

      {showSignOut ? (
        <Pressable
          style={styles.button}
          onPress={onSignOutPress}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
        >
          <MaterialIcons name="logout" size={24} color={theme.colors.textMuted} />
          <Text style={styles.label}>Sign out</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const getStyles = (theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    button: {
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 14,
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    buttonActive: {
      backgroundColor: theme.colors.primaryTint,
    },
    label: {
      fontSize: 12,
      color: theme.colors.textMuted,
      marginTop: 4,
    },
    labelActive: {
      color: theme.colors.primary,
      fontWeight: '700',
    },
  });
