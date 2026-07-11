import { Session } from "@supabase/supabase-js";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAppMode } from "../src/context/AppModeContext";
import { useAppData } from "../src/context/AppDataContext";
import { announceRecommendationMode, onRecommendationModeChange } from "../src/services/recommendationGateway";
import { TabLoadingScreen } from "../src/components/shared/TabLoadingScreen";

import AuthScreen from "./(tabs)/authScreen";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const router = useRouter();
  const prevSessionRef = useRef<Session | null>(null);
  const hasNavigatedRef = useRef(false);
  const { isReady: appModeReady, setMode } = useAppMode();
  const { isReady: dataReady } = useAppData();

  useEffect(() => {
    announceRecommendationMode();
    const unsubscribe = onRecommendationModeChange(() => {});
    return unsubscribe;
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setAuthLoading(false);
      prevSessionRef.current = data.session;
      if (data.session) {
        setMode('user').catch((error) => {
          console.warn('Failed to set default app mode:', error);
        });
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        const prev = prevSessionRef.current;
        setSession(newSession);
        if (!prev && newSession) {
          // signed in — will navigate once data is also ready
        } else if (prev && !newSession) {
          hasNavigatedRef.current = false;
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

  // Navigate once auth AND app data are both ready
  useEffect(() => {
    if (!authLoading && session && dataReady && appModeReady && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      router.replace('/home' as any);
    }
  }, [authLoading, session, dataReady, appModeReady, router]);

  const loading = authLoading || !appModeReady || (!!session && !dataReady);

  if (loading) {
    return <TabLoadingScreen />;
  }

  if (session) {
    // Already navigated via the effect above; render nothing while transition happens
    return <TabLoadingScreen />;
  }

  return <AuthScreen />;
}
