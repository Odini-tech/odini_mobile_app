import { Session } from "@supabase/supabase-js";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAppMode } from "../src/context/AppModeContext";
import { announceRecommendationMode, onRecommendationModeChange } from "../src/services/recommendationGateway";
import { TabLoadingScreen } from "../src/components/shared/TabLoadingScreen";

import AuthScreen from "./(tabs)/authScreen";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const prevSessionRef = useRef<Session | null>(null);
  const { isReady, setMode } = useAppMode();

  useEffect(() => {
    announceRecommendationMode();
    const unsubscribe = onRecommendationModeChange(() => {
      // Mode updates are announced from recommendationGateway.
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
      prevSessionRef.current = data.session;
      if (data.session) {
        setMode('user').catch((error) => {
          console.warn('Failed to set default app mode:', error);
        });
        router.replace('/home' as any);
      }
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
  }, [router, setMode]);

  if (loading || !isReady) {
    return <TabLoadingScreen />;
  }

  if (session) {
    return <></>;
  }

  return <AuthScreen />;
}

