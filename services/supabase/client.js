// move this file to project root lib/supabase.js (see note below)
// at the very top: polyfill for URL
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

// Lazy-load AsyncStorage only on native to avoid "window is not defined" on web
let storage;
try {
  if (Platform.OS !== 'web') {
    // eslint-disable-next-line global-require
    const AsyncStorageModule = require('@react-native-async-storage/async-storage');
    storage = AsyncStorageModule?.default || AsyncStorageModule;
  }
} catch (e) {
  // eslint-disable-next-line no-console
  console.warn('AsyncStorage not available; falling back to default storage for web/SSR.', e?.message || e);
}

// Expo stores extras in different places depending on environment
const expoExtra = (Constants.expoConfig && Constants.expoConfig.extra) || (Constants.manifest && Constants.manifest.extra);

const SUPABASE_URL =
  expoExtra?.SUPABASE_URL || process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  expoExtra?.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Helpful warning for debugging
  // eslint-disable-next-line no-console
  console.warn('Supabase keys not found. expo.extra present:', !!expoExtra, 'SUPABASE_URL:', !!expoExtra?.SUPABASE_URL);
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_ANON_KEY. Add them under "expo.extra" in app.json or configure env variables.'
  );
}

const authOptions = {
  ...(storage ? { storage } : {}),
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: false,
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: authOptions,
});
