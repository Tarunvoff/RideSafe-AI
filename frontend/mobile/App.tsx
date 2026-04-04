import React from 'react';
import './src/i18n';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text } from 'react-native';
import { Theme } from './src/theme';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { LocationProvider } from './src/context/LocationContext';

// Force Admin + Driver to use the same font family system-wide.
// This aligns typography with the driver UI (Theme.typography.fontFamily).
// Note: we only set fontFamily (no new fonts are introduced).
const DRIVER_FONT_FAMILY = Theme.typography.fontFamily;
const existingDefaultProps: any = (Text as any).defaultProps ?? {};
const existingDefaultStyle: any = existingDefaultProps.style;
const extraFontStyle = { fontFamily: DRIVER_FONT_FAMILY };
(Text as any).defaultProps = {
  ...existingDefaultProps,
  style: Array.isArray(existingDefaultStyle)
    ? [extraFontStyle, ...existingDefaultStyle]
    : existingDefaultStyle
      ? [extraFontStyle, existingDefaultStyle]
      : extraFontStyle,
};

export default function App() {
  return (
    <SafeAreaProvider>
      <LocationProvider>
        <AuthProvider>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </AuthProvider>
      </LocationProvider>
    </SafeAreaProvider>
  );
}

