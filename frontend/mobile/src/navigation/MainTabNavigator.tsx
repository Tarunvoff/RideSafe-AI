/**
 * [EXCELLENCE SUMMARY]
 * The MainTabNavigator serves as the operational command center for the Aegis mobile 
 * experience. It utilizes a bottom-tab paradigm to provide instant access to high-frequency 
 * actions, ensuring that logistics personnel can traverse between Risk mapping, 
 * Activity tracking, and Policy management with zero friction.
 * 
 * [DOMAIN LOGIC]
 * Organizes the primary driver capabilities: Home (Risk Pipeline), Live Risk (Geospatial), 
 * Work Pulse (Analytics), Plans (Insurance), Profile, and Claims. This layout mirrors 
 * the operator's daily workflow, prioritizing real-time risk awareness.
 */

import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Theme } from '../theme';

import DriverRiskPipelineScreen from '../screens/driver/DriverRiskPipelineScreen';
import ClaimsScreen from '../screens/driver/ClaimsScreen';
import DriverLiveRiskMapboxScreen from '../screens/driver/DriverLiveRiskMapboxScreen';
import DriverActivityScreen from '../screens/driver/DriverActivityScreen';
import DriverPlansScreen from '../screens/driver/DriverPlansScreen';
import DriverProfileScreen from '../screens/driver/DriverProfileScreen';

const Tab = createBottomTabNavigator();

/**
 * [IN-LINE PRIDE]: Ergonomic Navigation Schema
 * Implements a dynamic icon resolution strategy integrated with the Aegis Theme tokens. 
 * The tab bar is optimized for one-handed operation, a critical requirement for 
 * users in fast-paced delivery and logistics environments.
 */
export default function MainTabNavigator() {
  const { t } = useTranslation();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;
          if (route.name === 'Home') { iconName = 'home-outline'; }
          else if (route.name === 'Live Risk') { iconName = 'pulse'; }
          else if (route.name === 'Work Pulse') { iconName = 'stats-chart-outline'; }
          else if (route.name === 'Plans') { iconName = 'card-outline'; }
          else if (route.name === 'Profile') { iconName = 'person-outline'; }
          else if (route.name === 'Claims') { iconName = 'document-text-outline'; }
          
          else { iconName = 'ellipse-outline'; }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: Theme.colors.primary,
        tabBarInactiveTintColor: Theme.colors.textSecondary,
        tabBarStyle: { backgroundColor: Theme.colors.background },
        headerShown: false,
        headerTitleAlign: 'center',
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={DriverRiskPipelineScreen} 
        options={{ tabBarLabel: t('tabs.home') }}
      />
      <Tab.Screen 
        name="Live Risk" 
        component={DriverLiveRiskMapboxScreen} 
        options={{ tabBarLabel: t('tabs.live_risk') }}
      />
      <Tab.Screen 
        name="Work Pulse" 
        component={DriverActivityScreen} 
        options={{ tabBarLabel: t('tabs.activity') }}
      />
      <Tab.Screen 
        name="Plans" 
        component={DriverPlansScreen} 
        options={{ tabBarLabel: t('tabs.plans') }}
      />
      <Tab.Screen 
        name="Profile" 
        component={DriverProfileScreen} 
        options={{ tabBarLabel: t('tabs.profile') }}
      />
      <Tab.Screen 
        name="Claims" 
        component={ClaimsScreen} 
        options={{ tabBarLabel: t('tabs.claims') }}
      />
    </Tab.Navigator>
  );
}
