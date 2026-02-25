import { Slot, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { supabase } from "../lib/supabase";
import BottomNav from "./(tabs)/components/BottomNav";

export default function RootLayout() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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

  const handleListings = () => {
    router.push("/listings" as any);
  };

  const handleSearch = () => {
    router.push("/search" as any);
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.replace("/" as any);
    } catch (e) {
      console.warn("Sign out failed:", e);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Slot />
      </View>
      {isAuthenticated ? (
        <BottomNav
          onHomePress={handleHome}
          onListingsPress={handleListings}
          onProfilePress={handleProfile}
          onSignOutPress={handleSignOut}
          onSearchPress={handleSearch}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
});
