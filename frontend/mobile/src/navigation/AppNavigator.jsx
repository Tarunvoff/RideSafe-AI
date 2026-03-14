import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';

import SplashScreen from '../screens/SplashScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import InsurancePlanScreen from '../screens/InsurancePlanScreen';
import TabNavigator from './TabNavigator';
import AdminNavigator from './AdminNavigator';
import KYCScreen from '../screens/KYCScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#0F0C29' },
          gestureEnabled: false,
          cardStyleInterpolator: CardStyleInterpolators.forFadeFromCenter,
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="KYC" component={KYCScreen} />
        <Stack.Screen name="Main" component={TabNavigator} />
        <Stack.Screen name="Plans" component={InsurancePlanScreen} />
        {/* Admin Portal — accessed from Profile screen */}
        <Stack.Screen
          name="AdminPortal"
          component={AdminNavigator}
          options={{ cardStyleInterpolator: CardStyleInterpolators.forVerticalIOS }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
