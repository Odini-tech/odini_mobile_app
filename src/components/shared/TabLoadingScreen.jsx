import { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';
import burgundyTheme from '../../theme/burgundyTheme';

const { width } = Dimensions.get('window');

const MESSAGES = [
  'Finding listings for you',
  'Loading your dashboard',
  'Preparing search',
  'Almost there',
];

export function TabLoadingScreen({ progress = 0, message = undefined }) {
  const barWidth = useRef(new Animated.Value(0)).current;
  const messageIndex = Math.min(
    Math.floor((progress / 100) * MESSAGES.length),
    MESSAGES.length - 1
  );
  const displayMessage = message || MESSAGES[messageIndex];

  useEffect(() => {
    Animated.timing(barWidth, {
      toValue: progress,
      duration: 350,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const animatedWidth = barWidth.interpolate({
    inputRange: [0, 100],
    outputRange: [0, width - 80],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <Text style={styles.brand}>odini</Text>
      <Text style={styles.message}>{displayMessage}</Text>

      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, { width: animatedWidth }]} />
      </View>

      <Text style={styles.percent}>{Math.round(progress)}%</Text>
    </View>
  );
}

// Fades in children from transparent on mount
export function FadeInView({ children, style, duration = 380 }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration, useNativeDriver: true }).start();
  }, []);
  return <Animated.View style={[style, { opacity }]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: burgundyTheme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
  },
  brand: {
    fontSize: 42,
    fontWeight: '800',
    color: burgundyTheme.colors.primary,
    letterSpacing: 3,
  },
  message: {
    fontSize: 14,
    color: burgundyTheme.colors.textMuted,
    letterSpacing: 0.3,
  },
  barTrack: {
    width: width - 80,
    height: 4,
    borderRadius: 4,
    backgroundColor: burgundyTheme.colors.border,
    overflow: 'hidden',
    marginTop: 4,
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: burgundyTheme.colors.primary,
  },
  percent: {
    fontSize: 12,
    color: burgundyTheme.colors.textMuted,
    fontWeight: '600',
    marginTop: -4,
  },
});
