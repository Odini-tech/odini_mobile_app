import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useAppMode } from '../../context/AppModeContext';

function useShimmer() {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return anim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.75] });
}

/** Skeleton for the full-width FYP feed card */
export function FeedCardSkeleton() {
  const { theme } = useAppMode();
  const styles = getStyles(theme);
  const opacity = useShimmer();
  return (
    <Animated.View style={[styles.card, { opacity }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar} />
        <View style={styles.headerLines}>
          <View style={[styles.line, { width: '55%', marginBottom: 6 }]} />
          <View style={[styles.line, { width: '35%', height: 10 }]} />
        </View>
        <View style={styles.dotsPlaceholder} />
      </View>
      {/* Image */}
      <View style={styles.image} />
      {/* Action row */}
      <View style={styles.actions}>
        <View style={[styles.line, { width: 28, height: 28, borderRadius: 14 }]} />
        <View style={[styles.line, { width: 28, height: 28, borderRadius: 14 }]} />
        <View style={[styles.line, { width: 28, height: 28, borderRadius: 14 }]} />
      </View>
      {/* Caption */}
      <View style={styles.caption}>
        <View style={[styles.line, { width: '30%', height: 12, marginBottom: 8 }]} />
        <View style={[styles.line, { width: '80%', marginBottom: 6 }]} />
        <View style={[styles.line, { width: '65%' }]} />
      </View>
    </Animated.View>
  );
}

/** Smaller skeleton for the explore grid card */
export function GridCardSkeleton() {
  const { theme } = useAppMode();
  const styles = getStyles(theme);
  const opacity = useShimmer();
  return (
    <Animated.View style={[styles.gridCard, { opacity }]}>
      <View style={styles.gridImage} />
      <View style={styles.gridCaption}>
        <View style={[styles.line, { width: '75%', marginBottom: 6 }]} />
        <View style={[styles.line, { width: '45%', height: 10 }]} />
      </View>
    </Animated.View>
  );
}

const getStyles = (theme) => {
  const BG = theme.colors.surfaceStrong;
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: theme.colors.border,
      marginTop: 16,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: BG,
    },
    headerLines: { flex: 1 },
    dotsPlaceholder: { width: 20, height: 4, backgroundColor: BG, borderRadius: 2 },
    image: {
      width: '100%',
      aspectRatio: 1,
      backgroundColor: BG,
    },
    actions: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    caption: {
      padding: 12,
    },
    line: {
      height: 13,
      borderRadius: 6,
      backgroundColor: BG,
    },
    // Grid card
    gridCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 0.5,
      borderColor: theme.colors.border,
    },
    gridImage: {
      width: '100%',
      aspectRatio: 1.2,
      backgroundColor: BG,
    },
    gridCaption: {
      padding: 8,
    },
  });
};
