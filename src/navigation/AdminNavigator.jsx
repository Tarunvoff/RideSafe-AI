import React from 'react';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';

import AdminLoginScreen from '../screens/admin/AdminLoginScreen';
import AdminTabNavigator from './AdminTabNavigator';
import AdminWorkerDetailScreen from '../screens/admin/AdminWorkerDetailScreen';
import AdminFraudScreen from '../screens/admin/AdminFraudScreen';
import AdminPoliciesScreen from '../screens/admin/AdminPoliciesScreen';
import AdminPayoutsScreen from '../screens/admin/AdminPayoutsScreen';
import AdminGpsProofScreen from '../screens/admin/AdminGpsProofScreen';

const Stack = createStackNavigator();

export default function AdminNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#F8FAFC' },
        cardStyleInterpolator: CardStyleInterpolators.forFadeFromCenter,
      }}
    >
      <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
      <Stack.Screen name="AdminMain" component={AdminTabNavigator} />
      <Stack.Screen
        name="AdminWorkerDetail"
        component={AdminWorkerDetailScreen}
        options={{ cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS }}
      />
      <Stack.Screen
        name="AdminFraud"
        component={AdminFraudScreen}
        options={{ cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS }}
      />
      <Stack.Screen
        name="AdminPolicies"
        component={AdminPoliciesScreen}
        options={{ cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS }}
      />
      <Stack.Screen
        name="AdminPayouts"
        component={AdminPayoutsScreen}
        options={{ cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS }}
      />
      <Stack.Screen
        name="AdminGpsProof"
        component={AdminGpsProofScreen}
        options={{ cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS }}
      />
    </Stack.Navigator>
  );
}
