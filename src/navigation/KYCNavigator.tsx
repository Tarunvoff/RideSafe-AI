import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import KYCIntroductionScreen from '../screens/kyc/KYCIntroductionScreen';
import KYCBasicIdentityScreen from '../screens/kyc/KYCBasicIdentityScreen';
import KYCPersonalDetailsScreen from '../screens/kyc/KYCPersonalDetailsScreen';
import KYCIdentityVerificationScreen from '../screens/kyc/KYCIdentityVerificationScreen';
import KYCPayoutSetupScreen from '../screens/kyc/KYCPayoutSetupScreen';
import KYCSubmittedScreen from '../screens/kyc/KYCSubmittedScreen';
import KYCProgressOverviewScreen from '../screens/kyc/KYCProgressOverviewScreen';

const Stack = createNativeStackNavigator();

export default function KYCNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="KYCIntroduction" component={KYCIntroductionScreen} />
      <Stack.Screen name="KYCBasicIdentity" component={KYCBasicIdentityScreen} />
      <Stack.Screen name="KYCPersonalDetails" component={KYCPersonalDetailsScreen} />
      <Stack.Screen name="KYCIdentityVerification" component={KYCIdentityVerificationScreen} />
      <Stack.Screen name="KYCPayoutSetup" component={KYCPayoutSetupScreen} />
      <Stack.Screen name="KYCSubmitted" component={KYCSubmittedScreen} />
      <Stack.Screen name="KYCProgressOverview" component={KYCProgressOverviewScreen} />
    </Stack.Navigator>
  );
}
