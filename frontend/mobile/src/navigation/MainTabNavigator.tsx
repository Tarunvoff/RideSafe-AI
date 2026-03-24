import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Theme } from '../theme';

import DriverRiskPipelineScreen from '../screens/main/DriverRiskPipelineScreen';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;
          if (route.name === 'Home') { iconName = 'home-outline'; }
          else { iconName = 'ellipse-outline'; }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: Theme.colors.primary,
        tabBarInactiveTintColor: Theme.colors.textSecondary,
        tabBarStyle: { display: 'none' },
        headerShown: false,
        headerTitleAlign: 'center',
      })}
    >
      <Tab.Screen name="Home" component={DriverRiskPipelineScreen} />
    </Tab.Navigator>
  );
}
