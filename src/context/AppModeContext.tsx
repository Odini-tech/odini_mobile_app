import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getThemeForMode } from '../theme/appModeTheme';

type AppMode = 'user' | null;
type ColorScheme = 'light' | 'dark';

type AppModeContextValue = {
  mode: AppMode;
  isReady: boolean;
  theme: ReturnType<typeof getThemeForMode>;
  colorScheme: ColorScheme;
  setMode: (nextMode: Exclude<AppMode, null>) => Promise<void>;
  clearMode: () => Promise<void>;
  setColorScheme: (scheme: ColorScheme) => Promise<void>;
};

const STORAGE_KEY = 'odini-app-mode';
const COLOR_SCHEME_KEY = 'odini-color-scheme';

const AppModeContext = createContext<AppModeContextValue | undefined>(undefined);

export function AppModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<AppMode>(null);
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>('light');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(COLOR_SCHEME_KEY),
    ])
      .then(([storedMode, storedScheme]) => {
        if (!isMounted) return;
        if (storedMode === 'user') setModeState(storedMode as AppMode);
        if (storedScheme === 'light' || storedScheme === 'dark') setColorSchemeState(storedScheme);
      })
      .finally(() => {
        if (isMounted) setIsReady(true);
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

  const setColorScheme = useCallback(async (scheme: ColorScheme) => {
    setColorSchemeState(scheme);
    await AsyncStorage.setItem(COLOR_SCHEME_KEY, scheme);
  }, []);

  const value = useMemo(
    () => ({
      mode,
      isReady,
      theme: getThemeForMode(mode, colorScheme),
      colorScheme,
      setMode,
      clearMode,
      setColorScheme,
    }),
    [clearMode, isReady, mode, colorScheme, setMode, setColorScheme]
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
