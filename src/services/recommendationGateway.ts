import Constants from 'expo-constants';
import { supabase } from '../../lib/supabase';

export type RecommendationRuntimeMode = 'basic' | 'rec_eng';

export interface RecommendationModeStatus {
  mode: RecommendationRuntimeMode;
  apiBaseUrl: string | null;
  reason: string;
  updatedAt: string;
}

type ModeListener = (status: RecommendationModeStatus) => void;

interface ApiEnvelope<T> {
  data: T;
  count?: number;
  limit?: number;
  offset?: number;
}

const listeners = new Set<ModeListener>();

const expoExtra =
  (Constants.expoConfig && Constants.expoConfig.extra) ||
  // Backward compatibility for older Expo manifests.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ((Constants as any).manifest && (Constants as any).manifest.extra) ||
  {};

const envApiUrl =
  (typeof process !== 'undefined' &&
    (process.env.EXPO_PUBLIC_RECOMMENDATION_API_URL ||
      process.env.RECOMMENDATION_API_URL ||
      process.env.VITE_API_URL)) ||
  null;

const configuredApiBase =
  expoExtra.RECOMMENDATION_API_URL ||
  envApiUrl ||
  null;

const configuredMode = String(expoExtra.RECOMMENDATION_MODE || '').toLowerCase();

// "Intent" — whether config wants us to try the rec engine at all. The green
// dot / active mode itself is never trusted from config alone: it only
// flips to 'rec_eng' once a live /health check confirms the engine is
// actually reachable. Explicitly configuring RECOMMENDATION_MODE=basic
// disables the engine outright, no probing.
const intendsRecEng = configuredMode === 'basic'
  ? false
  : configuredMode === 'rec_eng'
    ? Boolean(configuredApiBase)
    : Boolean(configuredApiBase);

let activeMode: RecommendationRuntimeMode = 'basic';
let activeReason = intendsRecEng
  ? 'Checking recommendation engine health…'
  : configuredMode === 'basic'
    ? 'Configured by RECOMMENDATION_MODE=basic'
    : 'Defaulted to basic because recommendation API URL is missing';
let activeUpdatedAt = new Date().toISOString();
let lastAnnouncedMode: RecommendationRuntimeMode | null = null;

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const buildModeMessage = (status: RecommendationModeStatus) =>
  `[ODINI mode] ${status.mode === 'rec_eng' ? 'REC_ENG mode' : 'BASIC mode'} active (${status.reason})`;

const emitMode = () => {
  const status = getRecommendationModeStatus();
  const message = buildModeMessage(status);

  if (lastAnnouncedMode !== status.mode) {
    console.info(message);
    lastAnnouncedMode = status.mode;
  }

  listeners.forEach(listener => {
    try {
      listener(status);
    } catch (_) {
      // Listener errors should not break service calls.
    }
  });
};

let recoveryTimer: ReturnType<typeof setTimeout> | null = null;

const checkHealth = async (): Promise<boolean> => {
  if (!configuredApiBase) return false;
  const base = trimTrailingSlash(configuredApiBase);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6_000);
  try {
    const res = await fetch(`${base}/health`, { method: 'GET', signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
};

const scheduleRecEngRecovery = () => {
  if (recoveryTimer) return; // already scheduled
  if (!intendsRecEng) return; // only recover if rec_eng was the original intent

  recoveryTimer = setTimeout(async () => {
    recoveryTimer = null;
    if (activeMode === 'rec_eng') return; // already back
    const healthy = await checkHealth();
    if (healthy) {
      setModeInternal('rec_eng', 'Auto-recovered after successful health check');
      return;
    }
    scheduleRecEngRecovery(); // retry again
  }, 60_000);
};

const setModeInternal = (mode: RecommendationRuntimeMode, reason: string) => {
  activeMode = mode;
  activeReason = reason;
  activeUpdatedAt = new Date().toISOString();
  emitMode();
  // If we just fell back to basic and rec_eng was the original intent, schedule a recovery probe
  if (mode === 'basic' && intendsRecEng) {
    scheduleRecEngRecovery();
  } else if (mode === 'rec_eng' && recoveryTimer) {
    clearTimeout(recoveryTimer);
    recoveryTimer = null;
  }
};

// Startup probe — the dot only turns green once we've actually confirmed the
// engine responds, not just because a URL is configured for it.
if (intendsRecEng) {
  checkHealth().then((healthy) => {
    if (healthy) {
      setModeInternal('rec_eng', 'Health check passed on startup');
    } else {
      activeReason = 'Recommendation engine unreachable at startup';
      emitMode();
      scheduleRecEngRecovery();
    }
  });
}

export function setRecommendationMode(mode: RecommendationRuntimeMode, reason = 'Manual override'): RecommendationModeStatus {
  setModeInternal(mode, reason);
  return getRecommendationModeStatus();
}

export function getRecommendationModeStatus(): RecommendationModeStatus {
  return {
    mode: activeMode,
    apiBaseUrl: configuredApiBase ? trimTrailingSlash(configuredApiBase) : null,
    reason: activeReason,
    updatedAt: activeUpdatedAt,
  };
}

export function onRecommendationModeChange(listener: ModeListener): () => void {
  listeners.add(listener);
  emitMode();
  return () => listeners.delete(listener);
}

export function isRecommendationEngineMode(): boolean {
  emitMode();
  return activeMode === 'rec_eng';
}

export function announceRecommendationMode(): RecommendationModeStatus {
  emitMode();
  return getRecommendationModeStatus();
}

const createQueryString = (params?: Record<string, string | number | boolean | null | undefined>): string => {
  if (!params) return '';
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.append(key, String(value));
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
};

const normalizeEnvelope = <T>(payload: unknown): ApiEnvelope<T> => {
  const data = payload as ApiEnvelope<T>;
  if (data && typeof data === 'object' && 'data' in data) {
    return data;
  }

  return {
    data: payload as T,
  };
};

export async function callRecommendationApi<T>(
  path: string,
  init?: RequestInit
): Promise<ApiEnvelope<T>> {
  if (!configuredApiBase) {
    throw new Error('Recommendation API URL is not configured. Set RECOMMENDATION_API_URL.');
  }

  const base = trimTrailingSlash(configuredApiBase);
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;

  // Attach the logged-in user's Supabase JWT so the engine can resolve
  // personalized (vs guest/cold-start) results server-side. Missing/expired
  // tokens just mean the engine treats the caller as a guest — never throw here.
  let authHeader: Record<string, string> = {};
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (token) authHeader = { Authorization: `Bearer ${token}` };
  } catch {
    // no session available — proceed as guest
  }

  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Recommendation API ${response.status}: ${text || response.statusText}`);
  }

  const json = await response.json();
  return normalizeEnvelope<T>(json);
}

export async function runDualMode<T>(options: {
  context: string;
  recEng: () => Promise<T>;
  basic: () => Promise<T>;
  fallbackToBasicOnError?: boolean;
}): Promise<T> {
  const { context, recEng, basic, fallbackToBasicOnError = true } = options;

  emitMode();

  if (activeMode === 'rec_eng') {
    try {
      return await recEng();
    } catch (error) {
      if (!fallbackToBasicOnError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[ODINI mode] rec_eng failed in ${context}, falling back to basic: ${message}`);
      setModeInternal('basic', `Auto-fallback after rec_eng failure in ${context}`);
      return basic();
    }
  }

  return basic();
}

export function recommendationApiPath(pathname: string, params?: Record<string, string | number | boolean | null | undefined>) {
  return `${pathname}${createQueryString(params)}`;
}
