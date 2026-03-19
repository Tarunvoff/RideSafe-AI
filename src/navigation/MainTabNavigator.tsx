import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Theme } from '../theme';

import ClaimsScreen from '../screens/main/ClaimsScreen';
import HomeScreen from '../screens/main/HomeScreen';
import PolicyScreen from '../screens/main/PolicyScreen';
import RiskScreen from '../screens/main/RiskScreen';
import WalletScreen from '../screens/main/WalletScreen';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;
          if (route.name === 'Dashboard') { iconName = 'home-outline'; }
          else if (route.name === 'Risk') { iconName = 'scan-outline'; }
          else if (route.name === 'Policy') { iconName = 'document-text-outline'; }
          else if (route.name === 'Claims') { iconName = 'shield-checkmark-outline'; }
          else if (route.name === 'Wallet') { iconName = 'wallet-outline'; }
          else { iconName = 'ellipse-outline'; }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: Theme.colors.primary,
        tabBarInactiveTintColor: Theme.colors.textSecondary,
        headerShown: false,
        headerTitleAlign: 'center',
      })}
    >
      <Tab.Screen name="Dashboard" component={HomeScreen} />
      <Tab.Screen name="Risk" component={RiskScreen} />
      <Tab.Screen name="Policy" component={PolicyScreen} />
      <Tab.Screen name="Claims" component={ClaimsScreen} />
      <Tab.Screen name="Wallet" component={WalletScreen} />
    </Tab.Navigator>
  );
}
