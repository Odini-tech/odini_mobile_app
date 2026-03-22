import { Session } from "@supabase/supabase-js";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { supabase } from "../lib/supabase";
import burgundyTheme from "../src/theme/burgundyTheme";

import AuthScreen from "./(tabs)/authScreen";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const prevSessionRef = useRef<Session | null>(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
      prevSessionRef.current = data.session;
      if (data.session) router.replace('/home' as any);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        // prevent unnecessary repeated replaces by checking previous state
        const prev = prevSessionRef.current;
        setSession(newSession);

        if (!prev && newSession) {
          // signed in
          router.replace('/home' as any);
        } else if (prev && !newSession) {
          // signed out
          router.replace('/' as any);
        }

        prevSessionRef.current = newSession;
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={burgundyTheme.colors.primary} />
      </View>
    );
  }

  return session ? <></> : <AuthScreen />;
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: burgundyTheme.colors.background,
  },
});
