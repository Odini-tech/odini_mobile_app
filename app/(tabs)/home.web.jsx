import React, { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Dash from '../../src/components/homeTabs/dash';
import Explore from '../../src/components/homeTabs/explore';
import { ForYouPage } from '../../src/components/homeTabs/myFeed';
import burgundyTheme from '../../src/theme/burgundyTheme';

const { width } = Dimensions.get('window');

const TABS = [
  { id: 0, label: 'Explore' },
  { id: 1, label: 'FYP' },
  { id: 2, label: 'DASH' },
];

const Home = () => {
  const [activeTab, setActiveTab] = useState(1);
  const indicatorAnim = useRef(new Animated.Value(width / 3)).current;

  const handleTabPress = (index) => {
    setActiveTab(index);

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

  const renderActivePage = () => {
    if (activeTab === 0) {
      return <Explore onItemClick={performItemAction} />;
    }

    if (activeTab === 1) {
      return <ForYouPage onEventClick={performItemAction} />;
    }

    return <Dash onItemClick={performItemAction} />;
  };

  return (
    <View style={styles.container}>
      <View style={styles.topNav}>
        {TABS.map((tab, index) => (
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

        <Animated.View
          style={[
            styles.indicator,
            {
              transform: [{ translateX: indicatorAnim }],
            },
          ]}
        />
      </View>

      <View style={styles.page}>{renderActivePage()}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: burgundyTheme.colors.background,
  },
  topNav: {
    flexDirection: 'row',
    backgroundColor: burgundyTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: burgundyTheme.colors.border,
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
  tabLabel: {
    color: burgundyTheme.colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabLabel: {
    color: burgundyTheme.colors.primary,
    fontWeight: 'bold',
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    width: width / 3,
    height: 4,
    backgroundColor: burgundyTheme.colors.primary,
    borderRadius: 999,
  },
  page: {
    flex: 1,
    backgroundColor: burgundyTheme.colors.background,
  },
});

export default Home;
