import { Ionicons } from '@expo/vector-icons';
import { useSegments } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppMode } from '../../../src/context/AppModeContext';

export default function BottomNav({
  onHomePress = () => {},
  onChatPress = () => {},
  onSearchPress = () => {},
  onProfilePress = () => {},
}) {
  const segments = useSegments();
  const { theme } = useAppMode();
  const insets = useSafeAreaInsets();
  const styles = getStyles(theme, insets);

  const isActive = (name) => {
    if (!segments || segments.length === 0) return name === 'home';
    return segments.includes(name);
  };

  const NAV_ITEMS = [
    { name: 'home',    icon: 'home-outline',       label: 'Home',     onPress: onHomePress },
    { name: 'chat',    icon: 'chatbubble-outline',  label: 'Advisory', onPress: onChatPress },
    { name: 'search',  icon: 'search-outline',      label: 'Search',   onPress: onSearchPress },
    { name: 'profile', icon: 'person-outline',      label: 'Profile',  onPress: onProfilePress },
  ];

  return (
    <View style={styles.container}>
      {NAV_ITEMS.map(({ name, icon, label, onPress }) => {
        const active = isActive(name);
        return (
          <Pressable
            key={name}
            style={[styles.button, active && styles.buttonActive]}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={label}
          >
            <Ionicons
              name={icon}
              size={24}
              color={active ? theme.colors.primary : theme.colors.textMuted}
            />
            <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const getStyles = (theme, insets) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingTop: 10,
      paddingBottom: Math.max(14, insets.bottom + 6),
      paddingHorizontal: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    button: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 14,
      paddingVertical: 6,
    },
    buttonActive: {
      backgroundColor: theme.colors.primaryTint,
    },
    label: {
      fontSize: 11,
      color: theme.colors.textMuted,
      marginTop: 4,
    },
    labelActive: {
      color: theme.colors.primary,
      fontWeight: '700',
    },
  });
