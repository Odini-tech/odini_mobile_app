import Constants from 'expo-constants';

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

const initialMode: RecommendationRuntimeMode =
  configuredMode === 'rec_eng' || configuredMode === 'basic'
    ? (configuredMode as RecommendationRuntimeMode)
    : configuredApiBase
      ? 'rec_eng'
      : 'basic';

let activeMode: RecommendationRuntimeMode = initialMode;
let activeReason =
  configuredMode === 'rec_eng' || configuredMode === 'basic'
    ? `Configured by RECOMMENDATION_MODE=${configuredMode}`
    : configuredApiBase
      ? 'Defaulted to rec_eng because RECOMMENDATION_API_URL is configured'
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

const scheduleRecEngRecovery = () => {
  if (recoveryTimer) return; // already scheduled
  if (!configuredApiBase) return;
  if (initialMode !== 'rec_eng') return; // only recover if rec_eng was the original intent

  recoveryTimer = setTimeout(async () => {
    recoveryTimer = null;
    if (activeMode === 'rec_eng') return; // already back
    try {
      const base = trimTrailingSlash(configuredApiBase!);
      const res = await fetch(`${base}/health`, { method: 'GET' });
      if (res.ok) {
        setModeInternal('rec_eng', 'Auto-recovered after successful health check');
        return;
      }
    } catch {
      // still down
    }
    scheduleRecEngRecovery(); // retry again
  }, 60_000);
};

const setModeInternal = (mode: RecommendationRuntimeMode, reason: string) => {
  activeMode = mode;
  activeReason = reason;
  activeUpdatedAt = new Date().toISOString();
  emitMode();
  // If we just fell back to basic and rec_eng was the original config, schedule a recovery probe
  if (mode === 'basic' && initialMode === 'rec_eng') {
    scheduleRecEngRecovery();
  } else if (mode === 'rec_eng' && recoveryTimer) {
    clearTimeout(recoveryTimer);
    recoveryTimer = null;
  }
};

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
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
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
