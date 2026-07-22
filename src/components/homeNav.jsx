import { Pressable, StyleSheet, Text, View } from 'react-native';
import burgundyTheme from '../theme/burgundyTheme';

export default function HomeNav({ tabs = [], activeTab = 0, onTabPress = () => {} }) {
  return (
    <View style={styles.container}>
      {tabs.map((tab, index) => {
        const isActive = index === activeTab;

        return (
          <Pressable
            key={tab.id ?? tab.label ?? index}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => onTabPress(index)}
          >
            <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: burgundyTheme.colors.surface,
    borderRadius: 20,
    padding: 6,
    borderWidth: 1,
    borderColor: burgundyTheme.colors.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
  },
  tabActive: {
    backgroundColor: burgundyTheme.colors.primaryTint,
  },
  label: {
    fontSize: 1,
    fontWeight: '600',
    color: burgundyTheme.colors.textMuted,
  },
  labelActive: {
    color: burgundyTheme.colors.primary,
  },
});
