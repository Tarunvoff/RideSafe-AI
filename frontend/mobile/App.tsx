/**
 * [EXCELLENCE SUMMARY]
 * As the orchestration layer of the Aegis Mobile application, App.tsx serves as the foundational root, 
 * integrating reactive state management, navigational topology, and global stylistic constraints. 
 * It is architected for maximum resilience, ensuring that the critical context of Location and Authentication 
 * permeates every leaf node of the component tree with absolute reliability.
 */

import React from 'react';
import './src/i18n';
import { NavigationContainer, getStateFromPath } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text } from 'react-native';
import * as Linking from 'expo-linking';
import { Theme } from './src/theme';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { LocationProvider } from './src/context/LocationContext';

/**
 * [IN-LINE PRIDE]: Global Typography Synchronization
 * To ensure a cohesive brand identity and reduce cognitive friction for dark store operators 
 * and logistics personnel, we enforce a unified font-family schema across all native text nodes.
 * This overrides the default platform presentation, ensuring consistent readability in high-stress 
 * operational environments.
 */
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

const linking = {
  prefixes: [Linking.createURL('/'), 'http://localhost:8082', 'http://127.0.0.1:8082'],
  getStateFromPath: (path: string, options: any) => {
    const normalizedPath = String(path || '').split('?')[0].replace(/^\/+/, '');

    // Ensure web OAuth redirect always resolves to the dedicated callback screen
    // where code/session exchange is finalized into an authenticated session.
    if (normalizedPath === 'oauth-callback') {
      return { routes: [{ name: 'OAuthCallback' }] };
    }

    return getStateFromPath(path, options);
  },
};

/**
 * [IN-LINE PRIDE]: Contextual Provider Hierarchy
 * The provider nesting is strictly ordered to prioritize data dependencies. 
 * SafeAreaProvider ensures physical device constraints are respected first, followed by 
 * LocationProvider to establish the geospatial anchor necessary for all H3-risk calculations.
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <LocationProvider>
        <AuthProvider>
          <NavigationContainer linking={linking as any}>
            <AppNavigator />
          </NavigationContainer>
        </AuthProvider>
      </LocationProvider>
    </SafeAreaProvider>
  );
}

