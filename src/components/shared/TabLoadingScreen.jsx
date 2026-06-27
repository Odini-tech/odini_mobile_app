import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import burgundyTheme from '../../theme/burgundyTheme';

export function TabLoadingScreen({ message = 'Finding listings for you' }) {
  const d1 = useRef(new Animated.Value(0.2)).current;
  const d2 = useRef(new Animated.Value(0.2)).current;
  const d3 = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    const pulse = (dot, delay) =>
      Animated.sequence([
        Animated.delay(delay),
        Animated.loop(
          Animated.sequence([
            Animated.timing(dot, { toValue: 1, duration: 280, useNativeDriver: true }),
            Animated.timing(dot, { toValue: 0.2, duration: 280, useNativeDriver: true }),
          ])
        ),
      ]);

    const a1 = pulse(d1, 0);
    const a2 = pulse(d2, 190);
    const a3 = pulse(d3, 380);
    a1.start();
    a2.start();
    a3.start();
    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.brand}>odini</Text>
      <Text style={styles.message}>{message}</Text>
      <View style={styles.dotsRow}>
        <Animated.View style={[styles.dot, { opacity: d1 }]} />
        <Animated.View style={[styles.dot, { opacity: d2 }]} />
        <Animated.View style={[styles.dot, { opacity: d3 }]} />
      </View>
    </View>
  );
}

// Fades in children from transparent on mount — use when transitioning from a loading screen
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
    gap: 16,
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
  dotsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: burgundyTheme.colors.primary,
  },
});
