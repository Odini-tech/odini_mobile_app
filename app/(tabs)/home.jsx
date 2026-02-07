// screens/HomeScreen.js
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

const { width } = Dimensions.get('window');

const Home = () => {
  const [activeTab, setActiveTab] = useState(1); // Default to middle tab (Tab2/FYP)
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

    // Animate indicator
    Animated.spring(indicatorAnim, {
      toValue: (width / 3) * index,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  };

  const performItemAction = (listing) => {
    // TODO: replace with navigation to detail screen when available
    console.log('Perform action for listing:', listing);
  };

  const handleTabItemClick = (listing, tabIndex) => {
    // If clicked tab is already active, run immediately
    if (activeTab === tabIndex) {
      performItemAction(listing);
      return;
    }

    // Otherwise, set pending action and switch to tab
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

    // run pending action if it matches this tab
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
      {/* Top Navigation Bar */}
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

        {/* Animated Indicator */}
        <Animated.View
          style={[
            styles.indicator,
            {
              transform: [{ translateX: indicatorAnim }],
            },
          ]}
        />
      </View>

      {/* Swipeable Content Area */}
      <PagerView
        ref={pagerRef}
        style={styles.pagerView}
        initialPage={1}
        onPageSelected={onPageSelected}
        scrollEnabled={true}
      >
        {/* Tab 1: Explore (coming soon placeholder) */}
        <View key="1" style={styles.page}>
          <Explore onItemClick={(listing) => handleTabItemClick(listing, 0)} />
        </View>

        {/* Tab 2: FYP (Default) */}
        <View key="2" style={styles.page}>
          <ForYouPage onEventClick={(listing) => handleTabItemClick(listing, 1)} />
        </View>

        {/* Tab 3: DASH (coming soon placeholder) */}
        <View key="3" style={styles.page}>
          <Dash onItemClick={(listing) => handleTabItemClick(listing, 2)} />
        </View>
      </PagerView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f7f7ff',
  },
  topNav: {
    flexDirection: 'row',
    backgroundColor: '#ffffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingTop: 10,
    paddingBottom: 10,
    position: 'relative',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  tabIcon: {
    fontSize: 20,
    color: '#666',
    marginBottom: 4,
  },
  activeTabIcon: {
    color: '#fff',
  },
  tabLabel: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabLabel: {
    color: '#a4234cb8',
    fontWeight: 'bold',
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    width: width / 3,
    height: 3,
    backgroundColor: '#a4234cb8',
    borderRadius: 2,
  },
  pagerView: {
    flex: 1,
  },
  page: {
    flex: 1,
    backgroundColor: '#f8f7f7ff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  pageTitle: {
    color: '#1a1919b8',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  pageText: {
    color: '#363535ff',
    fontSize: 16,
    marginBottom: 30,
  },
  exploreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: (width - 60) / 2,
    height: 150,
    backgroundColor: '#111',
    borderRadius: 12,
    marginBottom: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  gridText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  videoMockup: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  videoText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  interactionBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  interaction: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  friendsList: {
    marginTop: 20,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FF0050',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  friendName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  status: {
    color: '#0f0',
    fontSize: 12,
  },
});

export default Home;