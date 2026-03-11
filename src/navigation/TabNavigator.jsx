import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, BarChart2, Bell, FileText, User } from 'lucide-react-native';
import HomeScreen from '../screens/HomeScreen';
import RiskAnalysisScreen from '../screens/RiskAnalysisScreen';
import DisruptionAlertsScreen from '../screens/DisruptionAlertsScreen';
import ClaimsScreen from '../screens/ClaimsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { COLORS, SHADOWS } from '../constants/colors';

const Tab = createBottomTabNavigator();

const TABS = [
  { name: 'Home', label: 'Home', icon: Home, screen: HomeScreen },
  { name: 'Risk', label: 'Risk', icon: BarChart2, screen: RiskAnalysisScreen },
  { name: 'Alerts', label: 'Alerts', icon: Bell, screen: DisruptionAlertsScreen },
  { name: 'Claims', label: 'Claims', icon: FileText, screen: ClaimsScreen },
  { name: 'Profile', label: 'Profile', icon: User, screen: ProfileScreen },
];

function CustomTabBar({ state, descriptors, navigation }) {
  return (
    <View style={styles.tabBar}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const tab = TABS.find((t) => t.name === route.name);
        const Icon = tab?.icon || Home;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        return (
          <TouchableOpacity key={route.key} onPress={onPress} activeOpacity={0.7} style={styles.tabItem}>
            <View style={[styles.tabIconWrap, isFocused && styles.tabIconWrapActive]}>
              <Icon size={20} color={isFocused ? COLORS.navy : COLORS.textMuted} strokeWidth={isFocused ? 2.5 : 2} />
            </View>
            <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>{tab?.label}</Text>
            {isFocused && <View style={styles.tabActiveDot} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      {TABS.map((tab) => (
        <Tab.Screen key={tab.name} name={tab.name} component={tab.screen} />
      ))}
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 10,
  },
  tabItem: { flex: 1, alignItems: 'center', position: 'relative', paddingBottom: 2 },
  tabIconWrap: { width: 40, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tabIconWrapActive: { backgroundColor: '#EFF6FF' },
  tabLabel: { fontSize: 10, color: '#94A3B8', marginTop: 2, fontWeight: '500' },
  tabLabelActive: { color: '#1E3A8A', fontWeight: '700' },
  tabActiveDot: { position: 'absolute', top: -2, width: 4, height: 4, borderRadius: 2, backgroundColor: '#1E3A8A' },
});
