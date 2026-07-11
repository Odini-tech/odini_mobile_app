import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useAppMode } from '../../context/AppModeContext';

const BUBBLE_COUNT = 3;
const ORBIT_RADIUS = 20;
const BUBBLE_SIZE = 12;
const BUBBLE_COLOR = '#A63456';

function Bubble({ angle, delay }) {
  const scale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(scale, {
          toValue: 1,
          duration: 450,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.5,
          duration: 450,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [delay, scale]);

  return (
    <Animated.View
      style={[
        styles.bubble,
        { transform: [{ rotate: `${angle}deg` }, { translateY: -ORBIT_RADIUS }, { scale }] },
      ]}
    />
  );
}

export function TabLoadingScreen() {
  const { theme } = useAppMode();
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1600,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [rotation]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Animated.View style={[styles.orbit, { transform: [{ rotate: spin }] }]}>
        {Array.from({ length: BUBBLE_COUNT }).map((_, i) => (
          <Bubble key={i} angle={(360 / BUBBLE_COUNT) * i} delay={i * 160} />
        ))}
      </Animated.View>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  orbit: {
    width: ORBIT_RADIUS * 2,
    height: ORBIT_RADIUS * 2,
  },
  bubble: {
    position: 'absolute',
    top: ORBIT_RADIUS - BUBBLE_SIZE / 2,
    left: ORBIT_RADIUS - BUBBLE_SIZE / 2,
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    backgroundColor: BUBBLE_COLOR,
  },
});
