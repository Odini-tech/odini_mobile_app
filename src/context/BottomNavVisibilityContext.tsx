import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

const TOP_SHOW_THRESHOLD = 24;
const SCROLL_DELTA_THRESHOLD = 12;

type BottomNavScrollEvent = NativeSyntheticEvent<NativeScrollEvent>;

type BottomNavVisibilityContextValue = {
  isBottomNavVisible: boolean;
  setBottomNavVisible: (visible: boolean) => void;
  resetBottomNavScroll: () => void;
  handleBottomNavScroll: (event: BottomNavScrollEvent) => void;
};

const BottomNavVisibilityContext = createContext<BottomNavVisibilityContextValue | null>(null);

export function BottomNavVisibilityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isBottomNavVisible, setIsBottomNavVisible] = useState(true);
  const lastOffsetYRef = useRef(0);
  const visibleRef = useRef(true);

  const setBottomNavVisible = useCallback((visible: boolean) => {
    visibleRef.current = visible;
    setIsBottomNavVisible((current) => (current === visible ? current : visible));
  }, []);

  const resetBottomNavScroll = useCallback(() => {
    lastOffsetYRef.current = 0;
    setBottomNavVisible(true);
  }, [setBottomNavVisible]);

  const handleBottomNavScroll = useCallback(
    (event: BottomNavScrollEvent) => {
      const offsetY = Math.max(0, event.nativeEvent.contentOffset.y);
      const deltaY = offsetY - lastOffsetYRef.current;

      if (offsetY <= TOP_SHOW_THRESHOLD) {
        setBottomNavVisible(true);
        lastOffsetYRef.current = offsetY;
        return;
      }

      if (deltaY > SCROLL_DELTA_THRESHOLD && visibleRef.current) {
        setBottomNavVisible(false);
      } else if (deltaY < -SCROLL_DELTA_THRESHOLD && !visibleRef.current) {
        setBottomNavVisible(true);
      }

      lastOffsetYRef.current = offsetY;
    },
    [setBottomNavVisible]
  );

  const value = useMemo(
    () => ({
      isBottomNavVisible,
      setBottomNavVisible,
      resetBottomNavScroll,
      handleBottomNavScroll,
    }),
    [handleBottomNavScroll, isBottomNavVisible, resetBottomNavScroll, setBottomNavVisible]
  );

  return (
    <BottomNavVisibilityContext.Provider value={value}>
      {children}
    </BottomNavVisibilityContext.Provider>
  );
}

export function useBottomNavVisibility() {
  const context = useContext(BottomNavVisibilityContext);

  if (!context) {
    throw new Error('useBottomNavVisibility must be used within BottomNavVisibilityProvider');
  }

  return context;
}

export function useBottomNavScroll() {
  const { handleBottomNavScroll } = useBottomNavVisibility();

  return useMemo(
    () => ({
      onScroll: handleBottomNavScroll,
      scrollEventThrottle: 16 as const,
    }),
    [handleBottomNavScroll]
  );
}
