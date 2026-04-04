import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Theme } from '../theme';

import DriverRiskPipelineScreen from '../screens/main/DriverRiskPipelineScreen';
import ClaimsScreen from '../screens/main/ClaimsScreen';
import DriverLiveRiskScreen from '../screens/main/DriverLiveRiskScreen';
import DriverActivityScreen from '../screens/main/DriverActivityScreen';
import DriverPlansScreen from '../screens/main/DriverPlansScreen';
import DriverProfileScreen from '../screens/main/DriverProfileScreen';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
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
      <Tab.Screen name="Home" component={DriverRiskPipelineScreen} />
      <Tab.Screen name="Live Risk" component={DriverLiveRiskScreen} />
      <Tab.Screen name="Work Pulse" component={DriverActivityScreen} />
      <Tab.Screen name="Plans" component={DriverPlansScreen} />
      <Tab.Screen name="Profile" component={DriverProfileScreen} />
      <Tab.Screen name="Claims" component={ClaimsScreen} />
    </Tab.Navigator>
  );
}
