import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import KYCBasicIdentityScreen from '../screens/kyc/KYCBasicIdentityScreen';
import KYCFraudDetectionScreen from '../screens/kyc/KYCFraudDetectionScreen';
import KYCIdentityVerificationScreen from '../screens/kyc/KYCIdentityVerificationScreen';
import KYCIntroductionScreen from '../screens/kyc/KYCIntroductionScreen';
import KYCPayoutSetupScreen from '../screens/kyc/KYCPayoutSetupScreen';
import KYCPersonalDetailsScreen from '../screens/kyc/KYCPersonalDetailsScreen';
import KYCProgressOverviewScreen from '../screens/kyc/KYCProgressOverviewScreen';
import KYCSubmittedScreen from '../screens/kyc/KYCSubmittedScreen';

const Stack = createNativeStackNavigator();

export default function KYCNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="KYCIntroduction" component={KYCIntroductionScreen} />
      <Stack.Screen name="KYCBasicIdentity" component={KYCBasicIdentityScreen} />
      <Stack.Screen name="KYCPersonalDetails" component={KYCPersonalDetailsScreen} />
      <Stack.Screen name="KYCIdentityVerification" component={KYCIdentityVerificationScreen} />
      <Stack.Screen name="KYCPayoutSetup" component={KYCPayoutSetupScreen} />
      <Stack.Screen name="KYCFraudDetection" component={KYCFraudDetectionScreen} />
      <Stack.Screen name="KYCSubmitted" component={KYCSubmittedScreen} />
      <Stack.Screen name="KYCProgressOverview" component={KYCProgressOverviewScreen} />
    </Stack.Navigator>
  );
}
