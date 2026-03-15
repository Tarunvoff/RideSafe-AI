import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Theme } from '../theme';

import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminLoginScreen from '../screens/admin/AdminLoginScreen';
import AdminOTPScreen from '../screens/admin/AdminOTPScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import KYCNavigator from './KYCNavigator';
import MainTabNavigator from './MainTabNavigator';

import { useAuth } from '../context/AuthContext';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, isLoading, isAuthenticated, kycStatus } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Theme.colors.background }}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
      </View>
    );
  }

  // NOT LOGGED IN - Show Auth Flow
  if (!isAuthenticated) {
    return (
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName="Login"
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen
          name="AdminLogin"
          component={AdminLoginScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="AdminOTP"
          component={AdminOTPScreen}
          options={{ presentation: 'modal' }}
        />
      </Stack.Navigator>
    );
  }

  // LOGGED IN ADMIN - Show Admin Dashboard
  if (user?.role === 'ADMIN') {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      </Stack.Navigator>
    );
  }

  // LOGGED IN DRIVER - Check KYC Status
  if (user?.role === 'DRIVER') {
    // KYC NOT COMPLETED - Show KYC Flow  
    if (kycStatus && ['NOT_STARTED', 'IN_PROGRESS'].includes(kycStatus)) {
      return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen
            name="KYC"
            component={KYCNavigator}
            options={{ presentation: 'modal' }}
          />
        </Stack.Navigator>
      );
    }

    // KYC COMPLETED - Show Dashboard
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={MainTabNavigator} />
        <Stack.Screen
          name="KYC"
          component={KYCNavigator}
          options={{ presentation: 'modal' }}
        />
      </Stack.Navigator>
    );
  }

  // Fallback - Show Login
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}
