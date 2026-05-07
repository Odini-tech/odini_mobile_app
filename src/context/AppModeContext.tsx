import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getThemeForMode } from '../theme/appModeTheme';

type AppMode = 'user' | null;

type AppModeContextValue = {
  mode: AppMode;
  isReady: boolean;
  theme: ReturnType<typeof getThemeForMode>;
  setMode: (nextMode: Exclude<AppMode, null>) => Promise<void>;
  clearMode: () => Promise<void>;
};

const STORAGE_KEY = 'odini-app-mode';

const AppModeContext = createContext<AppModeContextValue | undefined>(undefined);

export function AppModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<AppMode>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((storedMode) => {
        if (!isMounted) return;
        if (storedMode === 'user') {
          setModeState(storedMode as AppMode);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsReady(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const setMode = useCallback(async (nextMode: Exclude<AppMode, null>) => {
    setModeState(nextMode);
    await AsyncStorage.setItem(STORAGE_KEY, nextMode);
  }, []);

  const clearMode = useCallback(async () => {
    setModeState(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({
      mode,
      isReady,
      theme: getThemeForMode(mode),
      setMode,
      clearMode,
    }),
    [clearMode, isReady, mode, setMode]
  );

  return <AppModeContext.Provider value={value}>{children}</AppModeContext.Provider>;
}

export function useAppMode() {
  const context = useContext(AppModeContext);

  if (!context) {
    throw new Error('useAppMode must be used within an AppModeProvider');
  }

  return context;
}
