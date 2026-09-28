import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/services/supabase/client';

type ToggleOps = {
  check: (userId: string, targetId: string) => Promise<boolean>;
  on: (userId: string, targetId: string) => Promise<boolean>;
  off: (userId: string, targetId: string) => Promise<boolean>;
};

/**
 * On/off state for a per-user interaction on a non-listing target
 * (following a host, favoriting a venue). Optimistic, reverts on failure.
 */
export function useInteractionToggle(targetId: string | undefined, ops: ToggleOps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase.auth.getUser();
        const uid = data?.user?.id ?? null;
        if (cancelled) return;
        setUserId(uid);
        if (uid && targetId) {
          const isActive = await ops.check(uid, targetId);
          if (!cancelled) setActive(isActive);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId]);

  const toggle = useCallback(async () => {
    if (!userId || !targetId || busy) return;
    const next = !active;
    setActive(next);
    setBusy(true);
    const ok = next ? await ops.on(userId, targetId) : await ops.off(userId, targetId);
    if (!ok) setActive(!next);
    setBusy(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, targetId, active, busy]);

  return { userId, active, loading, busy, toggle };
}
