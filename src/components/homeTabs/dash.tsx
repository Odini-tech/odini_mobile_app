import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import burgundyTheme from '../../theme/burgundyTheme';

export default function Dash({ onItemClick }) {
  const dummy = { id: 'dash-1', title: 'Dash - Coming Soon' };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>DASH</Text>
      <Text style={styles.sub}>Coming soon</Text>

      <TouchableOpacity style={styles.card} onPress={() => onItemClick?.(dummy)}>
        <Text style={styles.cardText}>Preview content - tap to activate tab</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: burgundyTheme.colors.background,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    color: burgundyTheme.colors.text,
  },
  sub: {
    fontSize: 16,
    color: burgundyTheme.colors.textMuted,
    marginBottom: 16,
  },
  card: {
    width: '90%',
    padding: 18,
    borderRadius: 16,
    backgroundColor: burgundyTheme.colors.surface,
    borderWidth: 1,
    borderColor: burgundyTheme.colors.border,
    ...burgundyTheme.shadow,
  },
  cardText: {
    color: burgundyTheme.colors.primary,
    fontWeight: '700',
  },
});
