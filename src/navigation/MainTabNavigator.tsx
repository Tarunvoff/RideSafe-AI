import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../theme';

import HomeScreen from '../screens/main/HomeScreen';
import PolicyScreen from '../screens/main/PolicyScreen';
import RiskScreen from '../screens/main/RiskScreen';
import ClaimsScreen from '../screens/main/ClaimsScreen';
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
        headerShown: true,
        headerTitleAlign: 'center',
      })}
    >
      <Tab.Screen name="Dashboard" component={HomeScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Risk" component={RiskScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Policy" component={PolicyScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Claims" component={ClaimsScreen} />
      <Tab.Screen name="Wallet" component={WalletScreen} />
    </Tab.Navigator>
  );
}
