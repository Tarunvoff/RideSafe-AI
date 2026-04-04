import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Theme } from '../theme';

import DriverRiskPipelineScreen from '../screens/main/DriverRiskPipelineScreen';
import ClaimsScreen from '../screens/main/ClaimsScreen';
import DriverLiveRiskScreen from '../screens/main/DriverLiveRiskScreen';
import DriverActivityScreen from '../screens/main/DriverActivityScreen';
import DriverPlansScreen from '../screens/main/DriverPlansScreen';
import DriverProfileScreen from '../screens/main/DriverProfileScreen';

const Tab = createBottomTabNavigator();

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
        component={DriverLiveRiskScreen} 
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
