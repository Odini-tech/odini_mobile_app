import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import PagerView from 'react-native-pager-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Dash from '../../src/components/homeTabs/dash';
import Explore from '../../src/components/homeTabs/explore';
import { ForYouPage } from '../../src/components/homeTabs/myFeed';
import { useAppMode } from '../../src/context/AppModeContext';
import { useBottomNavVisibility } from '../../src/context/BottomNavVisibilityContext';
import {
  getRecommendationModeStatus,
  onRecommendationModeChange,
} from '../../src/services/recommendationGateway';

const { width } = Dimensions.get('window');
const TAB_LABEL_HEIGHT = 40;

const Home = () => {
  const { theme } = useAppMode();
  const insets = useSafeAreaInsets();
  const { isBottomNavVisible } = useBottomNavVisibility();
  const [activeTab, setActiveTab] = useState(1);
  const [pendingAction, setPendingAction] = useState(null);
  const [recMode, setRecMode] = useState(() => getRecommendationModeStatus().mode);
  const pagerRef = useRef(null);
  const indicatorAnim = useRef(new Animated.Value(width / 3 + width / 12)).current;
  const labelsAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const unsubscribe = onRecommendationModeChange((status) => setRecMode(status.mode));
    return unsubscribe;
  }, []);

  useEffect(() => {
    Animated.timing(labelsAnim, {
      toValue: isBottomNavVisible ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [isBottomNavVisible]);

  const labelHeight = labelsAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, TAB_LABEL_HEIGHT],
  });

  const tabs = [
    { id: 0, label: 'Explore' },
    { id: 1, label: 'FYP' },
    { id: 2, label: 'DASH' },
  ];

  const handleTabPress = (index) => {
    setActiveTab(index);
    pagerRef.current?.setPage(index);
    Animated.spring(indicatorAnim, {
      toValue: (width / 3) * index + width / 12,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  };

  const performItemAction = (listing) => {
    console.log('Perform action for listing:', listing);
  };

  const handleTabItemClick = (listing, tabIndex) => {
    if (activeTab === tabIndex) {
      performItemAction(listing);
      return;
    }
    setPendingAction({ tab: tabIndex, action: performItemAction, payload: listing });
    handleTabPress(tabIndex);
  };

  const onPageSelected = (e) => {
    const index = e.nativeEvent.position;
    setActiveTab(index);
    Animated.spring(indicatorAnim, {
      toValue: (width / 3) * index + width / 12,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
    if (pendingAction && pendingAction.tab === index) {
      try {
        pendingAction.action(pendingAction.payload);
      } catch (err) {
        console.error('Pending action failed:', err);
      }
      setPendingAction(null);
    }
  };

  const styles = getStyles(theme, insets);

  return (
    <View style={styles.container}>
      <View style={[styles.topNav, { paddingTop: insets?.top ?? 0 }]}>
        {/* Labels row — animates in/out based on scroll direction */}
        <Animated.View
          pointerEvents={isBottomNavVisible ? 'auto' : 'none'}
          style={{ height: labelHeight, opacity: labelsAnim, overflow: 'hidden' }}
        >
          {/* Green dot on far left, in line with tab labels */}
          <View style={styles.recDotWrapper}>
            <View style={[styles.recDot, recMode === 'rec_eng' && styles.recDotActive]} />
          </View>

          {/* Tab buttons take full width so indicator math stays clean */}
          <View style={styles.tabsRow}>
            {tabs.map((tab, index) => (
              <TouchableOpacity
                key={tab.id}
                style={styles.tabButton}
                onPress={() => handleTabPress(index)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabLabel, activeTab === index && styles.activeTabLabel]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Indicator track — always visible */}
        <View style={styles.indicatorTrack}>
          <Animated.View
            style={[styles.indicator, { transform: [{ translateX: indicatorAnim }] }]}
          />
        </View>
      </View>

      <PagerView
        ref={pagerRef}
        style={styles.pagerView}
        initialPage={1}
        onPageSelected={onPageSelected}
        scrollEnabled
      >
        <View key="1" style={styles.page}>
          <Explore onItemClick={(listing) => handleTabItemClick(listing, 0)} />
        </View>
        <View key="2" style={styles.page}>
          <ForYouPage onEventClick={(listing) => handleTabItemClick(listing, 1)} />
        </View>
        <View key="3" style={styles.page}>
          <Dash onItemClick={(listing) => handleTabItemClick(listing, 2)} />
        </View>
      </PagerView>
    </View>
  );
};

const getStyles = (theme, insets) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    topNav: {
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    tabsRow: {
      flexDirection: 'row',
      height: '100%',
      paddingHorizontal: 6,
      alignItems: 'center',
      justifyContent: 'space-evenly',
    },
    tabButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 4,
    },
    tabLabel: {
      color: theme.colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
    },
    activeTabLabel: {
      color: '#FFFFFF',
      fontWeight: '800',
    },
    recDotWrapper: {
      position: 'absolute',
      left: 10,
      top: 0,
      bottom: 0,
      justifyContent: 'center',
      zIndex: 1,
    },
    recDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: 'transparent',
    },
    recDotActive: {
      backgroundColor: '#22C55E',
    },
    indicatorTrack: {
      height: 3,
    },
    indicator: {
      position: 'absolute',
      left: 0,
      top: 0,
      width: width / 6,
      height: 3,
      backgroundColor: theme.colors.text,
      borderRadius: 999,
    },
    pagerView: {
      flex: 1,
    },
    page: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
  });

export default Home;
