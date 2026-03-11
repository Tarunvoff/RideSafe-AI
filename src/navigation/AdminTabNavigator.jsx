import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  LayoutDashboard, Users, FileText, Activity, BarChart2,
} from 'lucide-react-native';

import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminWorkersScreen from '../screens/admin/AdminWorkersScreen';
import AdminClaimsScreen from '../screens/admin/AdminClaimsScreen';
import AdminDisruptionsScreen from '../screens/admin/AdminDisruptionsScreen';
import AdminAnalyticsScreen from '../screens/admin/AdminAnalyticsScreen';

const Tab = createBottomTabNavigator();

const ADMIN_TABS = [
  { name: 'AdminDashboard', label: 'Dashboard', icon: LayoutDashboard, screen: AdminDashboardScreen },
  { name: 'AdminWorkers',   label: 'Workers',   icon: Users,            screen: AdminWorkersScreen },
  { name: 'AdminClaims',    label: 'Claims',    icon: FileText,         screen: AdminClaimsScreen },
  { name: 'AdminDisruptions',label: 'Alerts',   icon: Activity,         screen: AdminDisruptionsScreen },
  { name: 'AdminAnalytics', label: 'Analytics', icon: BarChart2,        screen: AdminAnalyticsScreen },
];

function AdminCustomTabBar({ state, descriptors, navigation }) {
  return (
    <View style={styles.tabBar}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const tab = ADMIN_TABS.find(t => t.name === route.name);
        const Icon = tab?.icon || LayoutDashboard;

        return (
          <TouchableOpacity
            key={route.key}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
            }}
            activeOpacity={0.7}
            style={styles.tabItem}
          >
            <View style={[styles.tabIconWrap, isFocused && styles.tabIconWrapActive]}>
              <Icon
                size={20}
                color={isFocused ? '#2563EB' : '#94A3B8'}
                strokeWidth={isFocused ? 2.5 : 2}
              />
            </View>
            <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
              {tab?.label}
            </Text>
            {isFocused && <View style={styles.activeDot} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function AdminTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={props => <AdminCustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      {ADMIN_TABS.map(tab => (
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
  tabIconWrap: {
    width: 40, height: 34, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  tabIconWrapActive: { backgroundColor: '#EFF6FF' },
  tabLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '500', marginTop: 2 },
  tabLabelActive: { color: '#2563EB', fontWeight: '700' },
  activeDot: {
    position: 'absolute', bottom: 0,
    width: 4, height: 4, borderRadius: 2, backgroundColor: '#2563EB',
  },
});
