import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { supabase } from "../lib/supabase";
import { AppModeProvider, useAppMode } from "../src/context/AppModeContext";
import {
    BottomNavVisibilityProvider,
    useBottomNavVisibility,
} from "../src/context/BottomNavVisibilityContext";
import { CurrencyProvider } from "../src/context/CurrencyContext";
import BottomNav from "./(tabs)/components/BottomNav";

const DEFAULT_NAV_HEIGHT = 88;

function RootLayoutContent() {
  const router = useRouter();
  const segments = useSegments();
  const { clearMode } = useAppMode();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [navHeight, setNavHeight] = useState(DEFAULT_NAV_HEIGHT);
  const { isBottomNavVisible, resetBottomNavScroll } = useBottomNavVisibility();
  const navAnimation = useRef(new Animated.Value(1)).current;
  const currentRouteKey = segments.join("/");

  useEffect(() => {
    let mounted = true;

    // get initial session
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setIsAuthenticated(!!data.session);
    });

    // subscribe to auth changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleProfile = () => {
    router.push("/profile" as any);
  };

  const handleHome = () => {
    router.push("/home" as any);
  };

  const handleSearch = () => {
    router.push("/search" as any);
  };

  const handleSignOut = async () => {
    try {
      await clearMode();
      await supabase.auth.signOut();
      router.replace("/" as any);
    } catch (e) {
      console.warn("Sign out failed:", e);
    }
  };

  useEffect(() => {
    resetBottomNavScroll();
  }, [currentRouteKey, resetBottomNavScroll]);

  useEffect(() => {
    Animated.timing(navAnimation, {
      toValue: isBottomNavVisible ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [isBottomNavVisible, navAnimation]);

  const animatedHeight = navAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, navHeight],
  });

  const animatedTranslateY = navAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [Math.max(24, navHeight * 0.35), 0],
  });

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Slot />
      </View>
      {isAuthenticated ? (
        <Animated.View
          pointerEvents={isBottomNavVisible ? "auto" : "none"}
          style={[styles.navShell, { height: animatedHeight, opacity: navAnimation }]}
        >
          <Animated.View
            onLayout={({ nativeEvent }) => {
              const nextHeight = Math.ceil(nativeEvent.layout.height);
              if (nextHeight && Math.abs(nextHeight - navHeight) > 1) {
                setNavHeight(nextHeight);
              }
            }}
            style={[
              styles.navInner,
              { transform: [{ translateY: animatedTranslateY }] },
            ]}
          >
            <BottomNav
              onHomePress={handleHome}
              onProfilePress={handleProfile}
              onSignOutPress={handleSignOut}
              onSearchPress={handleSearch}
              showSignOut={true}
            />
          </Animated.View>
        </Animated.View>
      ) : null}
    </View>
  );
}

export default function RootLayout() {
  return (
    <AppModeProvider>
      <CurrencyProvider>
        <BottomNavVisibilityProvider>
          <RootLayoutContent />
        </BottomNavVisibilityProvider>
      </CurrencyProvider>
    </AppModeProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  navShell: {
    overflow: "hidden",
  },
  navInner: {
    left: 0,
    right: 0,
    bottom: 0,
    position: "absolute",
  },
});
