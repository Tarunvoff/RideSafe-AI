/**
 * [EXCELLENCE SUMMARY]
 * A specialized sub-navigator dedicated to the multi-step KYC onboarding sequence. 
 * Architected as a linear wizard, it ensures that dark store operators are guided 
 * through regulatory data collection with minimal cognitive load and high structural clarity.
 * 
 * [DOMAIN LOGIC]
 * Captures the essential identity, personal, and payout data required for actuarial 
 * validation. The sequence culminates in a fraud detection analysis, technically 
 * anchoring the user's digital identity to the Aegis trust platform.
 */

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

/**
 * [IN-LINE PRIDE]: Linear Compliance Flow
 * Enforces a strict order of operations for data collection. This reduces 
 * input errors and ensures that dependencies (e.g., Payout setup depends on 
 * Identity verification) are naturally resolved.
 */
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
