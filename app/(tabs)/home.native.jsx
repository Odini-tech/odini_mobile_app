import React, { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import PagerView from 'react-native-pager-view';
import Dash from '../../src/components/homeTabs/dash';
import Explore from '../../src/components/homeTabs/explore';
import { ForYouPage } from '../../src/components/homeTabs/myFeed';
import { useAppMode } from '../../src/context/AppModeContext';

const { width } = Dimensions.get('window');

const Home = () => {
  const { theme } = useAppMode();
  const styles = getStyles(theme);
  const [activeTab, setActiveTab] = useState(1);
  const [pendingAction, setPendingAction] = useState(null);
  const pagerRef = useRef(null);
  const indicatorAnim = useRef(new Animated.Value(width / 3)).current;

  const tabs = [
    { id: 0, label: 'Explore', icon: '' },
    { id: 1, label: 'FYP', icon: '' },
    { id: 2, label: 'DASH', icon: '' },
  ];

  const handleTabPress = (index) => {
    setActiveTab(index);
    pagerRef.current?.setPage(index);

    Animated.spring(indicatorAnim, {
      toValue: (width / 3) * index,
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
      toValue: (width / 3) * index,
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

  return (
    <View style={styles.container}>
      <View style={styles.topNav}>
        {tabs.map((tab, index) => (
          <TouchableOpacity
            key={tab.id}
            style={styles.tabButton}
            onPress={() => handleTabPress(index)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabIcon, activeTab === index && styles.activeTabIcon]}>
              {tab.icon}
            </Text>
            <Text style={[styles.tabLabel, activeTab === index && styles.activeTabLabel]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}

        <Animated.View
          style={[
            styles.indicator,
            {
              transform: [{ translateX: indicatorAnim }],
            },
          ]}
        />
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

const getStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    topNav: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      paddingTop: 12,
      paddingBottom: 8,
      position: 'relative',
    },
    tabButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      marginHorizontal: 6,
      borderRadius: 16,
    },
    tabIcon: {
      fontSize: 20,
      color: theme.colors.textMuted,
      marginBottom: 4,
    },
    activeTabIcon: {
      color: theme.colors.primary,
    },
    tabLabel: {
      color: theme.colors.textMuted,
      fontSize: 14,
      fontWeight: '600',
    },
    activeTabLabel: {
      color: theme.colors.primary,
      fontWeight: 'bold',
    },
    indicator: {
      position: 'absolute',
      bottom: 0,
      width: width / 3,
      height: 4,
      backgroundColor: theme.colors.primary,
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
