import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { useAppMode } from '../../src/context/AppModeContext';

export default function ChatScreen() {
  const { theme } = useAppMode();
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.banner, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={[styles.iconWrap, { backgroundColor: theme.colors.primaryTint }]}>
          <Ionicons name="sparkles-outline" size={36} color={theme.colors.primary} />
        </View>
        <Text style={[styles.title, { color: theme.colors.text }]}>Advisory</Text>
        <Text style={[styles.subtitle, { color: theme.colors.primary }]}>Feature coming soon</Text>
        <Text style={[styles.body, { color: theme.colors.textMuted }]}>
          Your personal travel advisor is on its way. Get tailored recommendations, trip planning help, and local insights — all in one place.
        </Text>
        <View style={[styles.pill, { backgroundColor: theme.colors.primaryTint }]}>
          <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />
          <Text style={[styles.pillText, { color: theme.colors.primary }]}>In development</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  banner: {
    width: '100%',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    marginTop: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
