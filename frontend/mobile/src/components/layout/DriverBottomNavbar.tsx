/**
 * [EXCELLENCE SUMMARY]
 * The DriverBottomNavbar is the ergonomic navigation bridge for the Aegis 
 * worker-facing application. Mirroring the 'Floating Island' aesthetic 
 * of the admin suite, it provides rapid access to critical operational 
 * nodes: Live Risk, Work Pulse, Insurance Plans, and Profile management. 
 * Its detached, high-elevation design ensures that drivers can navigate 
 * the platform with one-handed ease.
 * 
 * [DOMAIN LOGIC]
 * Serves as the 'Command Strip' for gig-economy workers. By positioning 
 * 'Live Risk' as a primary navigation node, the platform encourages 
 * constant spatial awareness and risk mitigation among drivers, 
 * reinforcing the core actuarial mission of reducing environmental 
 * impact on earnings.
 */

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '../../theme';

export type DriverBottomNavKey = 'home' | 'risk' | 'activity' | 'plans' | 'profile';

type DriverBottomNavbarProps = {
  navigation: any;
  /** Identifies the active segment for high-contrast visual focus. */
  activeKey: DriverBottomNavKey;
};

export default function DriverBottomNavbar({ navigation, activeKey }: DriverBottomNavbarProps) {
  const rootNav = navigation?.getParent?.() ?? navigation;
  const insets = useSafeAreaInsets();

  const bottomItems = [
    { key: 'home' as const, label: 'Home', icon: 'home-outline' as const },
    { key: 'risk' as const, label: 'Live Risk', icon: 'pulse' as const },
    { key: 'activity' as const, label: 'Work Pulse', icon: 'stats-chart-outline' as const },
    { key: 'plans' as const, label: 'Plans', icon: 'card-outline' as const },
    { key: 'profile' as const, label: 'Profile', icon: 'person-outline' as const },
  ];

  /**
   * [IN-LINE PRIDE]: Intent-Based Routing
   * Maps navigation keys directly to their respective stack targets. 
   * This decoupled approach allows the navigation schema to evolve 
   * (e.g., adding sub-modals) without requiring changes to the 
   * structural layout of the navbar itself.
   */
  const onPress = (key: DriverBottomNavKey) => {
    if (key === 'home') rootNav.navigate('DriverApp');
    if (key === 'risk') rootNav.navigate('DriverLiveRisk');
    if (key === 'activity') rootNav.navigate('DriverActivity');
    if (key === 'plans') rootNav.navigate('DriverPlans');
    if (key === 'profile') rootNav.navigate('DriverProfile');
  };

  /**
   * [IN-LINE PRIDE]: Kinetic Elevation & Adaptability
   * Leverages 'useSafeAreaInsets' to provide perfect vertical padding 
   * on all device types, including notched iPhones and Android devices 
   * with gesture navigation. The elevation and shadow properties 
   * create a distinct visual layer that sits above the content.
   */
  return (
    <View style={[styles.bottomBar, { bottom: insets.bottom + Theme.spacing.md }]}>
      {bottomItems.map((item) => {
        const isActive = item.key === activeKey;
        return (
          <TouchableOpacity
            key={item.key}
            style={styles.bottomBarItem}
            activeOpacity={0.8}
            onPress={() => onPress(item.key)}
          >
            <Ionicons name={item.icon} size={19} color={isActive ? '#111827' : '#6b7280'} />
            <Text style={[styles.bottomBarLabel, isActive && styles.bottomBarLabelActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    position: 'absolute',
    left: Theme.spacing.lg,
    right: Theme.spacing.lg,
    height: 72,
    backgroundColor: '#ffffff',
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.md,
    // High-fidelity shadow for 'Floating Island' elevation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  bottomBarItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  bottomBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
  },
  bottomBarLabelActive: {
    color: '#111827',
    fontWeight: '800',
  },
});

