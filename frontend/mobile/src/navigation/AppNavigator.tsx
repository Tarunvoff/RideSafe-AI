import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Theme } from '../theme';

import { useAuth } from '../context/AuthContext';
import AdminClaimsScreen from '../screens/admin/AdminClaimsScreen';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminFraudDetailScreen from '../screens/admin/AdminFraudDetailScreen';
import AdminFraudReportScreen from '../screens/admin/AdminFraudReportScreen';
import AdminFraudReviewScreen from '../screens/admin/AdminFraudReviewScreen';
import AdminLoginScreen from '../screens/admin/AdminLoginScreen';
import AdminOTPScreen from '../screens/admin/AdminOTPScreen';
import AdminSetupScreen from '../screens/admin/AdminSetupScreen';
import AdminWorkersScreen from '../screens/admin/AdminWorkersScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import DriverActivityScreen from '../screens/main/DriverActivityScreen';
import DriverLiveRiskMapboxScreen from '../screens/main/DriverLiveRiskMapboxScreen';
import DriverPlansScreen from '../screens/main/DriverPlansScreen';
import DriverProfileScreen from '../screens/main/DriverProfileScreen';
import KYCNavigator from './KYCNavigator';
import MainTabNavigator from './MainTabNavigator';


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

  if (user?.role === 'ADMIN') {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
        <Stack.Screen name="AdminWorkers" component={AdminWorkersScreen} />
        <Stack.Screen name="AdminClaims" component={AdminClaimsScreen} />
        <Stack.Screen name="AdminSetup" component={AdminSetupScreen} />
        <Stack.Screen name="AdminFraudReview" component={AdminFraudReviewScreen} />
        <Stack.Screen name="AdminFraudDetail" component={AdminFraudDetailScreen} />
        <Stack.Screen name="AdminFraudReport" component={AdminFraudReportScreen} />
      </Stack.Navigator>
    );
  }

  // LOGGED IN DRIVER - Check KYC Status
  if (user?.role === 'DRIVER') {
    const { isNewRegistration } = useAuth();
    
    // KYC NOT COMPLETED - Show KYC Flow (ONLY for first time people registering!)
    if (isNewRegistration && kycStatus && ['NOT_STARTED', 'IN_PROGRESS'].includes(kycStatus)) {
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
        <Stack.Screen name="DriverApp" component={MainTabNavigator} />
        <Stack.Screen name="DriverLiveRisk" component={DriverLiveRiskMapboxScreen} />
        <Stack.Screen name="DriverActivity" component={DriverActivityScreen} />
        <Stack.Screen
          name="DriverPlans"
          component={DriverPlansScreen}
        />
        <Stack.Screen
          name="DriverProfile"
          component={DriverProfileScreen}
        />
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
